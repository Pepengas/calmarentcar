/**
 * Stripe Webhooks API for Calma Car Rental
 * This file handles Stripe webhook events
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51ABC123DEF456GHI789JKL');
const fs = require('fs').promises;
const path = require('path');

// You would typically get this from environment variables
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Get the bookings file path from server.js
const DATA_DIR = process.env.DATA_DIR || './data';
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

/**
 * Update booking status in the database
 * @param {string} bookingReference - The booking reference
 * @param {string} status - The new status ('paid', 'canceled', etc.)
 * @param {Object} paymentDetails - Payment details from Stripe
 */
async function updateBookingStatus(bookingReference, status, paymentDetails) {
  try {
    // Create data directory if it doesn't exist
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
      console.warn('Could not create data directory:', err.message);
    }

    // Read existing bookings
    let bookings = [];
    try {
      const data = await fs.readFile(BOOKINGS_FILE, 'utf8');
      bookings = JSON.parse(data);
    } catch (err) {
      console.warn('Could not read bookings file, creating new one:', err.message);
    }

    // Find the booking with the reference
    const bookingIndex = bookings.findIndex(b => b.booking_reference === bookingReference);
    
    if (bookingIndex >= 0) {
      // Update existing booking
      bookings[bookingIndex].status = status;
      bookings[bookingIndex].payment_details = paymentDetails;
      bookings[bookingIndex].updated_at = new Date().toISOString();
    } else {
      // If booking not found, it might have been created through another channel
      // Log the issue but don't fail
      console.warn(`Booking with reference ${bookingReference} not found in database`);
    }

    // Save updated bookings back to file
    await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
    console.log(`Updated booking ${bookingReference} status to ${status}`);
    
    return true;
  } catch (error) {
    console.error('Error updating booking status:', error);
    return false;
  }
}

/**
 * Handle Stripe webhook events
 * POST /api/webhooks
 */
router.post('/', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Extract booking reference from metadata
        const bookingReference = session.metadata?.bookingReference;
        
        if (!bookingReference) {
          console.warn('No booking reference found in session metadata');
          break;
        }
        
        // Payment details to save
        const paymentDetails = {
          payment_id: session.payment_intent,
          amount_total: session.amount_total / 100, // Convert from cents
          currency: session.currency,
          payment_status: session.payment_status,
          customer_email: session.customer_details?.email,
          payment_method_types: session.payment_method_types,
          paid_at: new Date().toISOString()
        };
        
        // Update booking status
        await updateBookingStatus(bookingReference, 'paid', paymentDetails);
        
        break;
      }
      
      case 'checkout.session.expired': {
        const session = event.data.object;
        const bookingReference = session.metadata?.bookingReference;
        
        if (bookingReference) {
          await updateBookingStatus(bookingReference, 'payment_expired', {
            expired_at: new Date().toISOString()
          });
        }
        
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const bookingReference = paymentIntent.metadata?.bookingReference;
        
        if (bookingReference) {
          await updateBookingStatus(bookingReference, 'payment_failed', {
            failure_message: paymentIntent.last_payment_error?.message,
            failed_at: new Date().toISOString()
          });
        }
        
        break;
      }
      
      // Add other event types as needed
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({received: true});
  } catch (err) {
    console.error(`Error processing webhook event: ${err.message}`);
    res.status(500).send(`Webhook processing error: ${err.message}`);
  }
});

module.exports = router; 