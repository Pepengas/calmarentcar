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
        
        // Create cars table with monthly_pricing
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cars (
                id SERIAL PRIMARY KEY,
                car_id TEXT UNIQUE,
                make TEXT,
                model TEXT,
                category TEXT,
                specifications JSONB,
                monthly_pricing JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Cars table created successfully.');

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
                stripe_session_id TEXT UNIQUE,
                status TEXT DEFAULT 'pending',
                date_submitted TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Bookings table created successfully.');

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