/**
 * Customer Information Page JavaScript
 * Handles form validation, display of booking summary, and submission of booking
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the customer information page
    CustomerInfo.init();
    // Add handler for back to car selection
    const backBtn = document.getElementById('back-to-car-selection');
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Try to get booking data from sessionStorage
            const bookingDataRaw = sessionStorage.getItem('bookingData');
            if (bookingDataRaw) {
                const bookingData = JSON.parse(bookingDataRaw);
                // Build URL params
                const params = new URLSearchParams();
                if (bookingData.pickupLocation) params.append('pickup-location', bookingData.pickupLocation);
                if (bookingData.dropoffLocation) params.append('dropoff-location', bookingData.dropoffLocation);
                if (bookingData.pickupDate) params.append('pickup-date', bookingData.pickupDate);
                if (bookingData.pickupTime) params.append('pickup-time', bookingData.pickupTime);
                if (bookingData.returnDate) params.append('dropoff-date', bookingData.returnDate);
                if (bookingData.returnTime) params.append('dropoff-time', bookingData.returnTime);
                if (bookingData.duration) params.append('duration', bookingData.duration);
                // Redirect with params
                window.location.href = 'car-selection.html?' + params.toString();
            } else {
                // Fallback: just go to car-selection.html
                window.location.href = 'car-selection.html';
            }
        });
    }
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
        // Add country code autofill for phone
        this.setupCountryPhoneAutofill();
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
        this.elements.summaryDropoffLocation = document.getElementById('summary-dropoff-location');
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
        const { pickupLocation, dropoffLocation, pickupDate, returnDate, selectedCar } = this.bookingData;
        
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
        this.elements.summaryLocation.textContent = this.getLocationName(pickupLocation);
        this.elements.summaryDropoffLocation.textContent = this.getLocationName(dropoffLocation || pickupLocation); // Show same as pickup if not specified
        this.elements.summaryPickupDate.textContent = formattedPickupDate;
        this.elements.summaryReturnDate.textContent = formattedReturnDate;
        this.elements.summaryDuration.textContent = `${durationDays} day${durationDays > 1 ? 's' : ''}`;
        this.elements.summaryCar.textContent = `${selectedCar.make} ${selectedCar.model}`;
        this.elements.summaryDailyRate.textContent = `€${selectedCar.price.toFixed(2)}/day`;
        
        // Store duration for later calculations
        this.bookingData.durationDays = durationDays;
    },
    
    /**
     * Get full location name from location code
     */
    getLocationName: function(locationCode) {
        if (!locationCode) return 'Not specified';
        
        const locations = {
            'airport': 'Chania International Airport',
            'port': 'Chania Port',
            'city': 'Chania City Center',
            'hotel': 'Hotel/Villa in Chania'
        };
        return locations[locationCode] || locationCode;
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
        this.elements.summaryTotal.textContent = `€${totalPrice.toFixed(2)}`;
        
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
            <span class="summary-value">€${optionPrice.toFixed(2)}</span>
        `;
        this.elements.additionalOptionsSummary.appendChild(optionElement);
    },
    
    /**
     * Form submit handler
     */
    handleFormSubmit: function(e) {
        if (e) e.preventDefault();
        
        if (!this.validateForm()) {
            return false;
        }
        
        // Show loading overlay
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        }
        
        // Get form data
        const formData = this.collectFormData();
        
        // Extract URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Get car selection ID
        const carId = urlParams.get('car-selection');
        
        // Parse car details
        let carMake = 'Unknown';
        let carModel = 'Unknown';
        let carName = '';
        let dailyRate = 0;
        
        // Try to extract car data from a format like "BMW 3 Series-60"
        if (carId && carId.includes('-')) {
            const parts = carId.split('-');
            carName = parts[0];
            dailyRate = parseFloat(parts[1]);
            
            // Try to split into make and model
            const nameParts = carName.split(' ');
            if (nameParts.length > 0) {
                carMake = nameParts[0];
                if (nameParts.length > 1) {
                    carModel = nameParts.slice(1).join(' ');
                }
            }
        } else if (carId) {
            carName = carId;
        }
        
        // Calculate rental period in days
        const pickupDate = urlParams.get('pickup-date');
        const returnDate = urlParams.get('dropoff-date');
        let days = 1;
        
        if (pickupDate && returnDate) {
            const start = new Date(pickupDate);
            const end = new Date(returnDate);
            const diffTime = Math.abs(end - start);
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            days = Math.max(1, days);
        }
        
        // Calculate total price
        const totalPrice = dailyRate * days;
        
        // Combine all data
        const completeBookingData = {
            pickupDate: pickupDate,
            returnDate: returnDate,
            pickupLocation: urlParams.get('pickup-location'),
            dropoffLocation: urlParams.get('dropoff-location'),
            pickupTime: urlParams.get('pickup-time'),
            dropoffTime: urlParams.get('dropoff-time'),
            carId: carId,
            carName: carName,
            carMake: carMake,
            carModel: carModel,
            dailyRate: dailyRate,
            rentalDays: days,
            totalPrice: totalPrice,
            specialRequests: urlParams.get('special-requests'),
            customer: formData,
            dateSubmitted: new Date().toISOString()
        };
        
        console.log('Complete booking data:', completeBookingData);
        
        // Submit immediately
        this.submitBooking(completeBookingData);
        
        return true;
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
        
        // Phone validation (country code + number)
        const phoneCode = document.getElementById('phoneCountryCode');
        const phoneInput = this.elements.phone;
        const phoneError = document.getElementById('phone-error');
        phoneError.textContent = '';
        phoneError.style.display = 'none';
        phoneCode.classList.remove('invalid');
        phoneInput.classList.remove('invalid');
        if (!phoneCode.value.trim() || !phoneInput.value.trim()) {
            isValid = false;
            phoneError.textContent = 'Phone number and country code are required';
            phoneError.style.display = 'block';
            phoneCode.classList.add('invalid');
            phoneInput.classList.add('invalid');
        } else if (!/^\+\d{1,4}$/.test(phoneCode.value.trim())) {
            isValid = false;
            phoneError.textContent = 'Country code must start with + and be 2-5 characters (e.g. +30)';
            phoneError.style.display = 'block';
            phoneCode.classList.add('invalid');
        } else if (!/^\d{6,15}$/.test(phoneInput.value.trim())) {
            isValid = false;
            phoneError.textContent = 'Phone number must be 6-15 digits';
            phoneError.style.display = 'block';
            phoneInput.classList.add('invalid');
        }
        
        // Email format validation
        if (this.elements.email.value.trim() && !this.isValidEmail(this.elements.email.value)) {
            isValid = false;
            this.showFieldError(this.elements.email, 'email-error', 'Please enter a valid email address');
        }
        
        // Age validation
        if (this.elements.age.value) {
            const age = parseInt(this.elements.age.value);
            if (age < 18) {
                isValid = false;
                this.showFieldError(this.elements.age, 'age-error', 'You must be at least 18 years old to rent a car');
            } else if (age < 25) {
                isValid = false;
                this.showFieldError(this.elements.age, 'age-error', 'You must be at least 25 years old to rent a car');
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
     * Collect form data
     */
    collectFormData: function() {
        const phoneCode = document.getElementById('phoneCountryCode');
        const phoneInput = this.elements.phone;
        return {
            firstName: this.elements.firstName.value.trim(),
            lastName: this.elements.lastName.value.trim(),
            email: this.elements.email.value.trim(),
            phone: (phoneCode.value.trim() + phoneInput.value.trim()),
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
        // Log the raw data for debugging
        console.log('Original booking data:', bookingData);
        
        // Show loading overlay if it exists
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        }
        
        // Get car make and model correctly
        const carMake = this.extractCarMake(bookingData);
        const carModel = this.extractCarModel(bookingData);
        
        // Calculate total price including add-ons
        const totalPrice = this.calculateTotalPrice(bookingData);
        const dailyRate = parseFloat(bookingData.dailyRate || (bookingData.selectedCar ? bookingData.selectedCar.price : 0));
        
        // Validate essential data before sending
        if (!bookingData.pickupDate || !bookingData.returnDate) {
            console.error('Missing required date information');
            alert('Booking error: Missing pickup or return date information');
            if (this.elements.loadingOverlay) {
                this.elements.loadingOverlay.style.display = 'none';
            }
            return;
        }
        
        if (!bookingData.customer || !bookingData.customer.firstName) {
            console.error('Missing customer information');
            alert('Booking error: Missing customer information');
            if (this.elements.loadingOverlay) {
                this.elements.loadingOverlay.style.display = 'none';
            }
            return;
        }
        
        // Prepare the booking data for the API - ensuring field names match server expectations
        const apiBookingData = {
            // Customer details - required fields in snake_case as expected by server
            customer_first_name: bookingData.customer.firstName,
            customer_last_name: bookingData.customer.lastName,
            customer_email: bookingData.customer.email,
            customer_phone: bookingData.customer.phone,
            customer_age: bookingData.customer.age,
            driver_license: bookingData.customer.driverLicense,
            license_expiration: bookingData.customer.licenseExpiry,
            country: bookingData.customer.nationality,
            
            // Dates and locations - required fields in snake_case
            pickup_date: bookingData.pickupDate,
            return_date: bookingData.returnDate,
            pickup_location: bookingData.pickupLocation,
            dropoff_location: bookingData.dropoffLocation || bookingData.pickupLocation,
            
            // Car details - required fields in snake_case
            car_make: carMake,
            car_model: carModel,
            daily_rate: dailyRate,
            total_price: totalPrice,
            
            // Add-ons - optional but should be included
            additional_driver: bookingData.customer.additionalOptions?.additionalDriver || false,
            full_insurance: bookingData.customer.additionalOptions?.fullInsurance || false,
            gps_navigation: bookingData.customer.additionalOptions?.gpsNavigation || false,
            child_seat: bookingData.customer.additionalOptions?.childSeat || false,
            
            // Other details
            special_requests: bookingData.specialRequests || '',
            rental_days: bookingData.rentalDays || this.calculateRentalDays(bookingData.pickupDate, bookingData.returnDate)
        };
        
        // Log the prepared data being sent to the API for debugging
        console.log('Sending booking data to API:', apiBookingData);
        
        // Make the API call to save the booking
        fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(apiBookingData)
        })
        .then(response => {
            console.log('API response status:', response.status);
            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Booking API response:', data);
            
            if (data.success && (data.booking_reference || data.useLocalStorage)) {
                // Handle both database and localStorage success cases
                const bookingReference = data.booking_reference || 'BK' + Date.now().toString().slice(-6);
                const status = 'pending';
                
                // Store the booking reference for confirmation
                localStorage.setItem('currentBooking', JSON.stringify({
                    ...bookingData,
                    bookingReference: bookingReference,
                    status: status
                }));
                
                // Store data for retrieval in booking confirmation
                sessionStorage.setItem('bookingParams', new URLSearchParams(window.location.search).toString());
                
                // Redirect to booking confirmation page with the reference
                window.location.href = `booking-confirmation?reference=${bookingReference}`;
            } else {
                console.error('Booking save failed:', data.error || 'Unknown error');
                alert('Failed to save booking: ' + (data.error || 'Unknown error'));
                
                // Hide loading overlay
                if (this.elements.loadingOverlay) {
                    this.elements.loadingOverlay.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error submitting booking:', error);
            alert('Error submitting booking: ' + error.message);
            
            // Hide loading overlay
            if (this.elements.loadingOverlay) {
                this.elements.loadingOverlay.style.display = 'none';
            }
        });
    },
    
    /**
     * Calculate rental days between two dates
     */
    calculateRentalDays: function(pickupDate, returnDate) {
        if (!pickupDate || !returnDate) return 1;
        
        try {
            const pickup = new Date(pickupDate);
            const dropoff = new Date(returnDate);
            const diffTime = Math.abs(dropoff - pickup);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(1, diffDays); // At least 1 day
        } catch (e) {
            console.error('Error calculating rental days:', e);
            return 1;
        }
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
    },
    
    /**
     * Extract car make from booking data
     */
    extractCarMake: function(bookingData) {
        // Try different possible locations for car make
        if (bookingData.selectedCar && bookingData.selectedCar.make) {
            return bookingData.selectedCar.make;
        }
        
        if (bookingData.carMake) {
            return bookingData.carMake;
        }
        
        if (bookingData.car && typeof bookingData.car === 'string') {
            // Try to extract make from a string like "Toyota Corolla"
            const parts = bookingData.car.split(' ');
            if (parts.length > 0) {
                return parts[0];
            }
        }
        
        return 'Unknown';
    },
    
    /**
     * Extract car model from booking data
     */
    extractCarModel: function(bookingData) {
        // Try different possible locations for car model
        if (bookingData.selectedCar && bookingData.selectedCar.model) {
            return bookingData.selectedCar.model;
        }
        
        if (bookingData.carModel) {
            return bookingData.carModel;
        }
        
        if (bookingData.carName) {
            return bookingData.carName;
        }
        
        if (bookingData.car && typeof bookingData.car === 'string') {
            // Try to extract model from a string like "Toyota Corolla"
            const parts = bookingData.car.split(' ');
            if (parts.length > 1) {
                return parts.slice(1).join(' ');
            }
        }
        
        return 'Unknown';
    },
    
    /**
     * Calculate total price from booking data
     */
    calculateTotalPrice: function(bookingData) {
        if (bookingData.totalPrice) {
            return parseFloat(bookingData.totalPrice).toFixed(2);
        }
        
        // If we have daily rate and rental duration, calculate
        let dailyRate = 0;
        if (bookingData.dailyRate) {
            dailyRate = parseFloat(bookingData.dailyRate);
        } else if (bookingData.selectedCar && bookingData.selectedCar.price) {
            dailyRate = parseFloat(bookingData.selectedCar.price);
        }
        
        let days = 1;
        if (bookingData.pickupDate && bookingData.returnDate) {
            const pickupDate = new Date(bookingData.pickupDate);
            const returnDate = new Date(bookingData.returnDate);
            const diffTime = Math.abs(returnDate - pickupDate);
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            days = Math.max(1, days); // At least 1 day
        }
        
        return (dailyRate * days).toFixed(2);
    },
    
    /**
     * Set up country code autofill for phone input
     */
    setupCountryPhoneAutofill: function() {
        const countryCodes = {
            'Greece': '+30',
            'United Kingdom': '+44',
            'United States': '+1',
            'France': '+33',
            'Germany': '+49',
            'Italy': '+39',
            'Spain': '+34',
            'Netherlands': '+31',
            'Belgium': '+32',
            'Sweden': '+46',
            'Norway': '+47',
            'Denmark': '+45',
            'Finland': '+358',
            'Switzerland': '+41',
            'Austria': '+43',
            'Portugal': '+351',
            'Ireland': '+353',
            'Poland': '+48',
            'Czech Republic': '+420',
            'Slovakia': '+421',
            'Hungary': '+36',
            'Romania': '+40',
            'Bulgaria': '+359',
            'Serbia': '+381',
            'Croatia': '+385',
            'Slovenia': '+386',
            'Turkey': '+90',
            'Russia': '+7',
            'Ukraine': '+380',
            'Australia': '+61',
            'Canada': '+1',
            'Cyprus': '+357',
            // ... add more as needed ...
        };
        const phoneInput = this.elements.phone;
        const countrySelect = this.elements.nationality;
        if (!phoneInput || !countrySelect) return;
        // Helper to set phone code
        function setPhoneCode(country) {
            const code = countryCodes[country];
            if (!code) return;
            if (!phoneInput.value || phoneInput.value.match(/^\+\d{1,4}$/)) {
                phoneInput.value = code;
            } else {
                const prevCode = Object.values(countryCodes).find(c => phoneInput.value.startsWith(c));
                if (prevCode) {
                    phoneInput.value = code + phoneInput.value.slice(prevCode.length);
                }
            }
            console.log('[CountryCode] Set phone code for', country, '->', code);
        }
        // Native change event
        countrySelect.addEventListener('change', function() {
            setPhoneCode(countrySelect.value);
        });
        // Robust Select2 event handler
        function attachSelect2Handler() {
            if (window.jQuery && $(countrySelect).data('select2')) {
                $(countrySelect).off('select2:select.countrycode');
                $(countrySelect).on('select2:select.countrycode', function(e) {
                    setPhoneCode(countrySelect.value);
                });
                console.log('[CountryCode] Select2 handler attached');
            } else {
                // Retry after a short delay if Select2 not ready
                setTimeout(attachSelect2Handler, 300);
            }
        }
        attachSelect2Handler();
        // On page load, if a country is already selected, prefill code
        if (countrySelect.value && countryCodes[countrySelect.value]) {
            setPhoneCode(countrySelect.value);
        }
    }
}; 