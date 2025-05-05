/**
 * Stripe Configuration for Calma Car Rental
 * This file contains the Stripe configuration and helper functions
 */

// Get the Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51ABC123DEF456GHI789JKL'; // Replace with actual key in production

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
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data;
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
    const { sessionId } = await createCheckoutSession(bookingData);
    
    // Load Stripe and redirect to checkout
    const stripe = await getStripe();
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
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
  }
}; 