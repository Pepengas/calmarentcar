/**
 * Calma Car Rental - Server
 * This file handles the server-side logic for the website
 */

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// PostgreSQL connection
let pool = null;
let dbConnected = false;

// Try to connect to the database
try {
    const connectionString = process.env.DATABASE_URL;
    
    if (connectionString) {
        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false // Required for Railway SSL connections
            }
        });
        
        // Test the connection
        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('Database connection error:', err);
                dbConnected = false;
            } else {
                console.log('Successfully connected to PostgreSQL database at:', res.rows[0].now);
                dbConnected = true;
                
                // Create tables if they don't exist
                createTables();
            }
        });
    } else {
        console.log('No DATABASE_URL found, operating in fallback mode with localStorage');
    }
} catch (error) {
    console.error('Error initializing database connection:', error);
}

// Create database tables if they don't exist
async function createTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                booking_reference VARCHAR(50) UNIQUE,
                customer_first_name VARCHAR(100),
                customer_last_name VARCHAR(100),
                customer_email VARCHAR(150),
                customer_phone VARCHAR(50),
                customer_age VARCHAR(20),
                driver_license VARCHAR(50),
                license_expiration TIMESTAMP,
                country VARCHAR(50),
                pickup_date TIMESTAMP,
                return_date TIMESTAMP,
                pickup_location VARCHAR(100),
                dropoff_location VARCHAR(100),
                car_make VARCHAR(100),
                car_model VARCHAR(100),
                daily_rate NUMERIC(10,2),
                total_price NUMERIC(10,2),
                status VARCHAR(20),
                payment_date TIMESTAMP,
                date_submitted TIMESTAMP,
                additional_driver BOOLEAN,
                full_insurance BOOLEAN,
                gps_navigation BOOLEAN,
                child_seat BOOLEAN,
                special_requests TEXT,
                booking_data JSONB
            )
        `);
        console.log('Tables created or already exist');
    } catch (error) {
        console.error('Error creating tables:', error);
    }
}

// Simple admin auth middleware
function requireAdminAuth(req, res, next) {
    // Get the token from the request headers
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format

    // Check if token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    // Simple token validation (in production, use a more secure method)
    // Use environment variable for token or a default for development
    const validToken = process.env.ADMIN_API_TOKEN || 'calma-admin-token-2023';
    
    if (token !== validToken) {
        return res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }

    // If token is valid, proceed
    next();
}

/**
 * API Routes
 */

// Admin API - Get database status
app.get('/api/admin/db-status', requireAdminAuth, async (req, res) => {
    try {
        if (!pool) {
            return res.json({
                connected: false,
                error: 'Database not initialized',
                bookingsCount: 0
            });
        }
        
        // Test the connection
        const result = await pool.query('SELECT NOW()');
        
        // If we got here, connection is good
        // Count bookings while we're at it
        const countResult = await pool.query('SELECT COUNT(*) FROM bookings');
        const bookingsCount = parseInt(countResult.rows[0].count);
        
        return res.json({
            connected: true,
            connection: {
                host: process.env.DATABASE_URL ? '(hidden for security)' : 'localhost',
                port: 5432,
                database: process.env.DATABASE_URL ? '(hidden for security)' : 'calmarentcardb',
                ssl: !!process.env.DATABASE_URL
            },
            bookingsCount
        });
    } catch (error) {
        console.error('Database status check error:', error);
        
        return res.json({
            connected: false,
            error: error.message
        });
    }
});

// Admin API - Get all bookings
app.get('/api/admin/bookings', requireAdminAuth, async (req, res) => {
    try {
        let bookings = [];
        
        if (dbConnected && pool) {
            // Fetch from database
            const result = await pool.query('SELECT * FROM bookings ORDER BY date_submitted DESC');
            bookings = result.rows.map(booking => {
                // Convert DB structure to expected format
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
                    date_submitted: booking.date_submitted,
                    additional_driver: booking.additional_driver,
                    full_insurance: booking.full_insurance,
                    gps_navigation: booking.gps_navigation,
                    child_seat: booking.child_seat,
                    special_requests: booking.special_requests,
                    booking_data: booking.booking_data
                };
            });
        }
        
        return res.json({
            success: true,
            bookings,
            dbConnected
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        
        return res.json({
            success: false,
            error: error.message,
            bookings: []
        });
    }
});

// Admin API - Update booking status
app.put('/api/admin/bookings/:id/status', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!status) {
            return res.json({
                success: false,
                error: 'Status is required'
            });
        }
        
        if (dbConnected && pool) {
            // Update in database
            const result = await pool.query(`
                UPDATE bookings
                SET status = $1
                WHERE id = $2
                RETURNING *
            `, [status, id]);
            
            if (result.rows.length === 0) {
                return res.json({
                    success: false,
                    error: 'Booking not found'
                });
            }
            
            return res.json({
                success: true,
                booking: result.rows[0]
            });
        } else {
            return res.json({
                success: false,
                error: 'Database is not connected'
            });
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        
        return res.json({
            success: false,
            error: error.message
        });
    }
});

// Client API - Get public bookings (limited data)
app.get('/api/bookings', async (req, res) => {
    try {
        let bookings = [];
        
        if (dbConnected && pool) {
            // Fetch from database, but limit information for security
            const result = await pool.query(`
                SELECT id, booking_reference, car_make, car_model, 
                       pickup_date, return_date, status
                FROM bookings 
                ORDER BY date_submitted DESC
            `);
            
            bookings = result.rows;
        }
        
        return res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error('Error fetching public bookings:', error);
        
        return res.json({
            success: false,
            error: error.message,
            bookings: []
        });
    }
});

// Client API - Create a booking (public form)
app.post('/api/bookings', async (req, res) => {
    try {
        const booking = req.body;
        
        // Validate required fields
        if (!booking.firstName || !booking.lastName || !booking.email || !booking.pickupDate) {
            return res.json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // Create a booking reference
        const bookingRef = 'BK' + Date.now().toString().slice(-6);
        
        if (dbConnected && pool) {
            // Convert to database structure
            const result = await pool.query(`
                INSERT INTO bookings (
                    booking_reference, customer_first_name, customer_last_name, customer_email, 
                    customer_phone, customer_age, driver_license, license_expiration, country,
                    pickup_date, return_date, pickup_location, dropoff_location, 
                    car_make, car_model, daily_rate, total_price, status, 
                    date_submitted, additional_driver, full_insurance, 
                    gps_navigation, child_seat, special_requests, booking_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
                RETURNING *
            `, [
                bookingRef,
                booking.firstName,
                booking.lastName,
                booking.email,
                booking.phone,
                booking.age,
                booking.driverLicense,
                booking.licenseExpiration,
                booking.country,
                booking.pickupDate,
                booking.returnDate,
                booking.pickupLocation,
                booking.dropoffLocation,
                booking.carMake,
                booking.carModel,
                booking.dailyRate,
                booking.totalPrice,
                'pending',
                new Date(),
                booking.additionalDriver,
                booking.fullInsurance,
                booking.gpsNavigation,
                booking.childSeat,
                booking.specialRequests,
                JSON.stringify({...booking, bookingReference: bookingRef})
            ]);
            
            return res.json({
                success: true,
                booking: {
                    ...booking,
                    bookingReference: bookingRef,
                    id: result.rows[0].id,
                    status: 'pending'
                }
            });
        } else {
            // Still send success but with notice to store in localStorage
            return res.json({
                success: true,
                useLocalStorage: true,
                booking: {
                    ...booking,
                    bookingReference: bookingRef,
                    id: 'local-' + Date.now(),
                    status: 'pending'
                }
            });
        }
    } catch (error) {
        console.error('Error creating booking from public form:', error);
        
        return res.json({
            success: false,
            error: error.message
        });
    }
});

// Admin pages
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`http://localhost:${port}`);
}); 