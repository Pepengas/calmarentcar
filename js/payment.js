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

  // Calculate the total price
  const pickupDate = new Date(data['pickup-date']);
  const dropoffDate = new Date(data['dropoff-date']);
  const daysCount = Math.ceil((dropoffDate - pickupDate) / (1000 * 60 * 60 * 24));
  
  // Get car price from data
  let dailyRate = 0;
  if (data.car && data.car.pricePerDay) {
    dailyRate = data.car.pricePerDay;
  }

  const subtotal = dailyRate * daysCount;
  const total = subtotal;

  // Update total amount text
  if (totalAmountElement) {
    totalAmountElement.textContent = `€${total.toFixed(2)}`;
  }

  // Store the calculated amount in bookingData
  bookingData.amount = total;
  bookingData.dailyRate = dailyRate;
  bookingData.daysCount = daysCount;
  
  // Also update localStorage
  localStorage.setItem('currentBooking', JSON.stringify(bookingData));
}

/**
 * Handle the pay now button click
 * @param {Event} event - The click event
 */
async function handlePaymentClick(event) {
  event.preventDefault();
  
  // Add loading state to button
  const button = event.target;
  const originalText = button.textContent;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  
  try {
    // Prepare booking data for Stripe
    const paymentData = {
      ...bookingData,
      customer: {
        name: bookingData['customer-name'],
        email: bookingData['customer-email'],
        phone: bookingData['customer-phone']
      },
      car: {
        id: bookingData['car-selection'],
        name: bookingData.car ? bookingData.car.name : 'Selected Car',
        dailyRate: bookingData.dailyRate || 0
      },
      booking: {
        pickup: {
          location: bookingData['pickup-location'],
          date: bookingData['pickup-date'],
          time: bookingData['pickup-time']
        },
        dropoff: {
          location: bookingData['dropoff-location'],
          date: bookingData['dropoff-date'],
          time: bookingData['dropoff-time']
        },
        daysCount: bookingData.daysCount || 1
      },
      amount: bookingData.amount || 0,
      currency: 'eur'
    };
    
    // Redirect to Stripe checkout
    await redirectToCheckout(paymentData);
  } catch (error) {
    console.error('Payment failed:', error);
    
    // Show error to user
    alert(`Payment processing failed: ${error.message || 'Please try again'}`);
    
    // Reset button
    button.disabled = false;
    button.textContent = originalText;
  }
} 