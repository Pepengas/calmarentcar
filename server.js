// server.js
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer'); // Keep for later email sending
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');
// const { Pool } = require('pg'); // Example for PostgreSQL - keep commented for now

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
// const pool = new Pool({...
// const transporter = nodemailer.createTransport({...

// === API Endpoint for CARS ===
app.get('/api/cars', async (req, res) => {
    try {
        const carsFilePath = path.join(__dirname, 'cars.json');
        const data = await fs.readFile(carsFilePath, 'utf8');
        const cars = JSON.parse(data);
        res.status(200).json(cars);
    } catch (error) {
        console.error('Error reading cars data:', error);
        res.status(500).json({ success: false, message: 'Failed to load car data.' });
    }
});

// === API Endpoint for AVAILABILITY (Placeholder) ===
app.get('/api/cars/availability', async (req, res) => {
    const { carId, pickupDate, dropoffDate } = req.query;

    // --- Basic Validation --- 
    if (!carId || !pickupDate || !dropoffDate) {
        return res.status(400).json({ success: false, message: 'Missing required parameters (carId, pickupDate, dropoffDate).' });
    }

    console.log(`Availability check requested for car: ${carId} from ${pickupDate} to ${dropoffDate}`);

    // --- Placeholder Logic --- 
    // In a real application, you would query your database here
    // using carId, pickupDate, dropoffDate to check for overlapping bookings.
    // For now, we assume the car is always available.
    const isAvailable = true; 

    if (isAvailable) {
        res.status(200).json({ success: true, available: true });
    } else {
        // This part won't be reached with the placeholder logic
        res.status(200).json({ success: true, available: false, message: 'Selected car is not available for the chosen dates.' }); 
    }
});

// === API Endpoint for BOOKING (from previous step) ===
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
        // --- 2. Store in Database (Placeholder) ---
        console.log(`Simulating database store for: ${bookingData['customer-email']} for car ${bookingData['car-selection']}`); 

        // --- 3. Send Confirmation Emails (Placeholder) ---
        console.log('Simulating sending emails.');

        // --- 4. Send Success Response --- 
        console.log('Booking processed successfully.');
        res.status(200).json({ success: true, message: 'Booking request received successfully!' });

    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred. Please try again later.' });
    }
});

// === Prevent 404 for missing favicon ===
app.get('/favicon.ico', (req, res) => res.sendStatus(204));

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