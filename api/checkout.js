/**
 * Stripe Checkout API for Calma Car Rental
 * This file handles creating Stripe checkout sessions
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51ABC123DEF456GHI789JKL');

/**
 * Create a Stripe Checkout Session
 * POST /api/checkout
 */
router.post('/', async (req, res) => {
  try {
    const {
      customer,
      car,
      booking,
      amount,
      currency = 'eur',
      bookingReference
    } = req.body;

    // Validate required data
    if (!customer || !car || !booking || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking information'
      });
    }

    // Format description for the Stripe checkout
    const description = `Car rental: ${car.name || 'Selected car'} for ${booking.daysCount} days`;

    // Create the Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: car.name || 'Car Rental',
              description: description,
              images: car.image ? [car.image] : [],
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingReference: bookingReference || 'N/A',
        customerName: customer.name,
        customerEmail: customer.email,
        carId: car.id,
        carName: car.name,
        pickupDate: booking.pickup.date,
        dropoffDate: booking.dropoff.date,
        daysCount: booking.daysCount.toString()
      },
      success_url: `${req.headers.origin}/booking-confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/payment.html?canceled=true`,
      customer_email: customer.email,
    });

    // Return the session ID
    res.status(200).json({
      success: true,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating checkout session'
    });
  }
});

module.exports = router; 