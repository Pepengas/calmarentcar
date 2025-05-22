/**
 * Calma Car Rental - Server
 * Clean Express.js backend with PostgreSQL integration
 */

// Import required packages
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

// Import database pool
const { pool, registerCreateTables } = require('./database');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Create database tables if they don't exist
async function createTables() {
    try {
        if (!global.dbConnected) {
            console.warn('⚠️ Cannot create tables: database not connected');
            return;
        }
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                booking_reference TEXT UNIQUE,
                customer_first_name TEXT,
                customer_last_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                driver_license TEXT,
                license_expiration DATE,
                customer_age INT,
                country TEXT,
                pickup_date DATE,
                return_date DATE,
                pickup_location TEXT,
                dropoff_location TEXT,
                car_make TEXT,
                car_model TEXT,
                daily_rate NUMERIC,
                total_price NUMERIC,
                additional_driver BOOLEAN,
                full_insurance BOOLEAN,
                gps_navigation BOOLEAN,
                child_seat BOOLEAN,
                special_requests TEXT,
                status TEXT DEFAULT 'pending',
                date_submitted TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Bookings table created successfully.');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
}

// Register the createTables function with the database module
registerCreateTables(createTables);

// Create tables when database is connected
if (global.dbConnected) {
    createTables();
}

// Admin authentication middleware
function requireAdminAuth(req, res, next) {
    // For testing purposes, you can disable auth with an env variable
    if (process.env.DISABLE_ADMIN_AUTH === 'true') {
        return next();
    }

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format

    // Check token in cookies as well
    const cookieToken = req.cookies?.adminToken;

    // Valid token (in production, use a more secure method like JWT)
    const validToken = process.env.ADMIN_API_TOKEN || 'calma-admin-token-2023';
    
    if ((token && token === validToken) || (cookieToken && cookieToken === validToken)) {
        return next();
    }

    // Authentication failed
    return res.status(401).json({
        success: false,
        error: 'Authentication required'
    });
}

/**
 * API Routes
 */

// Create a new booking (POST /api/bookings)
app.post('/api/bookings', async (req, res) => {
    try {
        const booking = req.body;
        
        // Calculate total price
        const total_price = await calculateTotalPrice(
            booking.car_id,
            booking.pickup_date,
            booking.return_date
        );

        // Get the daily rate for the pickup month
        const pickup_month = new Date(booking.pickup_date).toISOString().slice(0, 7);
        const rateResult = await pool.query(
            'SELECT monthly_pricing FROM cars WHERE car_id = $1',
            [booking.car_id]
        );
        const daily_rate = rateResult.rows[0].monthly_pricing[pickup_month];

        // Add calculated prices to booking
        booking.total_price = total_price;
        booking.daily_rate = daily_rate;

        // Validate required fields
        const requiredFields = [
            'customer_first_name', 'customer_last_name', 'customer_email',
            'pickup_date', 'return_date', 'pickup_location'
        ];
        
        const carDataFields = ['car_make', 'car_model', 'total_price'];
        
        // Check basic required fields
        const missingFields = requiredFields.filter(field => !booking[field]);
        
        if (missingFields.length > 0) {
            console.error('❌ Missing required fields:', missingFields);
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }
        
        // Validate car data more strictly to prevent "Unknown Unknown" issues
        const missingCarData = carDataFields.filter(field => !booking[field]);
        
        if (missingCarData.length > 0) {
            console.error('❌ Missing car data fields:', missingCarData);
            return res.status(400).json({
                success: false,
                error: `Missing car data fields: ${missingCarData.join(', ')}. Please select a car before booking.`
            });
        }
        
        // Generate unique booking reference
        const bookingRef = `BK-${uuidv4().substring(0, 8).toUpperCase()}`;
        
        if (!global.dbConnected) {
            console.warn('🚨 Skipping DB call: no connection');
            return res.status(503).json({
                success: false,
                error: 'Database not connected'
            });
        }
        
        // Ensure car_make and car_model are properly formatted
        const carMake = (booking.car_make || '').trim();
        const carModel = (booking.car_model || '').trim();
        
        // Block bookings with empty car data
        if (!carMake || !carModel) {
            console.error('❌ Empty car make or model:', { carMake, carModel });
            return res.status(400).json({
                success: false,
                error: 'Car make and model cannot be empty. Please select a car before booking.'
            });
        }
        
        // Ensure daily_rate is a number
        let dailyRate = parseFloat(booking.daily_rate);
        if (isNaN(dailyRate) && booking.total_price) {
            // Calculate daily rate from total price if missing
            const pickupDate = new Date(booking.pickup_date);
            const returnDate = new Date(booking.return_date);
            const diffTime = Math.abs(returnDate - pickupDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            dailyRate = parseFloat(booking.total_price) / diffDays;
        }
        
        // If we still don't have a valid daily rate, reject the booking
        if (isNaN(dailyRate) || dailyRate <= 0) {
            console.error('❌ Invalid daily rate:', dailyRate);
            return res.status(400).json({
                success: false,
                error: 'Invalid daily rate. Please select a car with a valid price.'
            });
        }
        
        console.log('✅ Validated car data:', {
            carMake,
            carModel,
            dailyRate,
            totalPrice: booking.total_price
        });
        
        // Insert booking into database
        const insertResult = await pool.query(`
            INSERT INTO bookings (
                booking_reference, 
                customer_first_name, customer_last_name, customer_email, 
                customer_phone, customer_age, driver_license, license_expiration, country,
                pickup_date, return_date, pickup_location, dropoff_location, 
                car_make, car_model, daily_rate, total_price, status, 
                additional_driver, full_insurance, gps_navigation, child_seat, 
                special_requests
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING *
        `, [
            bookingRef,
            booking.customer_first_name,
            booking.customer_last_name,
            booking.customer_email,
            booking.customer_phone || null,
            booking.customer_age || null,
            booking.driver_license || null,
            booking.license_expiration || null,
            booking.country || null,
            booking.pickup_date,
            booking.return_date,
            booking.pickup_location,
            booking.dropoff_location || booking.pickup_location,
            carMake,
            carModel,
            dailyRate,
            booking.total_price,
            'pending',
            booking.additional_driver || false,
            booking.full_insurance || false,
            booking.gps_navigation || false,
            booking.child_seat || false,
            booking.special_requests || null
        ]);
        
        console.log('✅ Booking saved to database successfully, reference:', bookingRef);
        
        return res.status(200).json({
            success: true,
            booking_reference: bookingRef,
            redirect_url: `/booking-confirmation.html?reference=${bookingRef}`
        });
    } catch (error) {
        console.error('❌ Error creating booking:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get booking by reference (GET /api/bookings/:reference)
app.get('/api/bookings/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        
        if (!reference) {
            return res.status(400).json({
                success: false,
                error: 'Booking reference is required'
            });
        }
        
        if (!global.dbConnected) {
            console.warn('🚨 Skipping DB call: no connection');
            return res.status(503).json({
                success: false,
                error: 'Database not connected'
            });
        }
        
        const result = await pool.query('SELECT * FROM bookings WHERE booking_reference = $1', [reference]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        
        const booking = result.rows[0];
        
        // Format the booking data for client consumption
        const formattedBooking = {
            booking_reference: booking.booking_reference,
            status: booking.status,
            customer: {
                first_name: booking.customer_first_name,
                last_name: booking.customer_last_name,
                email: booking.customer_email,
                phone: booking.customer_phone,
                age: booking.customer_age,
                driver_license: booking.driver_license,
                license_expiration: booking.license_expiration,
                country: booking.country
            },
            rental: {
                pickup_date: booking.pickup_date,
                return_date: booking.return_date,
                pickup_location: booking.pickup_location,
                dropoff_location: booking.dropoff_location,
                car_make: booking.car_make,
                car_model: booking.car_model,
                daily_rate: booking.daily_rate,
                total_price: booking.total_price
            },
            addons: {
                additional_driver: booking.additional_driver,
                full_insurance: booking.full_insurance,
                gps_navigation: booking.gps_navigation,
                child_seat: booking.child_seat
            },
            special_requests: booking.special_requests,
            created_at: booking.created_at
        };
        
        return res.json({
            success: true,
            booking: formattedBooking
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all bookings (admin only) (GET /api/admin/bookings)
app.get('/api/admin/bookings', requireAdminAuth, async (req, res) => {
    console.log('📊 Admin API - Get all bookings route accessed', new Date().toISOString());
    console.log('🔑 Auth headers:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🍪 Admin cookie:', req.cookies?.adminToken ? 'Present' : 'Missing');
    
    try {
        if (!global.dbConnected) {
            console.warn('🚨 Skipping DB call: no connection');
            return res.status(503).json({
                success: false,
                error: 'Database not connected',
                bookings: []
            });
        }
        
        // Fetch all bookings from database with proper JOIN if cars table exists
        console.log('💾 Database connected, fetching bookings...');
        let result;
        
        try {
            // First check if the cars table exists
            const tablesResult = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'cars'
                );
            `);
            
            const carsTableExists = tablesResult.rows[0].exists;
            
            if (carsTableExists) {
                // Join with cars table to get car information if missing in bookings
                result = await pool.query(`
                    SELECT b.*, c.name AS car_name_lookup
                    FROM bookings b
                    LEFT JOIN cars c ON LOWER(CONCAT(b.car_make, ' ', b.car_model)) = LOWER(c.name)
                    ORDER BY b.date_submitted DESC
                `);
            } else {
                // If cars table doesn't exist, just fetch from bookings
                result = await pool.query(`
                    SELECT * FROM bookings 
                    ORDER BY date_submitted DESC
                `);
            }
        } catch (dbError) {
            // If the JOIN fails, fall back to just selecting from bookings
            console.warn('⚠️ Failed to join with cars table, falling back to bookings table only:', dbError.message);
            result = await pool.query(`
                SELECT * FROM bookings 
                ORDER BY date_submitted DESC
            `);
        }
        
        console.log(`📋 Found ${result.rows.length} bookings in database`);
        
        // Format bookings for the admin dashboard
        const bookings = result.rows.map(booking => {
            // Use car_make/car_model from the cars table if available and booking fields are empty
            const carMake = booking.car_make || booking.car_name_lookup || '';
            const carModel = booking.car_model || booking.car_name_lookup || '';
            const dailyRate = booking.daily_rate;
            
            return {
                id: booking.id,
                booking_reference: booking.booking_reference,
                customer: {
                    firstName: booking.customer_first_name,
                    lastName: booking.customer_last_name,
                    email: booking.customer_email,
                    phone: booking.customer_phone,
                    age: booking.customer_age,
                    driverLicense: booking.driver_license,
                    licenseExpiration: booking.license_expiration,
                    country: booking.country
                },
                car_make: carMake,
                car_model: carModel,
                pickup_date: booking.pickup_date,
                return_date: booking.return_date,
                pickup_location: booking.pickup_location,
                dropoff_location: booking.dropoff_location,
                daily_rate: dailyRate,
                total_price: booking.total_price,
                status: booking.status,
                payment_date: booking.payment_date,
                date_submitted: booking.date_submitted,
                additional_driver: booking.additional_driver,
                full_insurance: booking.full_insurance,
                gps_navigation: booking.gps_navigation,
                child_seat: booking.child_seat,
                special_requests: booking.special_requests
            };
        });
        
        return res.json({
            success: true,
            bookings,
            dbConnected: global.dbConnected
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            bookings: []
        });
    }
});

// Update booking status (admin only) (PUT /api/admin/bookings/:id/status)
app.put('/api/admin/bookings/:id/status', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }
        
        if (!global.dbConnected) {
            console.warn('🚨 Skipping DB call: no connection');
            return res.status(503).json({
                success: false,
                error: 'Database not connected'
            });
        }
        
        // Valid statuses
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }
        
        // Update booking status
        const result = await pool.query(`
            UPDATE bookings
            SET status = $1
            WHERE id = $2
            RETURNING *
        `, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        
        return res.json({
            success: true,
            booking: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete booking (admin only) (DELETE /api/admin/bookings/:id)
app.delete('/api/admin/bookings/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!global.dbConnected) {
            console.warn('🚨 Skipping DB call: no connection');
            return res.status(503).json({
                success: false,
                error: 'Database not connected'
            });
        }
        
        // Get booking reference before deletion (for logging purposes)
        const bookingResult = await pool.query('SELECT booking_reference FROM bookings WHERE id = $1', [id]);
        
        if (bookingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        
        const bookingRef = bookingResult.rows[0].booking_reference;
        
        // Delete the booking
        await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
        
        console.log(`🗑️ Admin deleted booking ID ${id}, reference ${bookingRef}`);
        
        return res.json({
            success: true,
            message: `Booking ${bookingRef} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting booking:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get booking statistics (admin only) (GET /api/admin/statistics)
app.get('/api/admin/statistics', requireAdminAuth, async (req, res) => {
    try {
        if (!global.dbConnected) {
            console.warn('🚨 Skipping DB call: no connection');
            return res.status(503).json({
                success: false,
                error: 'Database not connected'
            });
        }
        
        // Get count of all bookings
        const totalBookingsResult = await pool.query('SELECT COUNT(*) FROM bookings');
        const totalBookings = parseInt(totalBookingsResult.rows[0].count);
        
        // Get sum of all booking prices
        const revenueResult = await pool.query('SELECT SUM(total_price) FROM bookings');
        const totalRevenue = parseFloat(revenueResult.rows[0].sum || 0);
        
        // Get bookings by status
        const statusCountsResult = await pool.query(`
            SELECT status, COUNT(*) 
            FROM bookings 
            GROUP BY status
        `);
        
        // Get bookings created today
        const todayBookingsResult = await pool.query(`
            SELECT COUNT(*) 
            FROM bookings 
            WHERE date_submitted::date = CURRENT_DATE
        `);
        const todayBookings = parseInt(todayBookingsResult.rows[0].count);
        
        // Get popular car models
        const popularCarsResult = await pool.query(`
            SELECT car_make, car_model, COUNT(*) as count
            FROM bookings
            GROUP BY car_make, car_model
            ORDER BY count DESC
            LIMIT 5
        `);
        
        // Convert status counts to an object
        const statusCounts = {};
        statusCountsResult.rows.forEach(row => {
            statusCounts[row.status] = parseInt(row.count);
        });
        
        return res.json({
            success: true,
            statistics: {
                totalBookings,
                totalRevenue,
                todayBookings,
                statusCounts,
                popularCars: popularCarsResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Admin login check
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // In a real app, check credentials against database
        // For this demo, we use hardcoded values (replace with proper auth!)
        if (username === 'admin' && password === 'admin123') {
            const token = process.env.ADMIN_API_TOKEN || 'calma-admin-token-2023';
            
            // Set cookie with token (for server-side auth check)
            res.cookie('adminToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });
            
            return res.json({
                success: true,
                token, // Client should store this in localStorage
                message: 'Login successful',
            });
        }
        
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create database tables (admin only)
app.post('/api/admin/setup-database', requireAdminAuth, async (req, res) => {
    try {
        if (!global.dbConnected) {
            return res.status(503).json({
                success: false,
                error: 'Database not connected'
            });
        }
        
        // Create tables
        await createTables();
        
        return res.json({
            success: true,
            message: 'Database tables created successfully'
        });
    } catch (error) {
        console.error('Error setting up database:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get available cars (GET /api/cars)
app.get('/api/cars', async (req, res) => {
    try {
        if (!global.dbConnected) {
            return res.status(503).json({
                success: false,
                error: 'Database not connected',
                cars: []
            });
        }
        const result = await pool.query('SELECT * FROM cars');
        // Map DB fields to frontend fields
        const cars = result.rows.map(car => ({
            id: car.car_id, // map car_id to id
            name: car.name,
            description: car.description,
            image: car.image,
            category: car.category,
            features: car.features,
            monthly_pricing: car.monthly_pricing,
            available: car.available
        }));
        return res.json({
            success: true,
            cars
        });
    } catch (error) {
        console.error('❌ Error fetching cars:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            cars: []
        });
    }
});

// Car availability check (GET /api/cars/availability)
app.get('/api/cars/availability', (req, res) => {
    try {
        const { carId, pickupDate, dropoffDate } = req.query;
        
        // For now, assume all cars are available
        // In a real implementation, you would check against bookings in the database
        
        return res.json({
            success: true,
            available: true,
            message: "Car is available for the selected dates"
        });
    } catch (error) {
        console.error('❌ Error checking car availability:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get price for a specific car and month
app.get('/api/get-price', async (req, res) => {
    try {
        const { car_id, month } = req.query;
        
        if (!car_id || !month) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: car_id and month'
            });
        }

        const result = await pool.query(
            'SELECT monthly_pricing FROM cars WHERE car_id = $1',
            [car_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Car not found'
            });
        }

        const monthlyPricing = result.rows[0].monthly_pricing;
        const price = monthlyPricing[month] || null;

        if (!price) {
            return res.status(404).json({
                success: false,
                error: 'Price not found for specified month'
            });
        }

        res.json({
            success: true,
            price_per_day: price
        });
    } catch (error) {
        console.error('Error fetching price:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch price'
        });
    }
});

// Update car prices
app.post('/api/update-prices', requireAdminAuth, async (req, res) => {
    try {
        const { car_id, prices } = req.body;

        if (!car_id || !prices) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: car_id and prices'
            });
        }

        // Update the monthly_pricing JSONB column
        await pool.query(
            'UPDATE cars SET monthly_pricing = $1 WHERE car_id = $2',
            [prices, car_id]
        );

        res.json({
            success: true,
            message: 'Prices updated successfully'
        });
    } catch (error) {
        console.error('Error updating prices:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update prices'
        });
    }
});

// Helper function to calculate total price for a booking
async function calculateTotalPrice(car_id, pickup_date, return_date) {
    const pickup = new Date(pickup_date);
    const return_date_obj = new Date(return_date);
    let total_price = 0;
    let current_date = new Date(pickup);

    while (current_date <= return_date_obj) {
        const month = current_date.toISOString().slice(0, 7); // Format: YYYY-MM
        const result = await pool.query(
            'SELECT monthly_pricing FROM cars WHERE car_id = $1',
            [car_id]
        );

        if (result.rows.length === 0) {
            throw new Error('Car not found');
        }

        const monthlyPricing = result.rows[0].monthly_pricing;
        const daily_rate = monthlyPricing[month];

        if (!daily_rate) {
            throw new Error(`No price found for month ${month}`);
        }

        total_price += daily_rate;
        current_date.setDate(current_date.getDate() + 1);
    }

    return total_price;
}

/**
 * HTML Routes
 */

// Admin pages
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Booking confirmation page
app.get('/booking-confirmation', (req, res) => {
    res.sendFile(path.join(__dirname, 'booking-confirmation.html'));
});

// Start server
async function startServer() {
    console.log('🚀 Starting server...');
    
    // Start Express server
    app.listen(port, () => {
        console.log(`📡 Server running on port ${port}`);
        console.log(`🌐 Visit: http://localhost:${port}`);
        console.log(`📊 Database connected: ${global.dbConnected ? 'Yes ✅' : 'No ❌'}`);
        
        if (!global.dbConnected) {
            console.warn('⚠️ Server running without database connection. Some features will be limited.');
        }
    });
}

startServer().catch(err => {
    console.error('❌ Failed to start server:', err);
}); 