/**
 * Payment Processing for Calma Car Rental
 * This file handles the payment UI and functionality
 */

import { redirectToCheckout } from './stripe-config.js';

// DOM Elements
let paymentSummaryElement;
let payNowButtonElement;
let totalAmountElement;
let bookingData = {};

/**
 * Initialize the payment component
 */
export function initPayment() {
  // Find DOM elements
  paymentSummaryElement = document.getElementById('payment-summary');
  payNowButtonElement = document.getElementById('pay-now-button');
  totalAmountElement = document.getElementById('total-amount');

  if (!payNowButtonElement) {
    console.error('Payment button not found');
    return;
  }

  // Get booking data from localStorage
  const savedBookingData = localStorage.getItem('currentBooking');
  if (savedBookingData) {
    bookingData = JSON.parse(savedBookingData);
    displayPaymentSummary(bookingData);
  } else {
    console.error('No booking data found');
    window.location.href = 'index.html';
    return;
  }

  // Add event listener to payment button
  payNowButtonElement.addEventListener('click', handlePaymentClick);
}

/**
 * Display the payment summary based on booking data
 * @param {Object} data - The booking data
 */
function displayPaymentSummary(data) {
  if (!paymentSummaryElement || !data) return;

  // Retrieve booking details
  const selectedCar = data.selectedCar || {};
  const durationDays = data.durationDays || 1;
  const pickupLocation = data.pickupLocation || '';
  const pickupDate = data.pickupDate || '';
  const returnDate = data.returnDate || '';
  const totalPrice = data.totalPrice || 0;
  
  // Update car name
  const carNameEl = document.getElementById('car-name');
  if (carNameEl) {
    carNameEl.textContent = `${selectedCar.make} ${selectedCar.model}`;
  }
  
  // Update pickup details
  const pickupEl = document.getElementById('pickup-details');
  if (pickupEl) {
    const formattedPickupDate = new Date(pickupDate).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    pickupEl.textContent = `${pickupLocation} - ${formattedPickupDate}`;
  }
  
  // Update dropoff details
  const dropoffEl = document.getElementById('dropoff-details');
  if (dropoffEl) {
    const formattedReturnDate = new Date(returnDate).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    dropoffEl.textContent = `${pickupLocation} - ${formattedReturnDate}`;
  }
  
  // Update duration
  const durationEl = document.getElementById('rental-duration');
  if (durationEl) {
    durationEl.textContent = `${durationDays} ${durationDays === 1 ? 'day' : 'days'}`;
  }
  
  // Update daily rate
  const rateEl = document.getElementById('daily-rate');
  if (rateEl) {
    rateEl.textContent = `€${selectedCar.price}/day`;
  }

  // Update total amount
  if (totalAmountElement) {
    totalAmountElement.textContent = `€${totalPrice.toFixed(2)}`;
  }
}

/**
 * Handle the pay now button click
 * @param {Event} event - The click event
 */
async function handlePaymentClick(event) {
  // Prevent default form submission
  event.preventDefault();
  
  // Show loading overlay
  const loadingOverlay = document.querySelector('.loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }
  
  // Add loading state to button
  const button = event.currentTarget;
  const originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  
  try {
    // Redirect to Stripe checkout
    await redirectToCheckout(bookingData);
  } catch (error) {
    console.error('Payment failed:', error);
    
    // Show error to user
    alert(`Payment processing failed: ${error.message || 'Please try again'}`);
    
    // Hide loading overlay
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    
    // Reset button
    button.disabled = false;
    button.innerHTML = originalText;
  }
} 