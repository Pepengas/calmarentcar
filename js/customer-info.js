/**
 * Customer Information Page JavaScript
 * Handles form validation, display of booking summary, and submission of booking
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the customer information page
    CustomerInfo.init();
});

const CustomerInfo = {
    // Booking data from session storage
    bookingData: {},
    
    // DOM Elements
    elements: {},
    
    // Additional options prices
    optionPrices: {
        additionalDriver: 15,
        fullInsurance: 25,
        gpsNavigation: 8,
        childSeat: 5
    },
    
    /**
     * Initialize the customer information page
     */
    init: function() {
        this.loadBookingData();
        this.cacheElements();
        this.bindEvents();
        this.populateBookingSummary();
        this.updateTotalPrice();
    },
    
    /**
     * Load booking data from session storage
     */
    loadBookingData: function() {
        try {
            // First check if we have URL parameters from car selection
            const urlParams = new URLSearchParams(window.location.search);
            const carId = urlParams.get('car-id');
            const carName = urlParams.get('car-name');
            const carPrice = urlParams.get('car-price');
            
            // If we have car selection parameters, create booking data from URL params
            if (carId && carName && carPrice) {
                console.log('Car selection data found in URL params:', { carId, carName, carPrice });
                
                // Create booking data from URL parameters
                this.bookingData = {
                    pickupLocation: urlParams.get('pickup-location'),
                    dropoffLocation: urlParams.get('dropoff-location'),
                    pickupDate: urlParams.get('pickup-date'),
                    pickupTime: urlParams.get('pickup-time'),
                    returnDate: urlParams.get('dropoff-date'),
                    returnTime: urlParams.get('dropoff-time'),
                    duration: urlParams.get('duration'),
                    selectedCar: {
                        id: carId,
                        make: carName.split(' ')[0],
                        model: carName.split(' ').slice(1).join(' '),
                        price: parseFloat(carPrice)
                    }
                };
                
                // Save to sessionStorage for later use
                sessionStorage.setItem('bookingData', JSON.stringify(this.bookingData));
            } else {
                // If no URL params, try to load from sessionStorage
                const storedData = sessionStorage.getItem('bookingData');
                if (storedData) {
                    this.bookingData = JSON.parse(storedData);
                } else {
                    // Only redirect to index if we don't have URL params or sessionStorage data
                    console.error('No booking data found in URL or sessionStorage');
                    window.location.href = 'index.html';
                }
            }
        } catch (error) {
            console.error('Error loading booking data:', error);
            // Redirect to booking page in case of error
            window.location.href = 'index.html';
        }
    },
    
    /**
     * Cache DOM elements for future use
     */
    cacheElements: function() {
        // Form and form elements
        this.elements.customerForm = document.getElementById('customer-form');
        this.elements.completeBookingBtn = document.getElementById('complete-booking-btn');
        this.elements.customerInfoView = document.getElementById('customer-info-view');
        this.elements.confirmationView = document.getElementById('confirmation-view');
        this.elements.loadingOverlay = document.getElementById('loading-overlay');
        
        // Input fields
        this.elements.firstName = document.getElementById('firstName');
        this.elements.lastName = document.getElementById('lastName');
        this.elements.email = document.getElementById('email');
        this.elements.phone = document.getElementById('phone');
        this.elements.driverLicense = document.getElementById('driverLicense');
        this.elements.licenseExpiry = document.getElementById('licenseExpiry');
        this.elements.age = document.getElementById('age');
        this.elements.nationality = document.getElementById('nationality');
        
        // Additional options
        this.elements.additionalDriver = document.getElementById('additionalDriver');
        this.elements.fullInsurance = document.getElementById('fullInsurance');
        this.elements.gpsNavigation = document.getElementById('gpsNavigation');
        this.elements.childSeat = document.getElementById('childSeat');
        this.elements.termsAccepted = document.getElementById('termsAccepted');
        
        // Summary elements
        this.elements.summaryLocation = document.getElementById('summary-location');
        this.elements.summaryPickupDate = document.getElementById('summary-pickup-date');
        this.elements.summaryReturnDate = document.getElementById('summary-return-date');
        this.elements.summaryDuration = document.getElementById('summary-duration');
        this.elements.summaryCar = document.getElementById('summary-car');
        this.elements.summaryDailyRate = document.getElementById('summary-daily-rate');
        this.elements.summaryTotal = document.getElementById('summary-total');
        this.elements.additionalOptionsSummary = document.getElementById('additional-options-summary');
        
        // Terms modal elements
        this.elements.termsLink = document.getElementById('terms-link');
        this.elements.termsModal = document.getElementById('terms-modal');
        this.elements.closeModal = document.querySelector('.close-modal');
        
        // Confirmation elements
        this.elements.bookingReference = document.getElementById('booking-reference');
        this.elements.viewBookingsBtn = document.getElementById('view-bookings-btn');
    },
    
    /**
     * Bind event listeners
     */
    bindEvents: function() {
        // Form submission
        if (this.elements.customerForm) {
            this.elements.customerForm.addEventListener('submit', this.handleFormSubmit.bind(this));
            console.log('Form submit event listener added to:', this.elements.customerForm);
        } else {
            console.error('Customer form element not found');
        }
        
        // Alternative direct button click handler
        if (this.elements.completeBookingBtn) {
            this.elements.completeBookingBtn.addEventListener('click', (e) => {
                console.log('Complete booking button clicked');
                // The form submit will handle this, but as a fallback:
                if (this.elements.customerForm) {
                    // Only call handleFormSubmit directly if this isn't triggered by a form submit
                    if (e.target.getAttribute('data-processing') !== 'true') {
                        e.target.setAttribute('data-processing', 'true');
                        this.handleFormSubmit(e);
                    }
                }
            });
        }
        
        // Terms and conditions modal
        if (this.elements.termsLink) {
            this.elements.termsLink.addEventListener('click', this.openTermsModal.bind(this));
        }
        
        if (this.elements.closeModal) {
            this.elements.closeModal.addEventListener('click', this.closeTermsModal.bind(this));
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.termsModal) {
                this.closeTermsModal();
            }
        });
        
        // Additional options change event
        if (this.elements.additionalDriver) {
            this.elements.additionalDriver.addEventListener('change', this.updateTotalPrice.bind(this));
        }
        
        if (this.elements.fullInsurance) {
            this.elements.fullInsurance.addEventListener('change', this.updateTotalPrice.bind(this));
        }
        
        if (this.elements.gpsNavigation) {
            this.elements.gpsNavigation.addEventListener('change', this.updateTotalPrice.bind(this));
        }
        
        if (this.elements.childSeat) {
            this.elements.childSeat.addEventListener('change', this.updateTotalPrice.bind(this));
        }
        
        // View bookings button
        if (this.elements.viewBookingsBtn) {
            this.elements.viewBookingsBtn.addEventListener('click', this.redirectToMyBookings.bind(this));
        }
    },
    
    /**
     * Populate the booking summary with data from session storage
     */
    populateBookingSummary: function() {
        const { pickupLocation, pickupDate, returnDate, selectedCar } = this.bookingData;
        
        // Format dates
        const formattedPickupDate = new Date(pickupDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const formattedReturnDate = new Date(returnDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Calculate rental duration in days
        const pickup = new Date(pickupDate);
        const returnD = new Date(returnDate);
        const durationMs = returnD - pickup;
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        
        // Update summary elements
        this.elements.summaryLocation.textContent = pickupLocation;
        this.elements.summaryPickupDate.textContent = formattedPickupDate;
        this.elements.summaryReturnDate.textContent = formattedReturnDate;
        this.elements.summaryDuration.textContent = `${durationDays} day${durationDays > 1 ? 's' : ''}`;
        this.elements.summaryCar.textContent = `${selectedCar.make} ${selectedCar.model}`;
        this.elements.summaryDailyRate.textContent = `$${selectedCar.price.toFixed(2)}/day`;
        
        // Store duration for later calculations
        this.bookingData.durationDays = durationDays;
    },
    
    /**
     * Update the total price based on selected options
     */
    updateTotalPrice: function() {
        const { selectedCar, durationDays } = this.bookingData;
        let totalPrice = selectedCar.price * durationDays;
        
        // Clear additional options summary
        this.elements.additionalOptionsSummary.innerHTML = '';
        
        // Add prices for selected options
        if (this.elements.additionalDriver.checked) {
            totalPrice += this.optionPrices.additionalDriver * durationDays;
            this.addOptionToSummary('Additional Driver', this.optionPrices.additionalDriver * durationDays);
        }
        
        if (this.elements.fullInsurance.checked) {
            totalPrice += this.optionPrices.fullInsurance * durationDays;
            this.addOptionToSummary('Full Insurance', this.optionPrices.fullInsurance * durationDays);
        }
        
        if (this.elements.gpsNavigation.checked) {
            totalPrice += this.optionPrices.gpsNavigation * durationDays;
            this.addOptionToSummary('GPS Navigation', this.optionPrices.gpsNavigation * durationDays);
        }
        
        if (this.elements.childSeat.checked) {
            totalPrice += this.optionPrices.childSeat * durationDays;
            this.addOptionToSummary('Child Seat', this.optionPrices.childSeat * durationDays);
        }
        
        // Update total price display
        this.elements.summaryTotal.textContent = `$${totalPrice.toFixed(2)}`;
        
        // Store total price for later use
        this.bookingData.totalPrice = totalPrice;
    },
    
    /**
     * Add an option to the summary display
     */
    addOptionToSummary: function(optionName, optionPrice) {
        const optionElement = document.createElement('div');
        optionElement.className = 'summary-item';
        optionElement.innerHTML = `
            <span class="summary-label">${optionName}:</span>
            <span class="summary-value">$${optionPrice.toFixed(2)}</span>
        `;
        this.elements.additionalOptionsSummary.appendChild(optionElement);
    },
    
    /**
     * Handle form submission
     */
    handleFormSubmit: function(e) {
        e.preventDefault();
        console.log('Form submission handler called');
        
        // Log the current event target and type
        console.log('Event details:', {
            target: e.target,
            type: e.type,
            currentTarget: e.currentTarget
        });
        
        // Prevent double submissions
        if (this.elements.completeBookingBtn) {
            console.log('Complete booking button found:', this.elements.completeBookingBtn);
            
            if (this.elements.completeBookingBtn.getAttribute('data-processing') === 'true') {
                console.log('Form already being processed, ignoring duplicate submission');
                return;
            }
            
            // Set processing state
            this.elements.completeBookingBtn.setAttribute('data-processing', 'true');
            this.elements.completeBookingBtn.disabled = true;
            this.elements.completeBookingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else {
            console.error('Complete booking button not found in DOM elements');
        }
        
        // Validate form
        const isValid = this.validateForm();
        console.log('Form validation result:', isValid);
        
        if (!isValid) {
            console.log('Form validation failed');
            // Reset button state if validation fails
            if (this.elements.completeBookingBtn) {
                this.elements.completeBookingBtn.removeAttribute('data-processing');
                this.elements.completeBookingBtn.disabled = false;
                this.elements.completeBookingBtn.innerHTML = 'Proceed to Payment <i class="fas fa-credit-card"></i>';
            }
            return;
        }
        
        console.log('Form validation successful, proceeding with submission');
        
        // Show loading overlay
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        } else {
            console.error('Loading overlay element not found');
        }
        
        // Collect form data
        const formData = this.collectFormData();
        console.log('Collected form data:', formData);
        
        // Combine with booking data
        const completeBookingData = {
            ...this.bookingData,
            customer: formData,
            dateSubmitted: new Date().toISOString()
        };
        
        console.log('Complete booking data:', completeBookingData);
        
        // Simulate API call
        setTimeout(() => {
            this.submitBooking(completeBookingData);
        }, 2000);
    },
    
    /**
     * Validate the form inputs
     */
    validateForm: function() {
        let isValid = true;
        
        // Basic required field validation
        const requiredFields = [
            { element: this.elements.firstName, errorId: 'firstName-error', message: 'First name is required' },
            { element: this.elements.lastName, errorId: 'lastName-error', message: 'Last name is required' },
            { element: this.elements.email, errorId: 'email-error', message: 'Email address is required' },
            { element: this.elements.phone, errorId: 'phone-error', message: 'Phone number is required' },
            { element: this.elements.driverLicense, errorId: 'driverLicense-error', message: 'Driver\'s license number is required' },
            { element: this.elements.licenseExpiry, errorId: 'licenseExpiry-error', message: 'License expiry date is required' },
            { element: this.elements.age, errorId: 'age-error', message: 'Age is required' },
            { element: this.elements.nationality, errorId: 'nationality-error', message: 'Nationality is required' }
        ];
        
        // Reset all error messages
        requiredFields.forEach(field => {
            const errorElement = document.getElementById(field.errorId);
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            field.element.classList.remove('invalid');
        });
        
        // Check each field
        requiredFields.forEach(field => {
            if (!field.element.value.trim()) {
                isValid = false;
                this.showFieldError(field.element, field.errorId, field.message);
            }
        });
        
        // Email format validation
        if (this.elements.email.value.trim() && !this.isValidEmail(this.elements.email.value)) {
            isValid = false;
            this.showFieldError(this.elements.email, 'email-error', 'Please enter a valid email address');
        }
        
        // Phone number format validation
        if (this.elements.phone.value.trim() && !this.isValidPhone(this.elements.phone.value)) {
            isValid = false;
            this.showFieldError(this.elements.phone, 'phone-error', 'Please enter a valid phone number');
        }
        
        // Age validation
        if (this.elements.age.value) {
            const age = parseInt(this.elements.age.value);
            if (age < 18) {
                isValid = false;
                this.showFieldError(this.elements.age, 'age-error', 'You must be at least 18 years old to rent a car');
            } else if (age < 25 && this.bookingData.selectedCar.category === 'luxury') {
                isValid = false;
                this.showFieldError(this.elements.age, 'age-error', 'You must be at least 25 years old to rent a luxury car');
            }
        }
        
        // Terms and conditions validation
        if (!this.elements.termsAccepted.checked) {
            isValid = false;
            const termsError = document.getElementById('termsAccepted-error');
            termsError.textContent = 'You must accept the terms and conditions';
            termsError.style.display = 'block';
        }
        
        return isValid;
    },
    
    /**
     * Show an error message for a field
     */
    showFieldError: function(element, errorId, message) {
        const errorElement = document.getElementById(errorId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        element.classList.add('invalid');
    },
    
    /**
     * Validate email format
     */
    isValidEmail: function(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    },
    
    /**
     * Validate phone number format
     */
    isValidPhone: function(phone) {
        // Simple validation - can be enhanced for specific formats
        const phonePattern = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
        return phonePattern.test(phone);
    },
    
    /**
     * Collect form data
     */
    collectFormData: function() {
        return {
            firstName: this.elements.firstName.value.trim(),
            lastName: this.elements.lastName.value.trim(),
            email: this.elements.email.value.trim(),
            phone: this.elements.phone.value.trim(),
            driverLicense: this.elements.driverLicense.value.trim(),
            licenseExpiry: this.elements.licenseExpiry.value,
            age: parseInt(this.elements.age.value),
            nationality: this.elements.nationality.value.trim(),
            additionalOptions: {
                additionalDriver: this.elements.additionalDriver.checked,
                fullInsurance: this.elements.fullInsurance.checked,
                gpsNavigation: this.elements.gpsNavigation.checked,
                childSeat: this.elements.childSeat.checked
            }
        };
    },
    
    /**
     * Submit the booking
     */
    submitBooking: function(bookingData) {
        console.log('Booking data submitted:', bookingData);
        
        // Generate booking reference (simulated)
        const bookingReference = this.generateBookingReference();
        
        // Prepare data for payment processing
        const paymentData = {
            ...bookingData,
            bookingReference: bookingReference,
            status: 'pending'
        };
        
        // Store the complete booking data in localStorage for the payment page
        localStorage.setItem('currentBooking', JSON.stringify(paymentData));
        
        // Store data for retrieval in booking confirmation
        sessionStorage.setItem('bookingParams', new URLSearchParams(window.location.search).toString());
        
        // Hide loading overlay
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
        
        // Redirect to payment page
        window.location.href = 'payment.html';
    },
    
    /**
     * Generate a random booking reference
     */
    generateBookingReference: function() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let reference = 'PD-';
        
        for (let i = 0; i < 8; i++) {
            reference += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return reference;
    },
    
    /**
     * Open terms and conditions modal
     */
    openTermsModal: function(e) {
        e.preventDefault();
        this.elements.termsModal.style.display = 'block';
    },
    
    /**
     * Close terms and conditions modal
     */
    closeTermsModal: function() {
        this.elements.termsModal.style.display = 'none';
    },
    
    /**
     * Redirect to my bookings page
     */
    redirectToMyBookings: function(e) {
        e.preventDefault();
        window.location.href = 'my-bookings.html';
    }
}; 