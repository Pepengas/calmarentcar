/**
 * Database Initialization Script
 * This script reads the schema.sql file and executes it to set up the database
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Use environment variables for connection or local values for development
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Heroku Postgres
  }
});

async function initializeDatabase() {
  try {
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('Executing schema...');
      await client.query(schema);
      console.log('Database initialization completed successfully!');
    } finally {
      client.release();
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Run the initialization
initializeDatabase(); 