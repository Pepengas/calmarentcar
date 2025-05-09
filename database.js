require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message);
    global.dbConnected = false;
  } else {
    console.log('✅ Connected to DB at:', res.rows[0].now);
    global.dbConnected = true;
  }
});

module.exports = pool; 