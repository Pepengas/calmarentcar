# Setting Up PostgreSQL Database on Railway

This guide will help you set up a PostgreSQL database for your Calma Car Rental website on Railway.

## Prerequisites

- A Railway account (https://railway.app/)
- Your project already deployed on Railway

## Steps to Set Up the Database

### 1. Create a PostgreSQL Database in Railway

1. Log in to your Railway dashboard (https://railway.app/dashboard)
2. Click on your project that contains the Calma Car Rental website
3. Click "New" and select "Database" from the dropdown menu
4. Select "PostgreSQL" as the database type
5. Railway will automatically provision a new PostgreSQL database
6. Wait for the database to be created (this may take a minute)

### 2. Find Your Database Connection String

1. Once the database is created, click on it in your project
2. Go to the "Connect" tab
3. Find the "PostgreSQL Connection URL" - It should look something like:
   ```
   postgresql://postgres:password@containers-us-west-X.railway.app:5432/railway
   ```
4. Copy this connection string - you'll need it for the next step

### 3. Set Up Environment Variables

1. Go back to your website service in Railway
2. Click on the "Variables" tab
3. Add a new environment variable:
   - Key: `DATABASE_URL`
   - Value: Paste the PostgreSQL connection string you copied earlier
4. Click "Add" to save the environment variable

### 4. Verify Database Connection

Your application should now automatically connect to the PostgreSQL database. You can verify this by:

1. Going to the "Logs" tab of your website service
2. Looking for a message like: "Successfully connected to PostgreSQL database at: [timestamp]"
3. Visit your admin panel and try creating a sample booking - it should now be saved to the database

### 5. Test Database Migration

Once your database is connected, you should be able to migrate local bookings to the database:

1. Open the admin panel in your browser
2. If you have any bookings in localStorage, click the "Migrate Data" button
3. This should transfer all your local bookings to the PostgreSQL database

### Troubleshooting

- If you see errors about SSL certificates, make sure your connection string uses SSL
- Railway uses a secure connection, so ensure your app includes the necessary SSL configuration
- If migration fails, check the console for specific error messages

## How To Use PostgreSQL Locally for Development

If you want to test your database connections locally:

1. Install PostgreSQL on your local machine
2. Create a local database called `calmarentcardb`
3. Create a `.env` file in your project root with:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/calmarentcardb
NODE_ENV=development
PORT=3000
```

Replace `yourpassword` with your local PostgreSQL password.

## Database Schema

The application automatically creates the necessary tables on first run. The main table is:

### bookings

| Column               | Type           | Description                             |
|----------------------|----------------|-----------------------------------------|
| id                   | SERIAL         | Primary key                             |
| booking_reference    | VARCHAR(50)    | Unique booking reference                |
| customer_first_name  | VARCHAR(100)   | Customer's first name                   |
| customer_last_name   | VARCHAR(100)   | Customer's last name                    |
| customer_email       | VARCHAR(150)   | Customer's email address                |
| customer_phone       | VARCHAR(50)    | Customer's phone number                 |
| pickup_date          | TIMESTAMP      | Pickup date and time                    |
| return_date          | TIMESTAMP      | Return date and time                    |
| pickup_location      | VARCHAR(100)   | Pickup location                         |
| dropoff_location     | VARCHAR(100)   | Dropoff location                        |
| car_make             | VARCHAR(100)   | Car manufacturer                        |
| car_model            | VARCHAR(100)   | Car model                               |
| status               | VARCHAR(20)    | Booking status                          |
| total_price          | NUMERIC(10, 2) | Total price                             |
| payment_date         | TIMESTAMP      | Date payment was made                   |
| date_submitted       | TIMESTAMP      | Date booking was created                |
| booking_data         | JSONB          | Complete booking data in JSON format    | 