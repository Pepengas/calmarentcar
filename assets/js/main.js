/**
 * Main JavaScript Entry Point
 */

import { UI } from './ui.js';
import { Fleet } from './fleet.js';
import { Booking } from './booking.js';

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize UI components
        UI.init();
        
        // Initialize car fleet
        await Fleet.init();
        
        // Initialize booking functionality
        Booking.init();
        
        console.log('Calma Car Rental application initialized');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}); 