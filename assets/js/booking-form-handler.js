/**
 * Booking Form Handler
 * Simple and direct approach to handle the booking form submission
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking form handler initialized');
    
    // Get the form and submit button
    const customerForm = document.getElementById('customer-form');
    const submitButton = document.getElementById('complete-booking-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (customerForm) {
        console.log('Customer form found:', customerForm);
        
        // Add event listener to the form
        customerForm.addEventListener('submit', function(e) {
            // Prevent the default form submission
            e.preventDefault();
            console.log('Form submit event triggered');
            
            // Show the loading overlay
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }
            
            // Disable the submit button to prevent multiple submissions
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
            
            // Collect form data
            const formData = new FormData(customerForm);
            const bookingData = {};
            
            // Convert form data to object
            for (let [key, value] of formData.entries()) {
                bookingData[key] = value;
            }
            
            console.log('Collected form data:', bookingData);
            
            // Get booking details from sessionStorage
            try {
                const storedBookingData = JSON.parse(sessionStorage.getItem('bookingData') || '{}');
                
                // Create complete booking data object
                const completeBookingData = {
                    ...storedBookingData,
                    customer: {
                        firstName: formData.get('firstName'),
                        lastName: formData.get('lastName'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        driverLicense: formData.get('driverLicense'),
                        licenseExpiry: formData.get('licenseExpiry'),
                        age: formData.get('age'),
                        nationality: formData.get('nationality'),
                        additionalOptions: {
                            additionalDriver: formData.get('additionalDriver') === 'on',
                            fullInsurance: formData.get('fullInsurance') === 'on',
                            gpsNavigation: formData.get('gpsNavigation') === 'on',
                            childSeat: formData.get('childSeat') === 'on'
                        }
                    },
                    dateSubmitted: new Date().toISOString(),
                    status: 'confirmed'
                };
                
                console.log('Complete booking data:', completeBookingData);
                
                // Generate booking reference
                const bookingReference = generateBookingReference();
                console.log('Generated booking reference:', bookingReference);
                
                // Store booking data in localStorage
                storeBooking(completeBookingData, bookingReference);
                
                // Simulate processing time and redirect
                setTimeout(function() {
                    // Redirect to confirmation page
                    window.location.href = `booking-confirmation.html?booking-ref=${bookingReference}`;
                }, 2000);
                
            } catch (error) {
                console.error('Error processing booking:', error);
                
                // Hide loading overlay
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
                
                // Re-enable submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Complete Booking';
                }
                
                // Show error alert
                alert('An error occurred while processing your booking. Please try again.');
            }
        });
    } else {
        console.error('Customer form not found!');
    }
    
    // Direct click handler for the submit button as a backup
    if (submitButton) {
        submitButton.addEventListener('click', function(e) {
            console.log('Submit button clicked directly');
            
            // Check if we should trigger the form submission
            if (!e.target.getAttribute('data-submitted')) {
                e.target.setAttribute('data-submitted', 'true');
                
                // If the form exists, trigger its submission
                if (customerForm && !customerForm.classList.contains('submitting')) {
                    customerForm.classList.add('submitting');
                    
                    // Submit the form
                    const submitEvent = new Event('submit', {
                        bubbles: true,
                        cancelable: true
                    });
                    customerForm.dispatchEvent(submitEvent);
                }
            }
        });
    } else {
        console.error('Submit button not found!');
    }
    
    /**
     * Generate a booking reference
     */
    function generateBookingReference() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let reference = 'CR-';
        
        for (let i = 0; i < 8; i++) {
            reference += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return reference;
    }
    
    /**
     * Store booking in localStorage
     */
    function storeBooking(bookingData, bookingReference) {
        try {
            // Get existing bookings or initialize empty array
            let bookings = JSON.parse(localStorage.getItem('userBookings')) || [];
            
            // Add new booking with reference
            bookings.push({
                ...bookingData,
                bookingReference,
                status: 'confirmed'
            });
            
            // Store updated bookings
            localStorage.setItem('userBookings', JSON.stringify(bookings));
            
            // Store for admin access
            let adminBookings = JSON.parse(localStorage.getItem('adminBookings')) || [];
            adminBookings.push({
                ...bookingData,
                bookingReference,
                timestamp: new Date().toISOString(),
                status: 'new'
            });
            localStorage.setItem('adminBookings', JSON.stringify(adminBookings));
            
            // Clear session storage booking data since booking is complete
            // sessionStorage.removeItem('bookingData');
            
            console.log('Booking data stored successfully');
            return true;
        } catch (error) {
            console.error('Error storing booking data:', error);
            return false;
        }
    }
}); 