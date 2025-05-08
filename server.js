// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
let Pool;
try {
  const pg = require('pg');
  Pool = pg.Pool;
} catch (error) {
  console.warn('PostgreSQL module not found. Running in fallback mode.');
  Pool = class MockPool {
    constructor() {
      console.log('Using mock database pool');
    }
    
    query() {
      return Promise.reject(new Error('Database connection unavailable'));
    }
    
    on() {
      return this;
    }
  };
}
const fs = require('fs').promises;

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Legacy bookingsStorage for backwards compatibility
const bookingsStorage = {
  getAllBookings: async function() {
    try {
      const result = await pool.query('SELECT booking_data FROM bookings ORDER BY date_submitted DESC');
      return result.rows.map(row => row.booking_data);
    } catch (error) {
      console.error('Error getting bookings from database:', error);
      
      // Fall back to localStorage format in case of database error
      try {
        const localBookingsPath = path.join(__dirname, 'local_bookings.json');
        const exists = await fs.access(localBookingsPath).then(() => true).catch(() => false);
        
        if (exists) {
          const data = await fs.readFile(localBookingsPath, 'utf8');
          return JSON.parse(data);
        }
      } catch (fsError) {
        console.error('Error reading local bookings file:', fsError);
      }
      
      return [];
    }
  },
  
  addBooking: async function(booking) {
    try {
      // Check if booking already exists
      const checkResult = await pool.query(
        'SELECT id FROM bookings WHERE booking_reference = $1',
        [booking.bookingReference || booking.booking_reference]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`Booking ${booking.bookingReference} already exists`);
        return booking;
      }
      
      // Extract customer info
      const customer = booking.customer || {};
      
      // Extract car info
      const car = booking.selectedCar || booking.car || {};
      
      // Generate booking reference if not provided
      if (!booking.bookingReference && !booking.booking_reference) {
        booking.bookingReference = 'BK' + Date.now().toString().substr(-8);
      }
      
      // Insert new booking
      const result = await pool.query(
        `INSERT INTO bookings (
          booking_reference, customer_first_name, customer_last_name, 
          customer_email, customer_phone, pickup_date, return_date,
          pickup_location, dropoff_location, car_make, car_model,
          status, total_price, payment_date, date_submitted, booking_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          booking.bookingReference || booking.booking_reference,
          customer.firstName || '',
          customer.lastName || '',
          customer.email || '',
          customer.phone || '',
          booking.pickupDate ? new Date(booking.pickupDate) : null,
          booking.returnDate || booking.dropoff_date ? new Date(booking.returnDate || booking.dropoff_date) : null,
          booking.pickupLocation || booking.pickup_location || '',
          booking.dropoffLocation || booking.dropoff_location || booking.pickupLocation || booking.pickup_location || '',
          car.make || '',
          car.model || '',
          booking.status || 'pending',
          booking.totalPrice || 0,
          booking.paymentDate ? new Date(booking.paymentDate) : null,
          booking.dateSubmitted || booking.timestamp ? new Date(booking.dateSubmitted || booking.timestamp) : new Date(),
          booking // Store the complete booking object as JSONB
        ]
      );
      
      return result.rows[0].booking_data;
    } catch (error) {
      console.error('Error adding booking to database:', error);
      return booking;
    }
  }
};

// === Configuration ===
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// === PostgreSQL connection ===
let pool;
try {
  // Check if we have a valid DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.warn('No DATABASE_URL provided in environment variables. Using mock database.');
    throw new Error('No DATABASE_URL provided');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Add error handler to prevent crashes
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    // Don't crash the application on connection errors
  });

  // Test the database connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error connecting to the database:', err);
    } else {
      console.log('Successfully connected to PostgreSQL database at:', res.rows[0].now);
    }
  });
} catch (error) {
  console.error('Failed to initialize database pool:', error);
  
  // Create a mock pool that won't crash the application
  pool = {
    query: () => Promise.reject(new Error('Database connection unavailable: ' + error.message)),
    on: () => this
  };
}

// === API Routes ===
// NOTE: Checkout routes disabled until Stripe is properly configured
// const checkoutRoutes = require('./api/checkout');
// const webhookRoutes = require('./api/webhooks');
// app.use('/api/checkout', checkoutRoutes);
// app.use('/api/webhooks', webhookRoutes);

// === API: Cars ===
app.get('/api/cars', async (req, res) => {
    try {
        const carsFilePath = path.join(__dirname, 'cars.json');
        const data = await fs.readFile(carsFilePath, 'utf8');
        const cars = JSON.parse(data);
        res.status(200).json(cars);
    } catch (error) {
        console.error('Error reading cars data:', error);
        res.status(500).json({ success: false, message: 'Failed to load car data.' });
    }
});

// === API: Car Availability ===
app.get('/api/cars/availability', async (req, res) => {
    const { carId, pickupDate, dropoffDate } = req.query;

    if (!carId || !pickupDate || !dropoffDate) {
        return res.status(400).json({ success: false, message: 'Missing required parameters (carId, pickupDate, dropoffDate).' });
    }

    console.log(`Availability check for car: ${carId} from ${pickupDate} to ${dropoffDate}`);

    // Placeholder: In production, we would check database for overlapping bookings
    const isAvailable = true; 

    if (isAvailable) {
        res.status(200).json({ success: true, available: true });
    } else {
        res.status(200).json({ success: true, available: false, message: 'Selected car is not available for the chosen dates.' }); 
    }
});

// === API: Book Car ===
app.post('/api/book', async (req, res) => {
    console.log('Booking request received:', req.body);
    const bookingData = req.body;

    // Validation
    const requiredFields = ['pickup-location', 'dropoff-location', 'pickup-date', 'pickup-time', 'dropoff-date', 'dropoff-time', 'car-selection', 'customer-name', 'customer-email', 'customer-phone', 'age'];
    for (const field of requiredFields) {
        if (!bookingData[field]) {
            console.error(`Validation Error: Missing field ${field}`);
            return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
        }
    }
    if (parseInt(bookingData.age) < 25) {
         console.error(`Validation Error: Age ${bookingData.age} is less than 25`);
         return res.status(400).json({ success: false, message: 'Minimum age requirement is 25.' });
    }
    // Date validation
    if (new Date(bookingData['dropoff-date']) < new Date(bookingData['pickup-date'])) {
        console.error(`Validation Error: Drop-off date ${bookingData['dropoff-date']} is before pickup date ${bookingData['pickup-date']}`);
        return res.status(400).json({ success: false, message: 'Drop-off date cannot be earlier than pickup date.' });
    }
    console.log('Validation passed.');

    try {
        // Get car details
        let carName = 'Unknown Car';
        try {
            const carsFilePath = path.join(__dirname, 'cars.json');
            const carsData = await fs.readFile(carsFilePath, 'utf8');
            const cars = JSON.parse(carsData);
            const selectedCar = cars.find(car => car.id === bookingData['car-selection']);
            if (selectedCar) {
                carName = selectedCar.name;
            }
        } catch (carErr) {
            console.error('Error reading car details:', carErr);
        }

        // Create booking object
        const booking = {
            bookingReference: 'BK' + Date.now().toString().substring(6),
            car_id: bookingData['car-selection'],
            car_name: carName,
            pickup_location: bookingData['pickup-location'],
            dropoff_location: bookingData['dropoff-location'],
            pickup_date: new Date(bookingData['pickup-date']).toISOString(),
            pickup_time: bookingData['pickup-time'],
            dropoff_date: new Date(bookingData['dropoff-date']).toISOString(),
            dropoff_time: bookingData['dropoff-time'],
            customer_name: bookingData['customer-name'],
            customer_email: bookingData['customer-email'],
            customer_phone: bookingData['customer-phone'],
            customer_age: parseInt(bookingData.age),
            status: 'pending',
            additional_requests: bookingData['additional-requests'] || '',
            created_at: new Date().toISOString()
        };

        // Save booking to database
        const savedBooking = await bookingsStorage.addBooking(booking);
        console.log('Booking saved:', savedBooking);

        // Success response
        res.status(200).json({ 
            success: true, 
            message: 'Booking request received successfully!',
            booking_id: savedBooking.bookingReference || savedBooking.id
        });

    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred. Please try again later.' });
    }
});

// === API: Admin Bookings ===
app.get('/api/admin/bookings', async (req, res) => {
    try {
        // Get bookings from storage (with fallback)
        const bookings = await bookingsStorage.getAllBookings();
        
        // If we didn't get any bookings and the database is in error state,
        // try to load from a local backup file
        if (bookings.length === 0) {
            try {
                // Try to load from local backup
                const localBookingsPath = path.join(__dirname, 'local_bookings.json');
                const exists = await fs.access(localBookingsPath).then(() => true).catch(() => false);
                
                if (exists) {
                    const data = await fs.readFile(localBookingsPath, 'utf8');
                    const localBookings = JSON.parse(data);
                    
                    // Sort by created_at date, most recent first
                    localBookings.sort((a, b) => {
                        const dateA = new Date(b.created_at || b.dateSubmitted || b.timestamp || 0);
                        const dateB = new Date(a.created_at || a.dateSubmitted || a.timestamp || 0);
                        return dateA - dateB;
                    });
                    
                    return res.status(200).json({ 
                        success: true, 
                        bookings: localBookings,
                        source: 'local_file'
                    });
                }
            } catch (localError) {
                console.error('Error loading local bookings backup:', localError);
            }
        }
        
        // Sort by created_at date, most recent first
        bookings.sort((a, b) => {
            const dateA = new Date(b.created_at || b.dateSubmitted || b.timestamp || 0);
            const dateB = new Date(a.created_at || a.dateSubmitted || a.timestamp || 0);
            return dateA - dateB;
        });
        
        res.status(200).json({ 
            success: true, 
            bookings: bookings,
            source: 'database'
        });
    } catch (error) {
        console.error('Error retrieving bookings:', error);
        
        // In case of any error, try to load from localStorage backup
        try {
            const localBookingsPath = path.join(__dirname, 'local_bookings.json');
            const exists = await fs.access(localBookingsPath).then(() => true).catch(() => false);
            
            if (exists) {
                const data = await fs.readFile(localBookingsPath, 'utf8');
                const localBookings = JSON.parse(data);
                
                // Sort by created_at date, most recent first
                localBookings.sort((a, b) => {
                    const dateA = new Date(b.created_at || b.dateSubmitted || b.timestamp || 0);
                    const dateB = new Date(a.created_at || a.dateSubmitted || a.timestamp || 0);
                    return dateA - dateB;
                });
                
                return res.status(200).json({ 
                    success: true, 
                    bookings: localBookings,
                    source: 'local_file_fallback'
                });
            }
        } catch (backupError) {
            console.error('Error loading backup:', backupError);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load bookings data.' 
        });
    }
});

// Admin API - Update booking status
app.put('/api/admin/bookings/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }
        
        // Find the booking in the database
        const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        
        // Update the booking status
        const booking = result.rows[0];
        const bookingData = booking.booking_data || {};
        bookingData.status = status;
        
        // Update in database
        const updateResult = await pool.query(`
            UPDATE bookings
            SET status = $1, booking_data = $2
            WHERE id = $3
            RETURNING *
        `, [status, bookingData, id]);
        
        return res.status(200).json({
            success: true,
            booking: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update booking status: ' + error.message
        });
    }
});

// === API: Debug ===
app.get('/api/debug/bookings', async (req, res) => {
    try {
        const bookings = await bookingsStorage.getAllBookings();
        
        res.status(200).json({
            success: true,
            storage: {
                type: process.env.RAILWAY ? 'persistent disk' : 'local filesystem',
                path: BOOKINGS_FILE
            },
            hasBookingsTable: true,
            hasCarsTable: true,
            bookingsCount: bookings.length,
            carsCount: 6,
            rawBookings: bookings,
            availableTables: ["cars", "bookings"]
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Debug endpoint error' 
        });
    }
});

// === API: Migrate Bookings ===
app.post('/api/migrate-bookings', async (req, res) => {
  try {
    const { bookings } = req.body;
    
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No valid bookings provided for migration'
      });
    }
    
    console.log(`Received ${bookings.length} bookings for migration`);
    
    // Track results
    const results = {
      total: bookings.length,
      migrated: 0,
      skipped: 0,
      errors: 0
    };
    
    // Process each booking
    for (const booking of bookings) {
      try {
        // Check if booking already exists
        const existingBooking = await pool.query(
          'SELECT id FROM bookings WHERE booking_reference = $1',
          [booking.bookingReference || booking.booking_reference]
        );
        
        if (existingBooking.rows.length > 0) {
          console.log(`Skipping existing booking: ${booking.bookingReference || booking.booking_reference}`);
          results.skipped++;
          continue;
        }
        
        // Add booking to database using the bookingsStorage helper
        await bookingsStorage.addBooking(booking);
        results.migrated++;
        console.log(`Migrated booking: ${booking.bookingReference || booking.booking_reference}`);
      } catch (error) {
        console.error(`Error migrating booking ${booking.bookingReference || booking.booking_reference}:`, error);
        results.errors++;
      }
    }
    
    // Return results
    res.status(200).json({
      success: true,
      message: `Migration complete. ${results.migrated} bookings migrated successfully.`,
      ...results
    });
  } catch (error) {
    console.error('Error in migration endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Migration failed: ' + error.message 
    });
  }
});

// === Prevent 404 for missing favicon ===
app.get('/favicon.ico', (req, res) => res.sendStatus(204));

// Debug endpoint to check server environment
app.get('/debug/server', (req, res) => {
  res.json({
    environment: {
      nodeEnv: process.env.NODE_ENV,
      railway: process.env.RAILWAY,
      port: process.env.PORT,
      workingDirectory: process.cwd(),
      platform: process.platform,
      dirname: __dirname
    },
    versions: {
      node: process.version,
      dependencies: {
        express: require('express/package.json').version,
        cors: require('cors/package.json').version
      }
    }
  });
});

// Diagnostic endpoint to check database connectivity
app.get('/api/diagnostic', async (req, res) => {
  try {
    const results = {
      server: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime() + ' seconds'
      },
      database: {
        status: 'checking'
      },
      tables: {},
      storageStatus: {
        localStorage: 'N/A (server-side check)',
        sessionStorage: 'N/A (server-side check)',
        database: 'checking',
      }
    };
    
    // Check database connection
    try {
      const dbResult = await pool.query('SELECT NOW()');
      results.database = {
        status: 'connected',
        version: 'PostgreSQL',
        timestamp: dbResult.rows[0].now
      };
      results.storageStatus.database = 'connected';
    } catch (dbError) {
      results.database = {
        status: 'error',
        error: dbError.message
      };
      results.storageStatus.database = 'disconnected';
    }
    
    // Check bookings table
    try {
      const bookingsCount = await pool.query('SELECT COUNT(*) FROM bookings');
      results.tables.bookings = {
        exists: true,
        count: parseInt(bookingsCount.rows[0].count)
      };
    } catch (tableError) {
      results.tables.bookings = {
        exists: false,
        error: tableError.message
      };
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({
      server: {
        status: 'error',
        error: error.message
      }
    });
  }
});

// Database initialization endpoint
app.get('/api/init-database', async (req, res) => {
  try {
    await initDatabase();
    res.json({
      success: true,
      message: 'Database tables initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize database: ' + error.message
    });
  }
});

// Debug endpoint to check image paths
app.get('/debug/images', (req, res) => {
  const imagesPath = path.join(__dirname, 'images');
  const publicImagesPath = path.join(__dirname, 'public/images');
  
  Promise.all([
    fs.readdir(imagesPath).catch(err => ({ error: err.message })),
    fs.readdir(publicImagesPath).catch(err => ({ error: err.message }))
  ])
  .then(([imagesFiles, publicImagesFiles]) => {
    res.json({ 
      success: true, 
      images: {
        path: imagesPath,
        absolutePath: path.resolve(imagesPath),
        files: Array.isArray(imagesFiles) ? imagesFiles : [],
        error: imagesFiles.error
      },
      publicImages: {
        path: publicImagesPath,
        absolutePath: path.resolve(publicImagesPath),
        files: Array.isArray(publicImagesFiles) ? publicImagesFiles : [],
        error: publicImagesFiles.error
      }
    });
  })
  .catch(err => {
    res.json({ 
      success: false, 
      error: err.message
    });
  });
});

// === Serve Static Files ===
// Serve from public directory first (highest priority)
app.use(express.static(path.join(__dirname, 'public')));

// Next serve from images directory explicitly
app.use('/images', express.static(path.join(__dirname, 'images'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    console.log(`Serving image: ${filePath}`);
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Finally serve from root directory
app.use(express.static(__dirname));

// Handle root path explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// === PostgreSQL API Routes ===
// Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bookings ORDER BY date_submitted DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get a booking by reference
app.get('/api/bookings/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const result = await pool.query('SELECT * FROM bookings WHERE booking_reference = $1', [reference]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching booking:', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = req.body;
    
    // Validate required fields
    if (!booking.bookingReference) {
      return res.status(400).json({ error: 'Booking reference is required' });
    }
    
    // Extract customer info from booking
    const customer = booking.customer || {};
    
    // Extract car info
    const car = booking.selectedCar || {};
    
    // Insert into database
    const result = await pool.query(
      `INSERT INTO bookings (
        booking_reference, customer_first_name, customer_last_name, 
        customer_email, customer_phone, pickup_date, return_date,
        pickup_location, dropoff_location, car_make, car_model,
        status, total_price, payment_date, date_submitted, booking_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        booking.bookingReference,
        customer.firstName || '',
        customer.lastName || '',
        customer.email || '',
        customer.phone || '',
        booking.pickupDate ? new Date(booking.pickupDate) : null,
        booking.returnDate ? new Date(booking.returnDate) : null,
        booking.pickupLocation || '',
        booking.dropoffLocation || booking.pickupLocation || '',
        car.make || '',
        car.model || '',
        booking.status || 'pending',
        booking.totalPrice || 0,
        booking.paymentDate ? new Date(booking.paymentDate) : null,
        booking.dateSubmitted || booking.timestamp ? new Date(booking.dateSubmitted || booking.timestamp) : new Date(),
        booking // Store the complete booking object as JSONB
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Failed to create booking', details: err.message });
  }
});

// Update a booking
app.put('/api/bookings/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const booking = req.body;
    
    // Check if booking exists
    const checkResult = await pool.query('SELECT * FROM bookings WHERE booking_reference = $1', [reference]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Update booking status
    const result = await pool.query(
      `UPDATE bookings 
       SET status = $1, booking_data = $2
       WHERE booking_reference = $3
       RETURNING *`,
      [booking.status, booking, reference]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete a booking
app.delete('/api/bookings/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    
    const result = await pool.query('DELETE FROM bookings WHERE booking_reference = $1 RETURNING *', [reference]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ message: 'Booking deleted successfully', booking: result.rows[0] });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// === API: Save Local Bookings to File ===
app.post('/api/bookings/save-local', async (req, res) => {
  try {
    const { bookings } = req.body;
    
    if (!bookings || !Array.isArray(bookings)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bookings data'
      });
    }
    
    // Save to local file
    const localBookingsPath = path.join(__dirname, 'local_bookings.json');
    await fs.writeFile(localBookingsPath, JSON.stringify(bookings, null, 2));
    
    console.log(`Saved ${bookings.length} bookings to local backup file`);
    
    res.status(200).json({
      success: true,
      message: `Successfully saved ${bookings.length} bookings to local backup file`,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error saving local bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save bookings to local file',
      error: error.message
    });
  }
});

// === API: Check Backup File Status ===
app.get('/api/bookings/backup-status', async (req, res) => {
  try {
    // Check if backup file exists
    const localBookingsPath = path.join(__dirname, 'local_bookings.json');
    const exists = await fs.access(localBookingsPath).then(() => true).catch(() => false);
    
    if (exists) {
      // Get file stats
      const stats = await fs.stat(localBookingsPath);
      const modified = new Date(stats.mtime).toLocaleString();
      
      // Read file to get count of bookings
      const data = await fs.readFile(localBookingsPath, 'utf8');
      const bookings = JSON.parse(data);
      const count = Array.isArray(bookings) ? bookings.length : 0;
      
      res.status(200).json({
        exists: true,
        modified,
        count,
        size: stats.size,
      });
    } else {
      res.status(200).json({
        exists: false
      });
    }
  } catch (error) {
    console.error('Error checking backup file status:', error);
    res.status(500).json({
      exists: false,
      error: error.message
    });
  }
});

// === Start the Server ===
app.listen(port, () => {
    console.log(`Calma Car Rental server listening on port ${port}`);
});

// Init database tables if they don't exist
async function initDatabase() {
  try {
    // Create bookings table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_reference VARCHAR(50) UNIQUE NOT NULL,
        customer_first_name VARCHAR(100),
        customer_last_name VARCHAR(100),
        customer_email VARCHAR(150),
        customer_phone VARCHAR(50),
        pickup_date TIMESTAMP,
        return_date TIMESTAMP,
        pickup_location VARCHAR(100),
        dropoff_location VARCHAR(100),
        car_make VARCHAR(100),
        car_model VARCHAR(100),
        status VARCHAR(20),
        total_price NUMERIC(10, 2),
        payment_date TIMESTAMP,
        date_submitted TIMESTAMP,
        booking_data JSONB
      )
    `);
    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  }
}

// Call init database
initDatabase();

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  // First try to serve a specific file matching the path
  const filePath = path.join(__dirname, req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      // If file not found, serve index.html
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

// Handle admin path explicitly
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
}); 