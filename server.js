// server.js
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 3000;

// === Configuration ===
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Storage ---
// Determine storage location - use environment variable if available
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

// Initialize bookings file if it doesn't exist
async function initBookingsDB() {
    try {
        // Make sure the data directory exists
        try {
            await fs.mkdir(DATA_DIR, { recursive: true });
            console.log('Ensured data directory exists:', DATA_DIR);
        } catch (dirError) {
            console.warn('Could not create data directory:', dirError.message);
        }

        await fs.access(BOOKINGS_FILE);
        console.log('Bookings database file exists at:', BOOKINGS_FILE);
        // Load initial bookings
        return JSON.parse(await fs.readFile(BOOKINGS_FILE, 'utf8'));
    } catch (error) {
        console.log('Creating new bookings database file at:', BOOKINGS_FILE);
        // Sample initial data
        const initialBookings = [
            {
                id: 1,
                car_id: "aygo",
                car_name: "Toyota Aygo",
                pickup_location: "Chania Airport",
                dropoff_location: "Chania City Center",
                pickup_date: "2025-04-22T00:00:00.000Z",
                pickup_time: "10:00:00",
                dropoff_date: "2025-04-23T00:00:00.000Z",
                dropoff_time: "10:00:00",
                customer_name: "Test User",
                customer_email: "test@example.com",
                customer_phone: "+30123456789",
                customer_age: 25,
                additional_requests: "Sample booking",
                status: "confirmed",
                created_at: "2025-04-22T09:51:26.462Z",
                updated_at: "2025-04-22T09:51:26.462Z"
            },
            {
                id: 2,
                car_id: "i10",
                car_name: "Hyundai i10",
                pickup_location: "Chania City Center",
                dropoff_location: "Chania Airport",
                pickup_date: "2025-05-12T00:00:00.000Z",
                pickup_time: "14:00:00",
                dropoff_date: "2025-05-15T00:00:00.000Z",
                dropoff_time: "12:00:00",
                customer_name: "Another User",
                customer_email: "another@example.com",
                customer_phone: "+30987654321",
                customer_age: 30,
                additional_requests: "Sample booking #2",
                status: "confirmed",
                created_at: "2025-04-23T10:15:30.000Z",
                updated_at: "2025-04-23T10:15:30.000Z"
            }
        ];
        
        try {
            // Write initial data
            await fs.writeFile(BOOKINGS_FILE, JSON.stringify(initialBookings, null, 2));
            return initialBookings;
        } catch (writeError) {
            console.error('Error creating bookings file:', writeError);
            // Fallback to in-memory if file creation fails
            return initialBookings;
        }
    }
}

// Storage manager
const bookingsStorage = {
    bookings: [],
    
    // Initialize from file
    async init() {
        this.bookings = await initBookingsDB();
        console.log(`Loaded ${this.bookings.length} bookings from storage`);
    },
    
    // Save to file
    async saveToFile() {
        try {
            await fs.writeFile(BOOKINGS_FILE, JSON.stringify(this.bookings, null, 2));
            console.log('Bookings saved to file');
        } catch (error) {
            console.error('Failed to save bookings to file:', error);
        }
    },
    
    // Add a new booking
    async addBooking(booking) {
        const highestId = this.bookings.reduce((max, b) => b.id > max ? b.id : max, 0);
        
        const newBooking = {
            ...booking,
            id: highestId + 1,
            status: 'confirmed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.bookings.push(newBooking);
        console.log(`Added new booking #${newBooking.id} for ${newBooking.customer_name}`);
        
        // Save to persistent storage
        await this.saveToFile();
        
        return newBooking;
    },
    
    // Get all bookings
    getAllBookings() {
        return [...this.bookings];
    }
};

// Initialize storage
bookingsStorage.init().catch(err => {
    console.error('Failed to initialize bookings storage:', err);
});

// === API Routes ===
// Import Stripe API routes
const checkoutRoutes = require('./api/checkout');
const webhookRoutes = require('./api/webhooks');

// Register API routes
app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhooks', webhookRoutes);

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
        const carsFilePath = path.join(__dirname, 'cars.json');
        const carsData = await fs.readFile(carsFilePath, 'utf8');
        const cars = JSON.parse(carsData);
        const selectedCar = cars.find(car => car.id === bookingData['car-selection']);
        const carName = selectedCar ? selectedCar.name : 'Unknown Car';

        // Create booking object
        const booking = {
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
            additional_requests: bookingData['additional-requests'] || ''
        };

        // Save booking
        const savedBooking = await bookingsStorage.addBooking(booking);
        console.log('Booking saved:', savedBooking);

        // Send confirmation email (placeholder)
        console.log('Simulating sending confirmation email to:', booking.customer_email);

        // Success response
        res.status(200).json({ 
            success: true, 
            message: 'Booking request received successfully!',
            booking_id: savedBooking.id
        });

    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred. Please try again later.' });
    }
});

// === API: Admin Bookings ===
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const bookings = bookingsStorage.getAllBookings();
        
        // Sort by created_at date, most recent first
        bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.status(200).json({ 
            success: true, 
            bookings: bookings
        });
    } catch (error) {
        console.error('Error retrieving bookings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load bookings data.' 
        });
    }
});

// === API: Debug ===
app.get('/api/debug/bookings', async (req, res) => {
    try {
        const bookings = bookingsStorage.getAllBookings();
        
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

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// === Start the Server ===
app.listen(port, () => {
    console.log(`Calma Car Rental server listening on port ${port}`);
}); 