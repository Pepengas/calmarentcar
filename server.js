/**
 * Calma Car Rental - Server
 * Clean Express.js backend with PostgreSQL integration
 */

// Import required packages
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

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

// PostgreSQL connection
let pool = null;
let dbConnected = false;

// Set up database connection
function setupDatabase() {
    try {
        const connectionString = process.env.DATABASE_URL;
        
        if (!connectionString) {
            console.log('⚠️ No DATABASE_URL found in environment variables');
            return false;
        }
        
        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false // Required for Railway SSL connections
            }
        });
        
        // Test the connection
        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('❌ Database connection error:', err);
                dbConnected = false;
            } else {
                console.log('✅ Successfully connected to PostgreSQL database at:', res.rows[0].now);
                dbConnected = true;
                
                // Create tables if they don't exist
                createTables();
            }
        });
        
        return true;
    } catch (error) {
        console.error('❌ Error initializing database connection:', error);
        return false;
    }
}

// Create database tables if they don't exist
async function createTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                booking_reference VARCHAR(50) UNIQUE,
                customer_first_name VARCHAR(100) NOT NULL,
                customer_last_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(150) NOT NULL,
                customer_phone VARCHAR(50),
                customer_age VARCHAR(20),
                driver_license VARCHAR(50),
                license_expiration TIMESTAMP,
                country VARCHAR(50),
                pickup_date TIMESTAMP NOT NULL,
                return_date TIMESTAMP NOT NULL,
                pickup_location VARCHAR(100) NOT NULL,
                dropoff_location VARCHAR(100),
                car_make VARCHAR(100) NOT NULL,
                car_model VARCHAR(100) NOT NULL,
                daily_rate NUMERIC(10,2),
                total_price NUMERIC(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                payment_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                additional_driver BOOLEAN DEFAULT FALSE,
                full_insurance BOOLEAN DEFAULT FALSE,
                gps_navigation BOOLEAN DEFAULT FALSE,
                child_seat BOOLEAN DEFAULT FALSE,
                special_requests TEXT
            )
        `);
        console.log('✅ Bookings table created or already exists');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
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
        // Log incoming request for debugging
        console.log('📦 New booking request received:', JSON.stringify(req.body, null, 2));
        
        const booking = req.body;
        
        // Validate required fields
        const requiredFields = [
            'customer_first_name', 'customer_last_name', 'customer_email',
            'pickup_date', 'return_date', 'pickup_location',
            'car_make', 'car_model', 'total_price'
        ];
        
        const missingFields = requiredFields.filter(field => !booking[field]);
        
        if (missingFields.length > 0) {
            console.error('❌ Missing required fields:', missingFields);
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }
        
        // Generate unique booking reference
        const bookingRef = `BK-${uuidv4().substring(0, 8).toUpperCase()}`;
        
        if (dbConnected && pool) {
            // Insert booking into database
            const result = await pool.query(`
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
                booking.car_make,
                booking.car_model,
                booking.daily_rate || null,
                booking.total_price,
                'pending',
                booking.additional_driver || false,
                booking.full_insurance || false,
                booking.gps_navigation || false,
                booking.child_seat || false,
                booking.special_requests || null
            ]);
            
            console.log('✅ Booking saved to database successfully, reference:', bookingRef);
            
            return res.status(201).json({
                success: true,
                booking_reference: bookingRef,
                redirect_url: `/booking-confirmation.html?reference=${bookingRef}`
            });
        } else {
            console.error('❌ Database connection not available');
            return res.status(503).json({
                success: false,
                error: 'Database connection not available'
            });
        }
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
        
        if (dbConnected && pool) {
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
        } else {
            return res.status(503).json({
                success: false,
                error: 'Database connection not available'
            });
        }
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
        if (!dbConnected || !pool) {
            console.error('❌ Database not connected. Cannot fetch bookings.');
            return res.status(503).json({
                success: false,
                error: 'Database connection not available',
                bookings: []
            });
        }
        
        // Fetch all bookings from database
        console.log('💾 Database connected, fetching bookings...');
        const result = await pool.query(`
            SELECT * FROM bookings 
            ORDER BY created_at DESC
        `);
        
        console.log(`📋 Found ${result.rows.length} bookings in database`);
        
        // Format bookings for the admin dashboard
        const bookings = result.rows.map(booking => {
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
                car_make: booking.car_make,
                car_model: booking.car_model,
                pickup_date: booking.pickup_date,
                return_date: booking.return_date,
                pickup_location: booking.pickup_location,
                dropoff_location: booking.dropoff_location,
                daily_rate: booking.daily_rate,
                total_price: booking.total_price,
                status: booking.status,
                payment_date: booking.payment_date,
                date_submitted: booking.created_at,
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
            dbConnected
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
        
        if (!dbConnected || !pool) {
            return res.status(503).json({
                success: false,
                error: 'Database connection not available'
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
            SET status = $1, updated_at = CURRENT_TIMESTAMP
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

// Get booking statistics (admin only) (GET /api/admin/statistics)
app.get('/api/admin/statistics', requireAdminAuth, async (req, res) => {
    try {
        if (!dbConnected || !pool) {
            return res.status(503).json({
                success: false,
                error: 'Database connection not available'
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
            WHERE created_at::date = CURRENT_DATE
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

// Get available cars (GET /api/cars)
app.get('/api/cars', (req, res) => {
    try {
        // Read cars from JSON file
        const fs = require('fs');
        let cars = [];

        try {
            // Try to read cars.json if it exists
            if (fs.existsSync(path.join(__dirname, 'cars.json'))) {
                const carsData = fs.readFileSync(path.join(__dirname, 'cars.json'), 'utf8');
                cars = JSON.parse(carsData);
                console.log(`📋 Retrieved ${cars.length} cars from cars.json`);
            } else {
                // Provide default cars if file doesn't exist
                console.log('⚠️ cars.json not found, using default empty array');
                cars = [];
            }
        } catch (fileError) {
            console.error('⚠️ Error reading cars.json:', fileError);
            // Continue with empty cars array
        }
        
        return res.json({
            success: true,
            cars: cars
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
    // Set up database connection
    setupDatabase();
    
    // Start Express server
    app.listen(port, () => {
        console.log(`📡 Server running on port ${port}`);
        console.log(`🌐 Visit: http://localhost:${port}`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
}); 