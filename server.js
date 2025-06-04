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
                booster_seat BOOLEAN,
                special_requests TEXT,
                status TEXT DEFAULT 'pending',
                date_submitted TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Bookings table created successfully.');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS manual_blocks (
                id SERIAL PRIMARY KEY,
                car_id TEXT REFERENCES cars(car_id),
                start_date DATE,
                end_date DATE,
                UNIQUE(car_id, start_date, end_date)
            )
        `);
        console.log('✅ Manual blocks table created successfully.');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
}

// Register the createTables function with the database module
registerCreateTables(createTables);

// Migration: Add car_id to bookings and backfill
async function migrateAddCarIdToBookings() {
    try {
        if (!global.dbConnected) {
            console.warn('⚠️ Cannot run migration: database not connected');
            return;
        }
        // Add car_id column if it doesn't exist
        await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS car_id TEXT`);
        console.log('✅ Migration: car_id column ensured in bookings table.');
        // Backfill car_id for existing bookings
        const bookings = (await pool.query('SELECT id, car_make, car_model FROM bookings WHERE car_id IS NULL'))?.rows || [];
        if (bookings.length === 0) {
            console.log('✅ Migration: All bookings already have car_id.');
            return;
        }
        for (const booking of bookings) {
            // Try to find car_id by matching car_make and car_model to cars table
            const carRes = await pool.query(
                `SELECT car_id FROM cars WHERE LOWER(make) = LOWER($1) AND LOWER(model) = LOWER($2) LIMIT 1`,
                [booking.car_make, booking.car_model]
            );
            if (carRes.rows.length > 0) {
                const car_id = carRes.rows[0].car_id;
                await pool.query('UPDATE bookings SET car_id = $1 WHERE id = $2', [car_id, booking.id]);
                console.log(`✅ Backfilled car_id for booking id=${booking.id}: ${car_id}`);
            } else {
                console.warn(`⚠️ Could not find car_id for booking id=${booking.id} (${booking.car_make} ${booking.car_model})`);
            }
        }
        console.log('✅ Migration: car_id backfill complete.');
    } catch (err) {
        console.error('❌ Migration error (add car_id to bookings):', err);
    }
}

// Migration: Add booster_seat column
async function migrateAddBoosterSeatToBookings() {
    try {
        if (!global.dbConnected) {
            console.warn('⚠️ Cannot run migration: database not connected');
            return;
        }
        await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booster_seat BOOLEAN DEFAULT false`);
        console.log('✅ Migration: booster_seat column ensured in bookings table.');
    } catch (err) {
        console.error('❌ Migration error (add booster_seat to bookings):', err);
    }
}

// Create tables when database is connected
if (global.dbConnected) {
    createTables();
    migrateAddCarIdToBookings();
    migrateAddBoosterSeatToBookings();
}

// Ensure a manual block exists for confirmed bookings and remove it otherwise
async function syncManualBlockWithBooking(booking) {
    if (!booking || !booking.car_id || !booking.pickup_date || !booking.return_date) return;
    try {
        if (booking.status === 'confirmed') {
            await pool.query(
                `INSERT INTO manual_blocks (car_id, start_date, end_date)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (car_id, start_date, end_date) DO NOTHING`,
                [booking.car_id, booking.pickup_date, booking.return_date]
            );
        } else {
            await pool.query(
                'DELETE FROM manual_blocks WHERE car_id = $1 AND start_date = $2 AND end_date = $3',
                [booking.car_id, booking.pickup_date, booking.return_date]
            );
        }
    } catch (err) {
        console.error('[ManualBlock] sync error:', err.message);
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

// --- Addons In-Memory Store and API ---
let addons = [
  { id: 'child-seat', name: 'Child Seat', price: 7.5 },
  { id: 'booster-seat', name: 'Booster Seat', price: 5.0 }
];

// Get all addons
app.get('/api/admin/addons', (req, res) => {
  res.json({ success: true, addons });
});

// Public endpoint to fetch addon prices
app.get('/api/addons', (req, res) => {
  res.json({ success: true, addons });
});

// Update an addon by ID
app.patch('/api/admin/addons/:id', (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  const addon = addons.find(a => a.id === id);
  if (!addon) return res.status(404).json({ success: false, error: 'Addon not found' });
  if (name !== undefined) addon.name = name;
  if (price !== undefined && !isNaN(price)) addon.price = parseFloat(price);
  res.json({ success: true });
});

/**
 * API Routes
 */

// Create a new booking (POST /api/bookings)
app.post('/api/bookings', async (req, res) => {
    try {
        const booking = req.body;
        console.log('--- Incoming booking request ---');
        console.log('Payload:', JSON.stringify(booking, null, 2));
        
        // Calculate total price
        let total_price = null;
        try {
            total_price = await calculateTotalPrice(
                booking.car_id,
                booking.pickup_date,
                booking.return_date
            );
            console.log(`[Booking] Calculated total_price: ${total_price} for car_id=${booking.car_id}`);
        } catch (err) {
            console.error(`[Booking] Error in calculateTotalPrice:`, err.message);
        }

        // Get the daily rate for the pickup month
        let daily_rate = null;
        let pickup_month = null;
        try {
            pickup_month = new Date(booking.pickup_date).toISOString().slice(0, 7);
            const rateResult = await pool.query(
                'SELECT monthly_pricing FROM cars WHERE car_id = $1',
                [booking.car_id]
            );
            if (rateResult.rows.length === 0) {
                console.error(`[Booking] No car found for car_id=${booking.car_id}`);
            } else {
                daily_rate = rateResult.rows[0].monthly_pricing[pickup_month];
                console.log(`[Booking] Fetched daily_rate for month ${pickup_month}:`, daily_rate);
            }
        } catch (err) {
            console.error(`[Booking] Error fetching daily_rate:`, err.message);
        }

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
                booster_seat, special_requests
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
            booking.booster_seat || false,
            booking.special_requests || null
        ]);

        console.log('✅ Booking saved to database successfully, reference:', bookingRef);

        if (insertResult.rows && insertResult.rows.length > 0) {
            await syncManualBlockWithBooking(insertResult.rows[0]);
        }

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
                child_seat: booking.child_seat,
                booster_seat: booking.booster_seat
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
                    licenseExpiry: booking.license_expiration,
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
                booster_seat: booking.booster_seat,
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

        if (result.rows.length > 0) {
            await syncManualBlockWithBooking(result.rows[0]);
        }
        
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

// Update booking details (admin only)
app.patch('/api/admin/bookings/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const allowed = [
            'customer_first_name','customer_last_name','customer_email','customer_phone',
            'pickup_date','return_date','pickup_location','dropoff_location',
            'car_make','car_model','status','child_seat','booster_seat','special_requests'
        ];
        const fields = [];
        const values = [];
        let idx = 1;
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(req.body[key]);
            }
        }
        if (fields.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        values.push(id);
        const query = `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        await syncManualBlockWithBooking(result.rows[0]);

        return res.json({ success: true, booking: result.rows[0] });
    } catch (error) {
        console.error('Error updating booking:', error);
        return res.status(500).json({ success: false, error: error.message });
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
        
        // Get booking data before deletion (for logging purposes)
        const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
        
        if (bookingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        
        const bookingRow = bookingResult.rows[0];
        const bookingRef = bookingRow.booking_reference;
        
        // Delete the booking
        await pool.query('DELETE FROM bookings WHERE id = $1', [id]);

        await syncManualBlockWithBooking({ ...bookingRow, status: 'deleted' });
        
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
        const cars = result.rows.map(car => {
            // Parse unavailable_dates if present
            let unavailable_dates = car.unavailable_dates;
            if (unavailable_dates && typeof unavailable_dates === 'string') {
                try { unavailable_dates = JSON.parse(unavailable_dates); } catch {}
            }
            return {
                id: car.car_id, // map car_id to id
                name: car.name,
                description: car.description,
                image: car.image,
                category: car.category,
                features: car.features,
                monthly_pricing: car.monthly_pricing,
                available: car.available,
                specs: car.specs,
                manual_status: car.manual_status,
                unavailable_dates: unavailable_dates || []
            };
        });
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
app.get('/api/cars/availability', async (req, res) => {
    try {
        const { carId, pickupDate, dropoffDate } = req.query;
        
        if (!carId || !pickupDate || !dropoffDate) {
            return res.status(400).json({
                success: false,
                error: "Missing required parameters: carId, pickupDate, or dropoffDate"
            });
        }

        // Get car data from database
        const result = await pool.query(
            'SELECT manual_status, unavailable_dates FROM cars WHERE car_id = $1',
            [carId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Car not found"
            });
        }

        const car = result.rows[0];
        
        // Check manual status first
        if (car.manual_status === 'unavailable') {
            return res.json({
                success: true,
                available: false,
                message: "This car is currently unavailable"
            });
        }

        // If manual status is 'available', skip date checks
        if (car.manual_status === 'available') {
            return res.json({
                success: true,
                available: true,
                message: "Car is available for the selected dates"
            });
        }

        const userPickup = new Date(pickupDate);
        const userDropoff = new Date(dropoffDate);

        // Check unavailable dates if they exist
        if (car.unavailable_dates && Array.isArray(car.unavailable_dates)) {
            for (const range of car.unavailable_dates) {
                const rangeStart = new Date(range.start);
                const rangeEnd = new Date(range.end);

                if (userDropoff >= rangeStart && userPickup <= rangeEnd) {
                    return res.json({
                        success: true,
                        available: false,
                        message: "Car is unavailable for the selected dates"
                    });
                }
            }
        }

        // Check manual blocks
        const blocksRes = await pool.query(
            'SELECT start_date, end_date FROM manual_blocks WHERE car_id = $1',
            [carId]
        );
        for (const b of blocksRes.rows) {
            const rangeStart = new Date(b.start_date);
            const rangeEnd = new Date(b.end_date);
            if (userDropoff >= rangeStart && userPickup <= rangeEnd) {
                return res.json({
                    success: true,
                    available: false,
                    message: 'Car is unavailable for the selected dates'
                });
            }
        }

        // Check existing bookings
        const bookingsRes = await pool.query(
            "SELECT pickup_date, return_date FROM bookings WHERE car_id = $1 AND status IN ('pending','confirmed','completed')",
            [carId]
        );
        for (const b of bookingsRes.rows) {
            const rangeStart = new Date(b.pickup_date);
            const rangeEnd = new Date(b.return_date);
            if (userDropoff >= rangeStart && userPickup <= rangeEnd) {
                return res.json({
                    success: true,
                    available: false,
                    message: 'Car is unavailable for the selected dates'
                });
            }
        }

        // If we get here, the car is available
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

// Get price for a specific car, month, and duration
app.get('/api/get-price', async (req, res) => {
    try {
        const { car_id, month, days } = req.query;
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
        const monthPricing = monthlyPricing[month];
        if (!monthPricing) {
            return res.status(404).json({
                success: false,
                error: 'Price not found for specified month'
            });
        }
        let total = null;
        let nDays = parseInt(days);
        if (!nDays || nDays < 1) nDays = 1;
        if (nDays <= 7) {
            // Use 'day_N' keys for 1-7 days
            total = monthPricing[`day_${nDays}`] || null;
        } else {
            // Use 'day_7' + (nDays-7)*extra_day for longer rentals
            if (monthPricing['day_7'] && monthPricing['extra_day']) {
                total = monthPricing['day_7'] + (nDays - 7) * monthPricing['extra_day'];
            } else {
                total = null;
            }
        }
        if (total === null) {
            console.error(`[get-price] No price for car_id=${car_id}, month=${month}, days=${nDays}`);
            return res.status(404).json({
                success: false,
                error: 'Price not found for specified duration'
            });
        }
        res.json({
            success: true,
            total_price: total
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
            [JSON.stringify(prices), car_id]
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
    // Fetch monthly_pricing once for the car
    const carResult = await pool.query(
        'SELECT monthly_pricing FROM cars WHERE car_id = $1',
        [car_id]
    );
    if (carResult.rows.length === 0) {
        console.error(`[calculateTotalPrice] Car not found: car_id=${car_id}`);
        throw new Error('Car not found');
    }
    const monthlyPricing = carResult.rows[0].monthly_pricing;

    const pickup = new Date(pickup_date);
    const return_date_obj = new Date(return_date);
    // Calculate total days (inclusive)
    const totalDays = Math.ceil((return_date_obj - pickup) / (1000 * 60 * 60 * 24)) + 1;
    let total_price = 0;
    // If rental is 1-7 days, use package price
    if (totalDays <= 7) {
        const month = pickup.toISOString().slice(0, 7);
        const monthPricing = monthlyPricing[month];
        if (!monthPricing) {
            console.error(`[calculateTotalPrice] No pricing for month: ${month}`);
            throw new Error(`No price found for month ${month}`);
        }
        let packagePrice = monthPricing[`day_${totalDays}`] || monthPricing[totalDays] || monthPricing['day_1'] || monthPricing['1'];
        if (!packagePrice) {
            console.error(`[calculateTotalPrice] No package price for ${totalDays} days in month ${month}`);
            throw new Error(`No package price for ${totalDays} days in month ${month}`);
        }
        total_price = packagePrice;
    } else {
        // For rentals >7 days, use day_7 + (N-7)*extra_day
        const month = pickup.toISOString().slice(0, 7);
        const monthPricing = monthlyPricing[month];
        if (!monthPricing) {
            console.error(`[calculateTotalPrice] No pricing for month: ${month}`);
            throw new Error(`No price found for month ${month}`);
        }
        let basePrice = monthPricing['day_7'] || monthPricing[7] || monthPricing['day_1'] || monthPricing['1'];
        let extraDayPrice = monthPricing['extra_day'] || monthPricing['extraDay'];
        if (!basePrice || !extraDayPrice) {
            console.error(`[calculateTotalPrice] No base or extra day price for month: ${month}`);
            throw new Error(`No base or extra day price for month ${month}`);
        }
        total_price = basePrice + (totalDays - 7) * extraDayPrice;
    }
    // Log calculation for debugging
    console.log(`[calculateTotalPrice] car_id=${car_id}, pickup=${pickup_date}, return=${return_date}, total_price=${total_price}`);
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

// Admin: Get a single car by ID (with specs)
app.get('/api/admin/car/:id', requireAdminAuth, async (req, res) => {
    const carId = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM cars WHERE car_id = $1', [carId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Car not found' });
        }
        const car = result.rows[0];
        // Parse unavailable_dates if present
        if (car.unavailable_dates && typeof car.unavailable_dates === 'string') {
            try { car.unavailable_dates = JSON.parse(car.unavailable_dates); } catch {}
        }
        return res.json({ success: true, car });
    } catch (error) {
        console.error(`[ADMIN] Error fetching car ${carId}:`, error);
        return res.status(500).json({ success: false, error: 'Failed to fetch car' });
    }
});

// Admin: Update a single car (specs and other fields)
app.patch('/api/admin/car/:id', requireAdminAuth, async (req, res) => {
    const carId = req.params.id;
    const { name, description, image, category, features, specs, available } = req.body;
    try {
        // Build dynamic update query
        const fields = [];
        const values = [];
        let idx = 1;
        if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
        if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
        if (image !== undefined) { fields.push(`image = $${idx++}`); values.push(image); }
        if (category !== undefined) { fields.push(`category = $${idx++}`); values.push(category); }
        if (features !== undefined) { fields.push(`features = $${idx++}`); values.push(JSON.stringify(features)); }
        if (specs !== undefined) { fields.push(`specs = $${idx++}`); values.push(JSON.stringify(specs)); }
        if (available !== undefined) { fields.push(`available = $${idx++}`); values.push(available); }
        if (fields.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        values.push(carId);
        const query = `UPDATE cars SET ${fields.join(', ')}, updated_at = NOW() WHERE car_id = $${idx}`;
        await pool.query(query, values);
        console.log(`[ADMIN] Updated car ${carId}:`, fields.join(', '));
        return res.json({ success: true });
    } catch (error) {
        console.error(`[ADMIN] Error updating car ${carId}:`, error);
        return res.status(500).json({ success: false, error: 'Failed to update car' });
    }
});

// Admin: Set manual status for a car
app.post('/api/admin/car/:id/manual-status', requireAdminAuth, async (req, res) => {
    const carId = req.params.id;
    const { manual_status, unavailable_dates } = req.body;
    const validStatuses = ['automatic', 'available', 'unavailable'];

    if (!validStatuses.includes(manual_status)) {
        return res.status(400).json({ success: false, error: 'Invalid manual_status value' });
    }

    try {
        await pool.query(
            'UPDATE cars SET manual_status = $1, unavailable_dates = $2 WHERE car_id = $3',
            [manual_status, JSON.stringify(unavailable_dates || []), carId]
        );
        return res.json({ success: true });
    } catch (error) {
        console.error(`[ADMIN] Error updating manual_status/unavailable_dates for car ${carId}:`, error);
        return res.status(500).json({ success: false, error: 'Failed to update manual status/unavailable dates' });
    }
});

// Admin: Update car pricing (monthly_pricing JSONB)
app.patch('/api/admin/car/:carId/pricing', requireAdminAuth, async (req, res) => {
    const { carId } = req.params;
    const { monthly_pricing } = req.body;

    if (!monthly_pricing) {
        return res.status(400).json({ success: false, error: 'Missing monthly_pricing data' });
    }

    try {
        const result = await pool.query(
            'UPDATE cars SET monthly_pricing = $1, updated_at = NOW() WHERE car_id = $2 RETURNING *',
            [monthly_pricing, carId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Car not found' });
        }
        res.json({ success: true, car: result.rows[0] });
    } catch (err) {
        console.error('Error updating car pricing:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Admin: Get car availability with booked and manual blocks
app.get('/api/admin/cars/availability', requireAdminAuth, async (req, res) => {
    try {
        if (!global.dbConnected) {
            return res.status(503).json({
                success: false,
                error: 'Database not connected',
                cars: []
            });
        }
        // Get all cars
        const carsResult = await pool.query('SELECT * FROM cars');
        const cars = carsResult.rows;
        console.log('[DEBUG] Cars from database:', cars.map(c => ({ id: c.id, car_id: c.car_id, name: c.name })));
        
        // Get all bookings with relevant statuses
        const bookingsResult = await pool.query(
            `SELECT car_make, car_model, pickup_date, return_date, status FROM bookings WHERE status IN ('pending', 'confirmed', 'completed')`
        );
        const bookings = bookingsResult.rows;
        // Get all manual blocks
        const manualBlocksResult = await pool.query('SELECT * FROM manual_blocks');
        const manualBlocks = manualBlocksResult.rows;
        console.log('[DEBUG] Manual blocks from database:', manualBlocks);
        
        // Build availability info for each car
        const carsWithAvailability = cars.map(car => {
            // Merge manual blocks from manual_blocks table
            const carManualBlocks = manualBlocks.filter(b => b.car_id === car.car_id).map(b => ({ id: b.id, start: b.start_date, end: b.end_date }));
            console.log(`[DEBUG] Car ${car.name} (${car.car_id}) has ${carManualBlocks.length} manual blocks:`, carManualBlocks);
            
            // Get bookings for this car by matching car.name to booking.car_make (case-insensitive)
            const carBookings = bookings.filter(b =>
                b.car_make && car.name && b.car_make.toLowerCase() === car.name.toLowerCase()
            );
            const bookedRanges = carBookings.map(b => ({ start: b.pickup_date, end: b.return_date, status: b.status }));
            return {
                id: car.car_id,
                name: car.name,
                manual_status: car.manual_status,
                manual_blocks: carManualBlocks,
                booked_ranges: bookedRanges,
                category: car.category,
                specs: car.specs,
                available: car.available
            };
        });
        return res.json({
            success: true,
            cars: carsWithAvailability
        });
    } catch (error) {
        console.error('[ADMIN] Error fetching car availability:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            cars: []
        });
    }
});

// Public: Get car availability for all cars (for car selection page)
app.get('/api/cars/availability/all', async (req, res) => {
    try {
        if (!global.dbConnected) {
            return res.status(503).json({
                success: false,
                error: 'Database not connected',
                cars: []
            });
        }
        // Get all cars
        const carsResult = await pool.query('SELECT * FROM cars');
        const cars = carsResult.rows;
        // Get all bookings with relevant statuses (by car_id)
        let bookingsResult;
        try {
            bookingsResult = await pool.query(
                `SELECT car_id, car_make, car_model, pickup_date, return_date, status FROM bookings WHERE status IN ('pending', 'confirmed')`
            );
        } catch (err) {
            console.error('[PUBLIC] Error fetching bookings:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch bookings.',
                cars: []
            });
        }
        const bookings = bookingsResult.rows;
        // Get all manual blocks
        const manualBlocksResult = await pool.query('SELECT * FROM manual_blocks');
        const manualBlocks = manualBlocksResult.rows;
        // Build availability info for each car
        const carsWithAvailability = cars.map(car => {
            // Merge manual blocks from manual_blocks table
            const carManualBlocks = manualBlocks.filter(b => b.car_id === car.car_id).map(b => ({ id: b.id, start: b.start_date, end: b.end_date }));
            // Match bookings by car_id
            const carBookings = bookings.filter(b => b.car_id && car.car_id && b.car_id === car.car_id);
            const bookedRanges = carBookings.map(b => ({ start: b.pickup_date, end: b.return_date, status: b.status }));
            return {
                id: car.car_id,
                name: car.name,
                manual_status: car.manual_status,
                manual_blocks: carManualBlocks,
                booked_ranges: bookedRanges,
                category: car.category,
                specs: car.specs,
                available: car.available,
                image: car.image,
                features: car.features
            };
        });
        return res.json({
            success: true,
            cars: carsWithAvailability
        });
    } catch (error) {
        console.error('[PUBLIC] Error fetching car availability:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            cars: []
        });
    }
});

// Add manual block for a car (admin only)
app.post('/api/admin/manual-block', requireAdminAuth, async (req, res) => {
    const { car_id, start_date, end_date } = req.body;
    console.log('[DEBUG] /api/admin/manual-block received request');
    console.log('[DEBUG] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[DEBUG] Headers:', JSON.stringify(req.headers, null, 2));
    
    if (!car_id || !start_date || !end_date) {
        console.error('[DEBUG] Missing required fields:', { car_id, start_date, end_date });
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // First verify the car exists and log its details
        const carCheck = await pool.query('SELECT id, car_id, name FROM cars WHERE car_id = $1', [car_id]);
        console.log('[DEBUG] Car check result:', carCheck.rows);
        
        if (carCheck.rows.length === 0) {
            console.error('[DEBUG] Car not found:', car_id);
            return res.status(404).json({ success: false, error: 'Car not found' });
        }

        // Insert the manual block
        const result = await pool.query(
            `INSERT INTO manual_blocks (car_id, start_date, end_date)
             VALUES ($1, $2, $3)
             ON CONFLICT (car_id, start_date, end_date) DO NOTHING
             RETURNING *`,
            [car_id, start_date, end_date]
        );

        if (result.rows.length > 0) {
            console.log('[DEBUG] Manual block created successfully:', result.rows[0]);
            return res.json({ success: true, block: result.rows[0] });
        }

        return res.json({ success: true, message: 'Block already exists' });
    } catch (error) {
        console.error('[DEBUG] Error adding manual block:', error);
        console.error('[DEBUG] Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        return res.status(500).json({ success: false, error: 'Failed to add manual block' });
    }
});

// Get all manual blocks (public)
app.get('/api/manual-blocks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM manual_blocks');
        return res.json({ success: true, blocks: result.rows });
    } catch (error) {
        console.error('[PUBLIC] Error fetching manual blocks:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch manual blocks' });
    }
});

// Delete a manual block by ID (admin only)
app.delete('/api/admin/manual-block/:id', requireAdminAuth, async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Missing block ID' });
    }
    try {
        await pool.query('DELETE FROM manual_blocks WHERE id = $1', [id]);
        return res.json({ success: true });
    } catch (error) {
        console.error('[ADMIN] Error deleting manual block:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete manual block' });
    }
});

// Start server
async function startServerWithMigrations() {
    console.log('🚀 Starting server...');
    if (global.dbConnected) {
        await createTables();
        await migrateAddCarIdToBookings();
        await migrateAddBoosterSeatToBookings();
    }

    // Register all routes only after migrations are complete

    // --- API Routes ---
    // (Paste all app.get, app.post, etc. route definitions here)

    // ... (all route definitions from above) ...

    // Start Express server only after routes are registered
    app.listen(port, () => {
        console.log(`📡 Server running on port ${port}`);
        console.log(`🌐 Visit: http://localhost:${port}`);
        console.log(`📊 Database connected: ${global.dbConnected ? 'Yes ✅' : 'No ❌'}`);
        if (!global.dbConnected) {
            console.warn('⚠️ Server running without database connection. Some features will be limited.');
        }
    });
}

startServerWithMigrations().catch(err => {
    console.error('❌ Failed to start server:', err);
}); 