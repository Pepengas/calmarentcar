# Calma Car Rental - New Admin Panel

This is a complete rewrite of the admin panel for Calma Car Rental, featuring a modern UI and PostgreSQL database integration.

## Features

- Modern responsive UI using Tailwind CSS
- Full PostgreSQL database integration
- Booking management (view, edit, delete)
- Dashboard with key statistics
- Data migration from LocalStorage to PostgreSQL
- Detailed booking information display
- Print booking feature
- Filtering and search capabilities
- Real-time database status monitoring

## Setup Instructions

### 1. Install Dependencies

Make sure you have Node.js installed, then run:

```bash
npm install
```

This will install all the necessary dependencies including Express, PostgreSQL client, and other requirements.

### 2. Configure Database

1. Set up a PostgreSQL database on Railway or your preferred provider
2. Create a `.env` file in the root directory with your database connection string:

```
DATABASE_URL=your_postgresql_connection_string
PORT=3000
```

Replace `your_postgresql_connection_string` with the actual connection string from Railway.

### 3. Run the Server

For development:

```bash
npm run dev
```

For production:

```bash
npm start
```

### 4. Access the Admin Panel

Open your browser and navigate to:

```
http://localhost:3000/admin-new
```

## Using the Admin Panel

### Dashboard

The dashboard displays key statistics and recent bookings:
- Total bookings
- Active rentals
- Total revenue
- New bookings in the last 7 days
- Most recent bookings

### Bookings Management

The bookings section allows you to:
- View all bookings
- Filter bookings by status, date range, and search terms
- View detailed information for each booking
- Update booking status
- Delete bookings
- Print booking information

### Database Diagnostics

The database diagnostics section helps you:
- Check database connection status
- View connection details
- Migrate data from LocalStorage to PostgreSQL
- Create sample bookings for testing
- Clear database (admin use only)

## Technical Implementation

### Files

- `admin-new.html` - The main HTML file for the admin panel
- `admin-new.js` - JavaScript functionality for the admin panel
- `server-new.js` - Server-side implementation with API endpoints
- `.env` - Environment variables for database configuration

### Database Schema

The PostgreSQL database has a main `bookings` table with the following structure:

| Column               | Type           | Description                             |
|----------------------|----------------|-----------------------------------------|
| id                   | SERIAL         | Primary key                             |
| booking_reference    | VARCHAR(50)    | Unique booking reference                |
| customer_first_name  | VARCHAR(100)   | Customer's first name                   |
| customer_last_name   | VARCHAR(100)   | Customer's last name                    |
| customer_email       | VARCHAR(150)   | Customer's email address                |
| customer_phone       | VARCHAR(50)    | Customer's phone number                 |
| customer_age         | VARCHAR(20)    | Customer's age                          |
| driver_license       | VARCHAR(50)    | Customer's driver's license number      |
| license_expiration   | TIMESTAMP      | License expiration date                 |
| country              | VARCHAR(50)    | Customer's country                      |
| pickup_date          | TIMESTAMP      | Pickup date and time                    |
| return_date          | TIMESTAMP      | Return date and time                    |
| pickup_location      | VARCHAR(100)   | Pickup location                         |
| dropoff_location     | VARCHAR(100)   | Dropoff location                        |
| car_make             | VARCHAR(100)   | Car manufacturer                        |
| car_model            | VARCHAR(100)   | Car model                               |
| daily_rate           | NUMERIC(10, 2) | Daily rental rate                       |
| total_price          | NUMERIC(10, 2) | Total price                             |
| status               | VARCHAR(20)    | Booking status                          |
| payment_date         | TIMESTAMP      | Date payment was made                   |
| date_submitted       | TIMESTAMP      | Date booking was created                |
| additional_driver    | BOOLEAN        | Additional driver option                |
| full_insurance       | BOOLEAN        | Full insurance option                   |
| gps_navigation       | BOOLEAN        | GPS navigation option                   |
| child_seat           | BOOLEAN        | Child seat option                       |
| special_requests     | TEXT           | Special requests                        |
| booking_data         | JSONB          | Complete booking data in JSON format    |

## Migration from Old System

The new admin panel includes tools to help migrate from the old localStorage-based system:

1. In the Database Diagnostics section, use the "Migrate LocalStorage to DB" button
2. This will transfer all bookings from localStorage to the PostgreSQL database
3. The tool will report which bookings were successfully migrated

## Troubleshooting

### Database Connection Issues

- Verify that your DATABASE_URL in the .env file is correct
- Check that your Railway PostgreSQL instance is running
- Use the "Test Connection" button in the Database Diagnostics section

### Missing Bookings

- Check if bookings are stored in localStorage using the Database Diagnostics
- Try using the migration tool to transfer bookings to the database
- Create a sample booking to test the system

## Contributing

To modify or extend the admin panel:

1. Edit `admin-new.html` for UI changes
2. Edit `admin-new.js` for client-side functionality
3. Edit `server-new.js` for server-side API endpoints 