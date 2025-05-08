/**
 * Test Database Connection Script
 * This script tests the connection to the PostgreSQL database and creates tables if needed
 */

const { Pool } = require('pg');
require('dotenv').config();

// Get the DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: No DATABASE_URL environment variable found');
  console.log('Please make sure you have set the DATABASE_URL environment variable in Railway');
  console.log('Or create a .env file with DATABASE_URL=your_connection_string');
  process.exit(1);
}

console.log('Attempting to connect to PostgreSQL database...');
console.log(`Connection string found: ${connectionString.replace(/:[^:]*@/, ':****@')}`);

// Create a new Pool instance
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Railway SSL connections
  }
});

// Test the connection
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Successfully connected to PostgreSQL database!');
    console.log(`Server time: ${result.rows[0].now}`);
    
    // Create tables if they don't exist
    await createTables(client);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error connecting to the database:');
    console.error(error.message);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Create tables if they don't exist
async function createTables(client) {
  try {
    console.log('Checking if tables exist...');
    
    // Check if bookings table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings'
      )
    `);
    
    if (tableCheckResult.rows[0].exists) {
      console.log('Tables already exist. No need to create them.');
      
      // Count the number of bookings
      const countResult = await client.query('SELECT COUNT(*) FROM bookings');
      console.log(`There are ${countResult.rows[0].count} bookings in the database.`);
      return;
    }
    
    console.log('Creating tables...');
    
    // Create bookings table
    await client.query(`
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
    
    console.log('Tables created successfully!');
    
    // Create a sample booking for testing
    console.log('Creating a sample booking...');
    
    const bookingRef = 'BK' + Date.now().toString().slice(-6);
    
    await client.query(`
      INSERT INTO bookings (
        booking_reference, customer_first_name, customer_last_name, customer_email, 
        customer_phone, customer_age, driver_license, license_expiration, country,
        pickup_date, return_date, pickup_location, dropoff_location, 
        car_make, car_model, daily_rate, total_price, status, 
        payment_date, date_submitted, additional_driver, full_insurance, 
        gps_navigation, child_seat, special_requests, booking_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
    `, [
      bookingRef, 
      'John', 
      'Doe', 
      'john.doe@example.com',
      '+30 123 456 7890',
      '35',
      'DL123456789',
      new Date(new Date().getFullYear() + 2, 0, 1),
      'Greece',
      new Date(),
      new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      'Athens Airport',
      'Athens Airport',
      'Toyota',
      'Corolla',
      45,
      225,
      'confirmed',
      new Date(),
      new Date(),
      true,
      true,
      false,
      false,
      'Please have the car ready early in the morning.',
      JSON.stringify({
        booking_reference: bookingRef,
        customer: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+30 123 456 7890',
          age: '35',
          driverLicense: 'DL123456789',
          licenseExpiration: new Date(new Date().getFullYear() + 2, 0, 1),
          country: 'Greece'
        },
        carMake: 'Toyota',
        carModel: 'Corolla',
        additionalDriver: true,
        fullInsurance: true,
        gpsNavigation: false,
        childSeat: false
      })
    ]);
    
    console.log(`Sample booking created with reference: ${bookingRef}`);
    
  } catch (error) {
    console.error('Error creating tables:');
    console.error(error.message);
    throw error;
  }
}

// Run the test
testConnection().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 