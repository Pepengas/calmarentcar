require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Will be set by server.js
let createTablesFunction = null;

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message);
    global.dbConnected = false;
  } else {
    console.log('✅ Connected to DB at:', res.rows[0].now);
    global.dbConnected = true;
    
    // Call createTables() if it has been set
    if (typeof createTablesFunction === 'function') {
      console.log('🔄 Automatically creating database tables...');
      createTablesFunction();
    }
  }
});

// Register the createTables function
const registerCreateTables = (fn) => {
  createTablesFunction = fn;
  
  // If already connected, create tables immediately
  if (global.dbConnected && typeof createTablesFunction === 'function') {
    console.log('🔄 Automatically creating database tables...');
    createTablesFunction();
  }
};

// Create database tables if they don't exist
async function createTables() {
    try {
        if (!global.dbConnected) {
            console.warn('⚠️ Cannot create tables: database not connected');
            return;
        }
        
        // Create cars table using the canonical schema
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cars (
                id SERIAL PRIMARY KEY,
                car_id TEXT UNIQUE,
                name TEXT,
                description TEXT,
                image TEXT,
                category TEXT,
                features JSONB DEFAULT '[]',
                specs JSONB DEFAULT '{}'::jsonb,
                monthly_pricing JSONB DEFAULT '{}'::jsonb,
                manual_status TEXT DEFAULT 'automatic',
                unavailable_dates JSONB DEFAULT '[]',
                available BOOLEAN DEFAULT true,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Cars table created/verified successfully.');

        // Create bookings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                booking_reference TEXT UNIQUE,
                car_id TEXT REFERENCES cars(car_id),
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
                daily_rate NUMERIC,
                total_price NUMERIC,
                additional_driver BOOLEAN,
                full_insurance BOOLEAN,
                gps_navigation BOOLEAN,
                child_seat BOOLEAN,
                booster_seat BOOLEAN,
                special_requests TEXT,
                status TEXT DEFAULT 'pending',
                confirmation_email_sent BOOLEAN DEFAULT false,
                date_submitted TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Bookings table created/verified successfully.');

        // Ensure confirmation_email_sent column exists even if table was created previously
        await pool.query(
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_email_sent BOOLEAN DEFAULT false`
        );

        await pool.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Admins table created successfully.');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
}

module.exports = {
  pool,
  registerCreateTables
}; 