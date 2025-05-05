/**
 * Booking Confirmation Page JavaScript
 * Handles displaying booking details and sending information to admin dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the booking confirmation page
    BookingConfirmation.init();
    
    // Get URL parameters to check for Stripe session ID
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        const paymentStatus = document.getElementById('payment-status');
        const paymentId = document.getElementById('payment-id');
        
        if (paymentStatus) {
            paymentStatus.innerHTML = '<i class="fas fa-check-circle"></i> Payment Successful';
        }
        
        if (paymentId) {
            paymentId.textContent = sessionId.substring(0, 16) + '...';
        }
        
        // Store payment information in the booking
        if (BookingConfirmation.bookingData) {
            BookingConfirmation.bookingData.payment = {
                status: 'paid',
                sessionId: sessionId,
                date: new Date().toISOString()
            };
            
            // Update the booking in localStorage
            BookingConfirmation.updateBookingPaymentStatus();
        }
    }
});

const BookingConfirmation = {
    // Booking data from URL parameters and localStorage
    bookingData: {},
    
    // DOM Elements
    elements: {},
    
    /**
     * Initialize the booking confirmation page
     */
    init: function() {
        this.loadBookingData();
        this.cacheElements();
        this.populateConfirmationDetails();
        this.setupPrintButton();
        this.sendBookingToAdmin();
    },
    
    /**
     * Load booking data from URL parameters and localStorage
     */
    loadBookingData: function() {
        // Get booking reference from URL
        const urlParams = new URLSearchParams(window.location.search);
        const bookingRef = urlParams.get('booking-ref');
        
        if (bookingRef) {
            // Get booking details from localStorage
            try {
                const bookings = JSON.parse(localStorage.getItem('userBookings')) || [];
                const booking = bookings.find(b => b.bookingReference === bookingRef);
                
                if (booking) {
                    this.bookingData = booking;
                } else {
                    console.error('Booking not found with reference:', bookingRef);
                    // Fallback to last booking if reference not found
                    this.loadLastBooking();
                }
            } catch (error) {
                console.error('Error loading booking data:', error);
                this.loadLastBooking();
            }
        } else {
            // If no booking reference in URL, get the last booking from localStorage
            this.loadLastBooking();
        }
    },
    
    /**
     * Load the last booking from localStorage as fallback
     */
    loadLastBooking: function() {
        try {
            const bookings = JSON.parse(localStorage.getItem('userBookings')) || [];
            if (bookings.length > 0) {
                // Get the most recent booking
                this.bookingData = bookings[bookings.length - 1];
            } else {
                console.error('No bookings found in localStorage');
                // Redirect to home page if no bookings found
                // setTimeout(() => window.location.href = 'index.html', 3000);
            }
        } catch (error) {
            console.error('Error loading last booking:', error);
        }
    },
    
    /**
     * Cache DOM elements for future use
     */
    cacheElements: function() {
        // Booking reference
        this.elements.bookingReferenceNumber = document.getElementById('booking-reference-number');
        
        // Trip information
        this.elements.pickupLocation = document.getElementById('conf-pickup-location');
        this.elements.pickupDatetime = document.getElementById('conf-pickup-datetime');
        this.elements.dropoffLocation = document.getElementById('conf-dropoff-location');
        this.elements.dropoffDatetime = document.getElementById('conf-dropoff-datetime');
        this.elements.duration = document.getElementById('conf-duration');
        
        // Customer information
        this.elements.customerName = document.getElementById('conf-customer-name');
        this.elements.customerEmail = document.getElementById('conf-customer-email');
        this.elements.customerPhone = document.getElementById('conf-customer-phone');
        
        // Car details
        this.elements.carDetails = document.getElementById('conf-car-details');
        
        // Payment summary
        this.elements.dailyRate = document.getElementById('conf-daily-rate');
        this.elements.days = document.getElementById('conf-days');
        this.elements.subtotal = document.getElementById('conf-subtotal');
        this.elements.total = document.getElementById('conf-total');
        
        // Special requests
        this.elements.specialRequestsSection = document.getElementById('conf-special-requests-section');
        this.elements.specialRequestsList = document.getElementById('conf-special-requests-list');
        this.elements.specialRequestsItem = document.getElementById('conf-special-requests-item');
        this.elements.specialRequestsCost = document.getElementById('conf-special-requests-cost');
        this.elements.otherRequestsText = document.getElementById('conf-other-requests-text');
        
        // Print button
        this.elements.printButton = document.getElementById('print-button');
    },
    
    /**
     * Populate the confirmation page with booking details
     */
    populateConfirmationDetails: function() {
        const booking = this.bookingData;
        
        if (!booking || Object.keys(booking).length === 0) {
            console.error('No booking data available');
            return;
        }
        
        // Set booking reference
        if (this.elements.bookingReferenceNumber) {
            this.elements.bookingReferenceNumber.textContent = booking.bookingReference || 'N/A';
        }
        
        // Set trip information
        if (this.elements.pickupLocation) {
            this.elements.pickupLocation.textContent = booking.pickupLocation || 'N/A';
        }
        
        if (this.elements.pickupDatetime) {
            const pickupDate = booking.pickupDate ? new Date(booking.pickupDate) : null;
            this.elements.pickupDatetime.textContent = pickupDate ? 
                pickupDate.toLocaleString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';
        }
        
        if (this.elements.dropoffLocation) {
            this.elements.dropoffLocation.textContent = booking.dropoffLocation || 'N/A';
        }
        
        if (this.elements.dropoffDatetime) {
            const returnDate = booking.returnDate ? new Date(booking.returnDate) : null;
            this.elements.dropoffDatetime.textContent = returnDate ? 
                returnDate.toLocaleString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';
        }
        
        if (this.elements.duration) {
            const days = booking.durationDays || 1;
            this.elements.duration.textContent = `${days} ${days === 1 ? 'day' : 'days'}`;
        }
        
        // Set customer information
        if (this.elements.customerName && booking.customer) {
            this.elements.customerName.textContent = `${booking.customer.firstName} ${booking.customer.lastName}`;
        }
        
        if (this.elements.customerEmail && booking.customer) {
            this.elements.customerEmail.textContent = booking.customer.email || 'N/A';
        }
        
        if (this.elements.customerPhone && booking.customer) {
            this.elements.customerPhone.textContent = booking.customer.phone || 'N/A';
        }
        
        // Set car details
        if (this.elements.carDetails && booking.selectedCar) {
            const car = booking.selectedCar;
            this.elements.carDetails.innerHTML = `
                <div class="car-info" style="display: flex; align-items: center;">
                    <div class="car-image" style="width: 100px; margin-right: 15px;">
                        <img src="${car.image || 'images/car-placeholder.jpg'}" alt="${car.make} ${car.model}" 
                             style="width: 100%; height: auto; border-radius: 4px;">
                    </div>
                    <div class="car-specs">
                        <h4 style="margin: 0 0 5px;">${car.make} ${car.model}</h4>
                        <p style="margin: 0 0 5px; color: #6c757d; font-size: 0.9rem;">Group ${car.group || 'A'}</p>
                        <p style="margin: 0; font-size: 0.9rem;">${this.formatCarFeatures(car)}</p>
                    </div>
                </div>
            `;
        }
        
        // Set payment information
        if (this.elements.dailyRate && booking.selectedCar) {
            this.elements.dailyRate.textContent = `€${booking.selectedCar.price.toFixed(2)}`;
        }
        
        if (this.elements.days) {
            this.elements.days.textContent = booking.durationDays || 1;
        }
        
        if (this.elements.subtotal && booking.selectedCar) {
            const subtotal = (booking.selectedCar.price * (booking.durationDays || 1)).toFixed(2);
            this.elements.subtotal.textContent = `€${subtotal}`;
        }
        
        if (this.elements.total) {
            this.elements.total.textContent = `€${booking.totalPrice.toFixed(2)}`;
        }
        
        // Handle special requests/add-ons
        if (booking.customer && booking.customer.additionalOptions) {
            const options = booking.customer.additionalOptions;
            let hasOptions = false;
            
            if (this.elements.specialRequestsList) {
                this.elements.specialRequestsList.innerHTML = '';
                
                if (options.additionalDriver) {
                    this.addSpecialRequest('Additional Driver');
                    hasOptions = true;
                }
                
                if (options.fullInsurance) {
                    this.addSpecialRequest('Full Insurance Coverage');
                    hasOptions = true;
                }
                
                if (options.gpsNavigation) {
                    this.addSpecialRequest('GPS Navigation System');
                    hasOptions = true;
                }
                
                if (options.childSeat) {
                    this.addSpecialRequest('Child Seat');
                    hasOptions = true;
                }
                
                if (hasOptions && this.elements.specialRequestsSection) {
                    this.elements.specialRequestsSection.style.display = 'block';
                }
                
                if (hasOptions && this.elements.specialRequestsItem) {
                    this.elements.specialRequestsItem.style.display = 'flex';
                    
                    // Calculate add-ons cost (total - car rental cost)
                    if (this.elements.specialRequestsCost && booking.totalPrice && booking.selectedCar) {
                        const carCost = booking.selectedCar.price * (booking.durationDays || 1);
                        const optionsCost = booking.totalPrice - carCost;
                        this.elements.specialRequestsCost.textContent = `€${optionsCost.toFixed(2)}`;
                    }
                }
            }
        }
    },
    
    /**
     * Format car features for display
     */
    formatCarFeatures: function(car) {
        const features = [];
        
        if (car.specs) {
            if (car.specs.engine) features.push(`${car.specs.engine}`);
            if (car.specs.gearbox) features.push(car.specs.gearbox);
            if (car.specs.fuel) features.push(car.specs.fuel);
            if (car.specs.passengers) features.push(`${car.specs.passengers} Seats`);
        }
        
        return features.join(' • ');
    },
    
    /**
     * Add a special request to the list
     */
    addSpecialRequest: function(text) {
        const li = document.createElement('li');
        li.textContent = text;
        this.elements.specialRequestsList.appendChild(li);
    },
    
    /**
     * Setup print functionality
     */
    setupPrintButton: function() {
        if (this.elements.printButton) {
            this.elements.printButton.addEventListener('click', () => {
                window.print();
            });
        }
    },
    
    /**
     * Send booking data to admin dashboard
     */
    sendBookingToAdmin: function() {
        // In a real application, this would be an API call to the server
        // For this example, we'll store the booking in localStorage for the admin page to access
        try {
            // Get existing admin bookings or initialize empty array
            let adminBookings = JSON.parse(localStorage.getItem('adminBookings')) || [];
            
            // Add timestamp if not present
            if (!this.bookingData.timestamp) {
                this.bookingData.timestamp = new Date().toISOString();
            }
            
            // Add/update booking status
            this.bookingData.status = 'new';
            
            // Avoid duplicate bookings by checking booking reference
            const existingIndex = adminBookings.findIndex(b => 
                b.bookingReference === this.bookingData.bookingReference);
            
            if (existingIndex >= 0) {
                // Update existing booking
                adminBookings[existingIndex] = this.bookingData;
            } else {
                // Add new booking
                adminBookings.push(this.bookingData);
            }
            
            // Sort bookings by timestamp (newest first)
            adminBookings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Store updated bookings
            localStorage.setItem('adminBookings', JSON.stringify(adminBookings));
            
            console.log('Booking data sent to admin dashboard');
        } catch (error) {
            console.error('Error sending booking to admin:', error);
        }
    },
    
    /**
     * Update the payment status of the booking in localStorage
     */
    updateBookingPaymentStatus: function() {
        try {
            const bookings = JSON.parse(localStorage.getItem('userBookings')) || [];
            const bookingIndex = bookings.findIndex(b => 
                b.bookingReference === this.bookingData.bookingReference
            );
            
            if (bookingIndex >= 0) {
                // Update payment status
                bookings[bookingIndex].payment = this.bookingData.payment;
                localStorage.setItem('userBookings', JSON.stringify(bookings));
                console.log('Updated booking payment status in localStorage');
            }
        } catch (error) {
            console.error('Error updating booking payment status:', error);
        }
    }
}; 