# Connecting Your Railway PostgreSQL Database

This guide will help you connect your PostgreSQL database in Railway to your Calma Car Rental website application.

## Step 1: Get Your PostgreSQL Connection String

1. In the Railway dashboard, click on your PostgreSQL database.
2. Click on the "Connect" tab.
3. Look for the "PostgreSQL Connection URL" - it should look something like:
   ```
   postgresql://postgres:password@containers-us-west-X.railway.app:5432/railway
   ```
4. Copy this connection string.

## Step 2: Configure Your Web Application Service

1. Go back to your Railway dashboard and click on your web application service (calmarentcar).
2. Click on the "Variables" tab.
3. Add a new environment variable:
   - Key: `DATABASE_URL`
   - Value: Paste the PostgreSQL connection string you copied earlier.
4. Click "Add" to save the environment variable.
5. Railway will automatically restart your application with the new environment variable.

## Step 3: Run the Database Test Script

If your application doesn't automatically create the database tables, you can use the `test-db-connection.js` script to set them up:

1. In Railway, go to your web application service (calmarentcar).
2. Click on the "Shell" tab.
3. Run the following command:
   ```
   node test-db-connection.js
   ```
4. This script will:
   - Test the connection to the database
   - Create the necessary tables if they don't exist
   - Add a sample booking for testing purposes

## Step 4: Verify the Connection in Your Admin Panel

1. Visit your admin panel at `https://your-railway-app-url.app/admin-new`
2. Check the "Database Status" indicator in the top-right corner:
   - Green: Connected to PostgreSQL
   - Red: Not connected
3. For more details, navigate to the "Database Diagnostic" section in the sidebar

## Troubleshooting

### No Tables Showing in Railway Dashboard

- Even after your application connects and creates tables, it might take a few minutes for the Railway dashboard to update and show them.
- You can refresh the page or check again later.

### Connection Errors

If your application can't connect to the database:

1. Double-check that the `DATABASE_URL` environment variable is correctly set.
2. Ensure the SSL configuration in your code matches Railway's requirements:
   ```javascript
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: {
       rejectUnauthorized: false
     }
   });
   ```

### Manually Testing the Connection

If you need to test the database connection manually:

1. Install the PostgreSQL client on your local machine.
2. Use the connection string to connect:
   ```
   psql "your-connection-string-here"
   ```
3. Once connected, you can check for tables with:
   ```sql
   \dt
   ```

## What's Next?

After successfully connecting your database:

1. Try creating a booking through your website's booking form.
2. Check the admin panel to see if the booking appears.
3. Test the migration feature if you have existing bookings in localStorage.

If you need any additional help, refer to the [Railway PostgreSQL documentation](https://docs.railway.app/databases/postgresql) or contact support. 