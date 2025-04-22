/**
 * Test script to insert a booking directly into the database
 */

const db = require('./db');

async function createTestBooking() {
  try {
    console.log('Connecting to database...');
    
    // First, check if cars table has data
    const carsCheck = await db.query('SELECT id FROM cars LIMIT 1');
    if (carsCheck.rows.length === 0) {
      console.log('No cars found in database. Please run init-db.js first.');
      return;
    }
    
    const carId = carsCheck.rows[0].id;
    console.log(`Found car with ID: ${carId}`);
    
    // Insert a test booking
    const query = `
      INSERT INTO bookings (
        car_id, 
        pickup_location, 
        dropoff_location, 
        pickup_date, 
        pickup_time, 
        dropoff_date, 
        dropoff_time, 
        customer_name, 
        customer_email, 
        customer_phone, 
        customer_age,
        additional_requests,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `;
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const values = [
      carId,
      'Chania Airport',
      'Chania City Center',
      today.toISOString().split('T')[0], // today's date
      '10:00',
      tomorrow.toISOString().split('T')[0], // tomorrow's date
      '10:00',
      'Test User',
      'test@example.com',
      '+30123456789',
      25,
      'This is a test booking created directly via script',
      'confirmed'
    ];
    
    const result = await db.query(query, values);
    console.log(`Test booking created successfully with ID: ${result.rows[0].id}`);
    
    // Verify bookings can be retrieved
    const bookingsCheck = await db.query(`
      SELECT 
        b.id, 
        b.car_id,
        c.name as car_name,
        b.pickup_location, 
        b.dropoff_location, 
        b.pickup_date, 
        b.pickup_time, 
        b.dropoff_date, 
        b.dropoff_time, 
        b.customer_name, 
        b.customer_email, 
        b.customer_phone, 
        b.customer_age,
        b.additional_requests,
        b.status,
        b.created_at,
        b.updated_at
      FROM 
        bookings b
      JOIN 
        cars c ON b.car_id = c.id
      ORDER BY 
        b.created_at DESC
    `);
    
    console.log(`Retrieved ${bookingsCheck.rows.length} bookings from database.`);
    if (bookingsCheck.rows.length > 0) {
      console.log('First booking:', bookingsCheck.rows[0]);
    }
    
  } catch (error) {
    console.error('Error creating test booking:', error);
  } finally {
    process.exit();
  }
}

createTestBooking(); 