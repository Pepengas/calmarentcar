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

// --- Simple file-based database functions ---
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// Initialize bookings file if it doesn't exist
async function initBookingsDB() {
    try {
        await fs.access(BOOKINGS_FILE);
        console.log('Bookings database file exists');
    } catch (error) {
        // File doesn't exist, create it with empty array
        await fs.writeFile(BOOKINGS_FILE, JSON.stringify([], null, 2));
        console.log('Created new bookings database file');
    }
}

// Get all bookings
async function getBookings() {
    try {
        const data = await fs.readFile(BOOKINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading bookings:', error);
        return [];
    }
}

// Save a booking
async function saveBooking(booking) {
    try {
        const bookings = await getBookings();
        
        // Get the highest existing ID to ensure uniqueness
        const highestId = bookings.reduce((max, b) => b.id > max ? b.id : max, 0);
        
        // Add the new booking with incremented ID and timestamps
        const newBooking = {
            ...booking,
            id: highestId + 1,
            status: 'confirmed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        bookings.push(newBooking);
        await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
        return newBooking;
    } catch (error) {
        console.error('Error saving booking:', error);
        throw error;
    }
}

// Initialize the bookings database on startup
initBookingsDB().catch(console.error);

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
        // Get the car details for the selected car
        const carsFilePath = path.join(__dirname, 'cars.json');
        const carsData = await fs.readFile(carsFilePath, 'utf8');
        const cars = JSON.parse(carsData);
        const selectedCar = cars.find(car => car.id === bookingData['car-selection']);
        const carName = selectedCar ? selectedCar.name : 'Unknown Car';

        // Transform the form data into our booking object format
        const booking = {
            car_id: bookingData['car-selection'],
            car_name: carName,
            pickup_location: bookingData['pickup-location'],
            dropoff_location: bookingData['dropoff-location'],
            pickup_date: new Date(bookingData['pickup-date']).toISOString(),
            pickup_time: bookingData['pickup-time'],
            dropoff_date: new Date(bookingData['dropoff-date']).toISOString(),
            dropoff_time: bookingData['dropoff-time'],
            customer_name: bookingData['customer-name'],
            customer_email: bookingData['customer-email'],
            customer_phone: bookingData['customer-phone'],
            customer_age: parseInt(bookingData.age),
            additional_requests: bookingData['additional-requests'] || ''
        };

        // Save the booking to our file database
        const savedBooking = await saveBooking(booking);
        console.log('Booking saved:', savedBooking);

        // --- 3. Send Confirmation Emails (Placeholder) ---
        console.log('Simulating sending emails.');

        // --- 4. Send Success Response with booking ID --- 
        console.log('Booking processed successfully.');
        res.status(200).json({ 
            success: true, 
            message: 'Booking request received successfully!',
            booking_id: savedBooking.id
        });

    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred. Please try again later.' });
    }
});

// === API Endpoint for ADMIN BOOKINGS ===
app.get('/api/admin/bookings', async (req, res) => {
    try {
        // Get bookings from our file database
        const bookings = await getBookings();
        
        // Sort bookings by created_at date, most recent first
        bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.status(200).json({ 
            success: true, 
            bookings: bookings
        });
    } catch (error) {
        console.error('Error retrieving bookings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load bookings data.' 
        });
    }
});

// === API Endpoint for DEBUG BOOKINGS (for testing) ===
app.get('/api/debug/bookings', async (req, res) => {
    try {
        const bookings = await getBookings();
        
        res.status(200).json({
            success: true,
            hasBookingsTable: true,
            hasCarsTable: true,
            bookingsCount: bookings.length,
            carsCount: 6, // Hard-coded for now
            rawBookings: bookings,
            availableTables: ["cars", "bookings"]
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Debug endpoint error' 
        });
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