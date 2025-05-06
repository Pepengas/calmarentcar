/**
 * Admin Dashboard Fix and Diagnostic Tool
 * 
 * This script helps diagnose and fix common issues with the admin dashboard
 * and localStorage. It will:
 * 1. Check if localStorage is accessible
 * 2. Create a test booking if needed
 * 3. Verify that bookings can be saved and retrieved
 */

const AdminFixTool = {
    // Test if localStorage is available and working
    testLocalStorage: function() {
        try {
            const testKey = 'calma_test_' + Date.now();
            const testValue = JSON.stringify({timestamp: Date.now(), test: 'data'});
            
            // Try to write
            localStorage.setItem(testKey, testValue);
            console.log('✅ Successfully wrote to localStorage');
            
            // Try to read
            const readValue = localStorage.getItem(testKey);
            console.log('✅ Successfully read from localStorage:', readValue);
            
            // Clean up
            localStorage.removeItem(testKey);
            console.log('✅ Successfully removed test data from localStorage');
            
            return true;
        } catch (e) {
            console.error('❌ localStorage test failed:', e);
            alert('localStorage is not available or not working! This is required for the admin dashboard to function.');
            return false;
        }
    },
    
    // Add a test booking to localStorage
    addTestBooking: function() {
        try {
            const testBooking = {
                bookingReference: 'TEST-FIX-' + Math.floor(Math.random() * 10000),
                status: 'confirmed',
                timestamp: new Date().toISOString(),
                dateSubmitted: new Date().toISOString(),
                customer: {
                    firstName: 'Test',
                    lastName: 'Diagnostic',
                    email: 'test@calmarental.com',
                    phone: '+1234567890',
                    additionalOptions: {
                        fullInsurance: true,
                        gpsNavigation: true
                    }
                },
                selectedCar: {
                    make: 'Diagnostic',
                    model: 'Test Car',
                    price: 45
                },
                pickupLocation: 'airport',
                dropoffLocation: 'port',
                pickupDate: new Date().toISOString(),
                returnDate: new Date(Date.now() + 3*24*60*60*1000).toISOString(),
                durationDays: 3,
                totalPrice: 135
            };
            
            // Get existing bookings
            let adminBookings = [];
            const existingData = localStorage.getItem('adminBookings');
            
            if (existingData) {
                try {
                    adminBookings = JSON.parse(existingData);
                    console.log(`Found ${adminBookings.length} existing bookings`);
                } catch (e) {
                    console.error('Error parsing existing admin bookings:', e);
                    adminBookings = [];
                }
            } else {
                console.log('No existing admin bookings found, creating new array');
            }
            
            // Add new booking
            adminBookings.push(testBooking);
            
            // Save back to localStorage
            localStorage.setItem('adminBookings', JSON.stringify(adminBookings));
            console.log(`✅ Test booking ${testBooking.bookingReference} added successfully`);
            
            // Verify it was saved
            this.verifyBookingSaved(testBooking.bookingReference);
            
            return testBooking;
        } catch (e) {
            console.error('❌ Error adding test booking:', e);
            return null;
        }
    },
    
    // Verify that a specific booking was saved correctly
    verifyBookingSaved: function(bookingRef) {
        try {
            const adminBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
            const foundBooking = adminBookings.find(b => b.bookingReference === bookingRef);
            
            if (foundBooking) {
                console.log(`✅ Successfully verified booking ${bookingRef} was saved`);
                return true;
            } else {
                console.error(`❌ Booking ${bookingRef} was not found after save!`);
                return false;
            }
        } catch (e) {
            console.error('❌ Error verifying booking saved:', e);
            return false;
        }
    },
    
    // Check if AdminDashboard object is loaded
    checkAdminDashboard: function() {
        if (typeof AdminDashboard === 'undefined') {
            console.error('❌ AdminDashboard is not defined! The admin-dashboard.js file might not be loaded correctly.');
            return false;
        } else {
            console.log('✅ AdminDashboard is loaded correctly');
            return true;
        }
    },
    
    // Check all admin bookings
    displayAllBookings: function() {
        try {
            const adminBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
            console.log(`Found ${adminBookings.length} bookings in localStorage:`);
            
            if (adminBookings.length > 0) {
                adminBookings.forEach((booking, index) => {
                    console.log(`Booking ${index + 1}:`, 
                        `Ref: ${booking.bookingReference || 'N/A'}`, 
                        `Status: ${booking.status || 'N/A'}`,
                        `Customer: ${booking.customer ? booking.customer.firstName + ' ' + booking.customer.lastName : 'N/A'}`);
                });
            }
            
            return adminBookings;
        } catch (e) {
            console.error('❌ Error displaying bookings:', e);
            return [];
        }
    },
    
    // Run all diagnostics
    runDiagnostics: function() {
        console.log('🔍 Running admin dashboard diagnostics...');
        
        // Test localStorage
        const storageWorks = this.testLocalStorage();
        if (!storageWorks) {
            return false;
        }
        
        // Check AdminDashboard
        const dashboardLoaded = this.checkAdminDashboard();
        
        // Display all bookings
        const bookings = this.displayAllBookings();
        
        // If no bookings found, add a test booking
        if (bookings.length === 0) {
            console.log('No bookings found, adding a test booking...');
            const testBooking = this.addTestBooking();
            
            if (testBooking && dashboardLoaded) {
                console.log('Refreshing the admin dashboard...');
                if (typeof AdminDashboard !== 'undefined' && AdminDashboard.refreshData) {
                    AdminDashboard.refreshData();
                }
            }
        }
        
        console.log('✅ Diagnostics complete');
        return true;
    }
};

// Run diagnostics immediately when the script loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Fix Tool loaded, running diagnostics in 2 seconds...');
    setTimeout(function() {
        AdminFixTool.runDiagnostics();
    }, 2000);
}); 