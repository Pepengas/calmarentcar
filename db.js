const { Pool } = require('pg');

// Use environment variables for connection or local values for development
const connectionString = process.env.DATABASE_URL;

// If using Heroku, SSL is required but needs to be disabled for local dev
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Heroku Postgres
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Override client.query to log queries
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };
    
    // Override client.release to keep track of queries
    client.release = () => {
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  }
}; 