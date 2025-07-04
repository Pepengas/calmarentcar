# Calma Car Rental Website

A full-featured car rental booking system with dynamic pricing and inventory management.

## Car Inventory Management

The system now supports loading real car inventory data from an Excel file. This feature replaces the previous demo car seeding process with actual car data, complete with monthly pricing.

### How Car Import Works

1. The system looks for an Excel file named `ΠΙΝΑΚΑΣ ΤΙΜΩΝ ΤΕΛΙΚΟΣ ΣΕΖΟΝ ΝΙΚΟΣ.xlsx` in the root directory
2. When the database is first initialized or when the reset endpoint is called, this file is processed
3. Car names and monthly prices are extracted and imported into the database
4. The system automatically assigns appropriate categories and features based on the car names

### Using the Car Import Feature

#### Automatic Import

Car data is automatically imported in the following scenarios:

- When the server starts and no cars exist in the database
- When the admin panel "Reset Cars" button is used
- When calling the API endpoint `/api/admin/reset-cars`

#### Manual Testing

To manually test the car import feature:

1. Start the server: `node server.js`
2. Run the reset utility: `node utils/reset-cars.js`
3. Verify cars in the admin panel

#### Excel File Format

The Excel file should contain:
- A column with car names/models
- Monthly pricing columns for each month (January through December)
- The system will attempt to detect these columns automatically

If the Excel structure is not recognized, the system will fall back to creating default car entries to ensure the website remains functional.

### Utility Scripts

The project includes two utility scripts for car inventory management:

- `utils/excel-validator.js`: Validates the Excel file structure without modifying the database
- `utils/reset-cars.js`: Triggers a complete reset of the car inventory by calling the API endpoint

## Admin Panel

The admin panel at `/admin` provides a full interface for managing car inventory:

- View all cars in the system
- Edit car details including name, description, features and image URL
- Manage monthly pricing with a pricing modal
- Toggle car availability
- Reset car inventory from the Excel file

## API Endpoints

Car-related API endpoints:

- `GET /api/cars`: Get all available cars
- `GET /api/cars/:id`: Get a specific car by ID
- `GET /api/admin/cars`: Admin endpoint to get all cars (available and unavailable)
- `POST /api/admin/cars`: Add a new car
- `PUT /api/admin/cars/:id`: Update an existing car
- `PATCH /api/admin/cars/:id/availability`: Update car availability
- `PATCH /api/admin/cars/:id/pricing`: Update car monthly pricing
- `DELETE /api/admin/cars/:id`: Delete a car
- `POST /api/admin/reset-cars`: Reset all cars from Excel file

## Database Structure

Cars are stored in the database with the following structure:

```sql
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    car_id TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT,
    category TEXT,
    features JSONB,
    monthly_pricing JSONB,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)
```

The `monthly_pricing` field stores a JSON object with prices for each month of the year.

## Email Notifications

The server sends booking confirmation emails using [Resend](https://resend.com/).
Set the following environment variables to enable emails:

- `RESEND_API_KEY` – your Resend API key
- `ADMIN_NOTIFICATION_EMAIL` – optional address that receives a copy of every booking confirmation

## Favicon
Add your favicon images under `public/` after cloning:

- `favicon.ico` for legacy browsers
- `favicon-32.png` and `favicon-192.png` for modern devices
- `site.webmanifest` references these icons for search engines and PWAs

Google will fetch `/favicon.ico` and the icons declared in the HTML head. Ensure these files exist on your deployed site.
