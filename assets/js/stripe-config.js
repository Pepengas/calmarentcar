/**
 * Stripe Configuration for Calma Car Rental
 * This file contains the Stripe configuration and helper functions
 */

// Get the Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RMsufGI5o73GWxm48MIg0kogh9i3UBUGYTZE7MnD9KDRQ8JHvP9e5PrBoWDZVYvjSs8LXVGhKsIyLcOwg6wm4TM00ALZCZ3xO'; // Replace with actual key in production

// Initialize Stripe
let stripePromise = null;

/**
 * Get the Stripe instance (lazy-loading)
 */
export const getStripe = async () => {
  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/stripe-js');
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

/**
 * Create a checkout session with the provided booking data
 * @param {Object} bookingData - The booking data
 * @returns {Promise<Object>} - The Stripe session
 */
export const createCheckoutSession = async (bookingData) => {
  try {
    // Prepare data for API
    const apiData = {
      customer: {
        firstName: bookingData.customer.firstName,
        lastName: bookingData.customer.lastName,
        email: bookingData.customer.email,
        phone: bookingData.customer.phone
      },
      car: {
        id: bookingData.selectedCar.id,
        make: bookingData.selectedCar.make,
        model: bookingData.selectedCar.model,
        price: bookingData.selectedCar.price
      },
      booking: {
        pickupLocation: bookingData.pickupLocation,
        pickupDate: bookingData.pickupDate,
        returnDate: bookingData.returnDate,
        durationDays: bookingData.durationDays
      },
      amount: bookingData.totalPrice,
      currency: 'eur',
      bookingReference: bookingData.bookingReference
    };
    
    // Create a mock response for local development without a backend
    // In production, uncomment the fetch API call below
    
    /* 
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data;
    */
    
    // Mock session creation for local development
    console.log('Creating checkout session with data:', apiData);
    
    // Simulate a successful response
    return {
      sessionId: 'mock_session_' + Date.now(),
      url: `booking-confirmation?booking-ref=${bookingData.bookingReference}`
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Redirect to Stripe checkout
 * @param {Object} bookingData - The booking data
 */
export const redirectToCheckout = async (bookingData) => {
  try {
    // Show loading state
    const loader = document.querySelector('.loading-overlay') || document.createElement('div');
    if (!loader.classList.contains('loading-overlay')) {
      loader.className = 'loading-overlay';
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      loader.appendChild(spinner);
      document.body.appendChild(loader);
    }
    loader.style.display = 'flex';

    // Create checkout session
    const session = await createCheckoutSession(bookingData);
    
    if (session.url) {
      // For local development without Stripe, redirect directly to confirmation
      window.location.href = session.url;
      return;
    }
    
    // Load Stripe and redirect to checkout (in production)
    const stripe = await getStripe();
    const { error } = await stripe.redirectToCheckout({ sessionId: session.sessionId });
    
    // Handle errors
    if (error) {
      console.error('Stripe checkout error:', error);
      loader.style.display = 'none';
      throw error;
    }
  } catch (error) {
    // Hide loader and show error
    const loader = document.querySelector('.loading-overlay');
    if (loader) {
      loader.style.display = 'none';
    }
    alert(`Payment error: ${error.message}`);
    throw error;
  }
}; 
