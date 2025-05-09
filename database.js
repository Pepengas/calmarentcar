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

module.exports = {
  pool,
  registerCreateTables
}; 