// server.js
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer'); // Keep for later email sending
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');
const db = require('./db'); // Import our database module

const app = express();
const port = process.env.PORT || 3000; // Updated to use Heroku's PORT env variable

// === Configuration ===
// Allow requests from your frontend (adjust origin in production)
app.use(cors({ origin: '*' })); // Be more specific in production!
// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// --- Database & Email Config (Placeholders/Commented Out) ---
// const transporter = nodemailer.createTransport({...

// === API Endpoint for CARS ===
app.get('/api/cars', async (req, res) => {
    try {
        // Try to get cars from database first
        const result = await db.query('SELECT id, name, description, price_per_day as "pricePerDay", image_url as "image" FROM cars ORDER BY price_per_day');
        
        // If we have cars in the database, return them
        if (result.rowCount > 0) {
            // Format the data to match our expected structure
            const cars = result.rows.map(car => {
                // Add placeholder features - in a real app you'd have a car_features table
                car.features = ['Air Conditioning', 'Bluetooth', car.pricePerDay > 50 ? 'GPS' : 'Fuel Efficient'];
                return car;
            });
            return res.status(200).json(cars);
        }
        
        // Fallback to JSON file if database is empty or has issues
        const carsFilePath = path.join(__dirname, 'cars.json');
        const data = await fs.readFile(carsFilePath, 'utf8');
        const cars = JSON.parse(data);
        res.status(200).json(cars);
    } catch (error) {
        console.error('Error reading cars data:', error);
        
        // Try file fallback if database fails
        try {
            const carsFilePath = path.join(__dirname, 'cars.json');
            const data = await fs.readFile(carsFilePath, 'utf8');
            const cars = JSON.parse(data);
            res.status(200).json(cars);
        } catch (fallbackError) {
            res.status(500).json({ success: false, message: 'Failed to load car data.' });
        }
    }
});

// === API Endpoint for AVAILABILITY (Now with database check) ===
app.get('/api/cars/availability', async (req, res) => {
    const { carId, pickupDate, dropoffDate } = req.query;

    // --- Basic Validation --- 
    if (!carId || !pickupDate || !dropoffDate) {
        return res.status(400).json({ success: false, message: 'Missing required parameters (carId, pickupDate, dropoffDate).' });
    }

    console.log(`Availability check requested for car: ${carId} from ${pickupDate} to ${dropoffDate}`);

    try {
        // Check if there are any overlapping bookings for this car
        const query = `
            SELECT id FROM bookings 
            WHERE car_id = $1 
            AND status != 'cancelled'
            AND (
                (pickup_date <= $2 AND dropoff_date >= $2) OR
                (pickup_date <= $3 AND dropoff_date >= $3) OR
                (pickup_date >= $2 AND dropoff_date <= $3)
            )
        `;
        
        const result = await db.query(query, [carId, pickupDate, dropoffDate]);
        
        // If there are no overlapping bookings, the car is available
        const isAvailable = result.rowCount === 0;
        
        if (isAvailable) {
            res.status(200).json({ success: true, available: true });
        } else {
            res.status(200).json({ 
                success: true, 
                available: false, 
                message: 'Selected car is not available for the chosen dates.' 
            });
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        
        // For now, fallback to always available if database fails
        res.status(200).json({ success: true, available: true });
    }
});

// === API Endpoint for BOOKING ===
app.post('/api/book', async (req, res) => {
    console.log('Booking request received:', req.body);
    const bookingData = req.body;

    // --- 1. Server-Side Validation --- 
    const requiredFields = ['pickup-location', 'dropoff-location', 'pickup-date', 'pickup-time', 'dropoff-date', 'dropoff-time', 'car-selection', 'customer-name', 'customer-email', 'customer-phone', 'age'];
    
    for (const field of requiredFields) {
        if (!bookingData[field]) {
            console.error(`Validation Error: Missing field ${field}`);
            return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
        }
    }
    
    if (parseInt(bookingData.age) < 21) {
         console.error(`Validation Error: Age ${bookingData.age} is less than 21`);
         return res.status(400).json({ success: false, message: 'Minimum age requirement is 21.' });
    }
    
    // Add date validation (dropoff >= pickup)
    if (new Date(bookingData['dropoff-date']) < new Date(bookingData['pickup-date'])) {
        console.error(`Validation Error: Drop-off date ${bookingData['dropoff-date']} is before pickup date ${bookingData['pickup-date']}`);
        return res.status(400).json({ success: false, message: 'Drop-off date cannot be earlier than pickup date.' });
    }
    
    console.log('Validation passed.');

    try {
        // --- 2. Check availability again (for safety) ---
        const availabilityCheck = await db.query(`
            SELECT id FROM bookings 
            WHERE car_id = $1 
            AND status != 'cancelled'
            AND (
                (pickup_date <= $2 AND dropoff_date >= $2) OR
                (pickup_date <= $3 AND dropoff_date >= $3) OR
                (pickup_date >= $2 AND dropoff_date <= $3)
            )
        `, [bookingData['car-selection'], bookingData['pickup-date'], bookingData['dropoff-date']]);
        
        if (availabilityCheck.rowCount > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'This car is no longer available for the selected dates.' 
            });
        }
        
        // --- 3. Store in Database ---
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
        
        const values = [
            bookingData['car-selection'],
            bookingData['pickup-location'],
            bookingData['dropoff-location'],
            bookingData['pickup-date'],
            bookingData['pickup-time'],
            bookingData['dropoff-date'],
            bookingData['dropoff-time'],
            bookingData['customer-name'],
            bookingData['customer-email'],
            bookingData['customer-phone'],
            parseInt(bookingData.age),
            bookingData['additional-requests'] || '',
            'confirmed' // Default to confirmed for now
        ];
        
        const result = await db.query(query, values);
        const bookingId = result.rows[0].id;
        console.log(`Booking stored in database with ID: ${bookingId}`);

        // --- 4. Send Confirmation Emails (Placeholder) ---
        console.log('Simulating sending emails.');

        // --- 5. Send Success Response --- 
        console.log('Booking processed successfully.');
        res.status(200).json({ 
            success: true, 
            message: 'Booking request received successfully!',
            booking_id: bookingId 
        });

    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred. Please try again later.' });
    }
});

// === Serve Static Files ===
// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// === Start the Server ===
app.listen(port, () => {
    console.log(`Calma Car Rental backend server listening on port ${port}`);
}); 