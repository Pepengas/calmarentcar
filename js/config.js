/**
 * Configuration Module - Contains global settings
 */

// Base URLs for different environments
const ENV = {
    production: 'https://calmarentcar-production.up.railway.app',
    development: 'http://localhost:3000'
};

// Determine current environment
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

// Export configuration variables
export const API_BASE_URL = isProduction ? ENV.production : ENV.development;

// Other global configuration
export const CONFIG = {
    minAgeRequirement: 25,
    defaultCurrency: 'EUR',
    dateFormat: 'yyyy-MM-dd',
    timeFormat: 'HH:mm',
    bookingSettings: {
        minRentalDays: 1,
        maxRentalDays: 30,
        defaultPickupTime: '10:00',
        defaultDropoffTime: '10:00',
        advanceBookingDays: 365  // How many days in advance booking is allowed
    }
}; 