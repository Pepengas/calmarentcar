/**
 * Database Tables Structure Checker
 * 
 * This utility checks database tables structure and reports any issues
 * that might be causing problems with the application.
 */

const { pool } = require('../database');
const { checkCarTable, addSampleCars } = require('./check-cars-table');

async function checkDatabaseTables() {
  console.log('🔍 Starting database tables check...');
  
  try {
    // Check database connection first
    try {
      const connResult = await pool.query('SELECT NOW()');
      console.log(`✅ Database connected successfully at ${connResult.rows[0].now}`);
    } catch (connError) {
      console.error('❌ Database connection error:', connError.message);
      console.log('🔒 DATABASE_URL:', process.env.DATABASE_URL 
        ? process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') // Hide password
        : 'Not set');
      console.log('⚠️ Please ensure your DATABASE_URL environment variable is properly set.');
      return false;
    }
    
    // Check if tables exist
    const tables = ['cars', 'bookings'];
    for (const table of tables) {
      try {
        const tableResult = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          );
        `, [table]);
        
        if (tableResult.rows[0].exists) {
          console.log(`✅ ${table} table exists`);
          
          // Count records
          const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
          console.log(`   - Records: ${countResult.rows[0].count}`);
        } else {
          console.error(`❌ ${table} table does not exist`);
        }
      } catch (tableError) {
        console.error(`❌ Error checking ${table} table:`, tableError.message);
      }
    }
    
    // Run specific checks for cars table
    console.log('\n=== Cars Table Detailed Check ===');
    await checkCarTable();
    
    // Check the relationship between bookings and cars
    console.log('\n=== Bookings-Cars Relationship Check ===');
    try {
      // Try the problematic join that might be causing errors
      const joinResult = await pool.query(`
        SELECT b.id, b.booking_reference, b.car_make, b.car_model, c.name AS car_name
        FROM bookings b
        LEFT JOIN cars c ON LOWER(CONCAT(b.car_make, ' ', b.car_model)) = LOWER(c.name)
        LIMIT 5
      `);
      
      console.log('✅ Join query between bookings and cars works');
      console.log(`   - Sample results: ${joinResult.rows.length} rows`);
      
      if (joinResult.rows.length > 0) {
        console.table(joinResult.rows);
      }
    } catch (joinError) {
      console.error('❌ Error with bookings-cars join:', joinError.message);
      console.log('This might be causing issues in the admin dashboard');
      
      // Show the structure of both tables to diagnose the issue
      console.log('\nBookings table structure:');
      const bookingsColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bookings'
        ORDER BY ordinal_position
      `);
      console.table(bookingsColumns.rows);
      
      console.log('\nCars table structure:');
      const carsColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'cars'
        ORDER BY ordinal_position
      `);
      console.table(carsColumns.rows);
    }
    
    console.log('\n✅ Database tables check completed');
    return true;
  } catch (error) {
    console.error('❌ Error during database check:', error);
    return false;
  } finally {
    // Close the database connection
    try {
      await pool.end();
    } catch (err) {
      console.error('❌ Error closing database connection:', err.message);
    }
  }
}

// Run the check directly if this file is executed
if (require.main === module) {
  checkDatabaseTables()
    .then(success => {
      if (success) {
        console.log('✅ Database check completed successfully');
      } else {
        console.error('❌ Database check completed with errors');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Fatal error during database check:', err);
      process.exit(1);
    });
} else {
  // Export the function if this file is required as a module
  module.exports = {
    checkDatabaseTables
  };
} 