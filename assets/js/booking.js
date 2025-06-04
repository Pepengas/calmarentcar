/**
 * Booking Module - Handles all booking-related functionality
 */

import { showNotification } from './ui.js';
import { API_BASE_URL } from './config.js';

export const Booking = {
    formSteps: null,
    steps: null,
    stepTitles: null,
    nextBtn: null,
    prevBtn: null,
    currentStep: 1,
    bookingForm: null,
    
    init() {
        console.log('Booking module initialized');
        
        // Initialize booking form elements
        this.bookingForm = document.getElementById('booking-form');
        if (!this.bookingForm) {
            console.warn('Booking form not found');
            // Continue anyway for multi-page setup
        } else {
            console.log('Found booking form, initializing form elements');
        }
        
        this.formSteps = document.querySelectorAll('.form-step');
        this.steps = document.querySelectorAll('.step');
        this.stepTitles = document.querySelectorAll('.step-title');
        this.nextBtn = document.getElementById('to-step-2');
        this.prevBtn = document.getElementById('to-step-1');

        // Set up event listeners
        this.setupFormValidation();
        this.setupStepNavigation();
        this.setupAvailabilityCheck();
        this.setupFormSubmission();
        
        // Initialize multi-page booking process if on index page
        console.log('Current page:', this.getCurrentPage());
        this.initMultiPageBooking();
    },
    
    setupFormValidation() {
        if (!this.bookingForm) return;
        
        const formElements = this.bookingForm.querySelectorAll('.form-group input, .form-group select');
        formElements.forEach(element => {
            element.addEventListener('blur', () => this.validateField(element));
            element.addEventListener('input', () => this.validateField(element));
            element.addEventListener('change', () => this.validateField(element));
        });
    },
    
    setupStepNavigation() {
        if (!this.nextBtn || !this.prevBtn) return;
        
        this.nextBtn.addEventListener('click', () => {
            // Validate first step fields before proceeding
            const step1Fields = document.querySelectorAll('#step-1 input[required], #step-1 select[required]');
            let isStep1Valid = true;
            
            step1Fields.forEach(field => {
                if (!this.validateField(field)) {
                    isStep1Valid = false;
                }
            });
            
            // Also ensure availability check passed (button isn't disabled)
            if (isStep1Valid && !this.nextBtn.disabled) {
                this.goToStep(2);
            } else if (isStep1Valid && this.nextBtn.disabled) {
                showNotification('Please select an available car and valid dates.', 'error');
            } else {
                // Focus the first invalid field
                const firstInvalidField = document.querySelector('#step-1 .form-group.error input, #step-1 .form-group.error select');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
                showNotification('Please complete all required fields in this step.', 'error');
            }
        });
        
        this.prevBtn.addEventListener('click', () => {
            this.goToStep(1);
        });
    },
    
    setupAvailabilityCheck() {
        const carSelectionDropdown = document.getElementById('car-selection');
        const pickupDateInput = document.getElementById('pickup-date');
        const dropoffDateInput = document.getElementById('dropoff-date');
        
        if (carSelectionDropdown) carSelectionDropdown.addEventListener('change', () => this.checkAvailability());
        if (pickupDateInput) pickupDateInput.addEventListener('change', () => this.checkAvailability());
        if (dropoffDateInput) dropoffDateInput.addEventListener('change', () => this.checkAvailability());
    },
    
    setupFormSubmission() {
        if (!this.bookingForm) return;
        
        this.bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate all form fields
            const allRequiredFields = this.bookingForm.querySelectorAll('input[required], select[required]');
            let isFormValid = true;
            
            allRequiredFields.forEach(field => {
                if (!this.validateField(field)) {
                    isFormValid = false;
                }
            });
            
            if (!isFormValid) {
                showNotification('Please complete all required fields correctly.', 'error');
                return;
            }
            
            // Collect form data
            const formData = new FormData(this.bookingForm);
            const bookingData = {};
            
            for (const [key, value] of formData.entries()) {
                bookingData[key] = value;
            }
            
            // Disable submit button
            const submitButton = this.bookingForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
            
            try {
                // Submit booking data
                const response = await fetch(`${API_BASE_URL}/api/book`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bookingData)
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // Show success message
                    this.showBookingSuccess(data);
                } else {
                    // Show error
                    showNotification(data.message || 'An error occurred while processing your booking.', 'error');
                }
            } catch (error) {
                console.error('Booking error:', error);
                showNotification('There was a problem submitting your booking. Please try again later.', 'error');
            } finally {
                // Re-enable submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Complete Booking <i class="fas fa-arrow-right"></i>';
                }
            }
        });
    },
    
    async checkAvailability() {
        const carSelectionDropdown = document.getElementById('car-selection');
        const pickupDateInput = document.getElementById('pickup-date');
        const dropoffDateInput = document.getElementById('dropoff-date');
        
        if (!carSelectionDropdown || !pickupDateInput || !dropoffDateInput || !this.nextBtn) return;
        
        const carId = carSelectionDropdown.value;
        const pickupDate = pickupDateInput.value;
        const dropoffDate = dropoffDateInput.value;
        
        if (carId && pickupDate && dropoffDate) {
            if (new Date(dropoffDate) < new Date(pickupDate)) {
                showNotification('Drop-off date cannot be earlier than pickup date.', 'error');
                this.nextBtn.disabled = true;
                return;
            }
            
            try {
                this.nextBtn.textContent = 'Checking...';
                this.nextBtn.disabled = true;
                
                const response = await fetch(`${API_BASE_URL}/api/cars/availability?carId=${encodeURIComponent(carId)}&pickupDate=${encodeURIComponent(pickupDate)}&dropoffDate=${encodeURIComponent(dropoffDate)}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.available) {
                    console.log(`Car ${carId} is available from ${pickupDate} to ${dropoffDate}`);
                    showNotification('Car is available for selected dates.', 'success', 2000);
                    this.nextBtn.disabled = false;
                } else {
                    console.warn(`Car ${carId} is NOT available from ${pickupDate} to ${dropoffDate}`);
                    showNotification(data.message || 'Selected car is not available for these dates.', 'error');
                    this.nextBtn.disabled = true;
                }
            } catch (error) {
                console.error('Failed to check availability:', error);
                showNotification('Could not check car availability. Please try again.', 'error');
                this.nextBtn.disabled = true;
            } finally {
                this.nextBtn.textContent = 'Continue';
            }
        } else {
            // Don't reset button if it's already checking
            if (this.nextBtn.textContent !== 'Checking...') {
                const hasErrors = !!this.bookingForm.querySelector('#step-1 .form-group.error');
                this.nextBtn.disabled = hasErrors; // Disable only if there are existing errors
            }
        }
    },
    
    validateField(field) {
        if (!field) {
            console.warn('Cannot validate: field is null or undefined');
            return false;
        }
        
        const fieldName = field.name;
        const value = field.value.trim();
        
        // Try to find the form group container
        const formGroup = field.closest('.form-group');
        if (!formGroup) {
            console.warn(`Field ${fieldName} has no form-group parent`);
            // Basic validation without UI feedback
            if (field.required && value === '') {
                return false;
            }
            return true;
        }
        
        const errorElement = formGroup.querySelector('.validation-message');
        if (!errorElement) {
            console.warn(`Field ${fieldName} has no validation-message element`);
            // Basic validation without UI feedback
            if (field.required && value === '') {
                return false;
            }
            return true;
        }
        
        // Reset previous validation state
        formGroup.classList.remove('error', 'success');
        errorElement.textContent = '';
        errorElement.style.display = 'none'; // Hide error message initially
        
        let isValid = true;
        let errorMessage = '';
        
        // Check required fields
        if (field.hasAttribute('required') && value === '') {
            errorMessage = 'This field is required';
            isValid = false;
        }
        
        // Field-specific validations (only if not empty or required check passed)
        if (isValid && value !== '') { 
            switch(fieldName) {
                case 'pickup-date':
                case 'dropoff-date':
                    const dateValue = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Compare dates only
                    if (dateValue < today) {
                        errorMessage = 'Date cannot be in the past.';
                        isValid = false;
                    }
                    // Dropoff vs Pickup check
                    if (fieldName === 'dropoff-date') {
                        const pickupValue = document.getElementById('pickup-date')?.value;
                        if (pickupValue && new Date(value) < new Date(pickupValue)) {
                            errorMessage = 'Drop-off date cannot be before pickup date.';
                            isValid = false;
                        }
                    }
                    break;
                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        errorMessage = 'Please enter a valid email address.';
                        isValid = false;
                    }
                    break;
                case 'phone':
                    // Basic phone validation (e.g., allows +, numbers, spaces, min length)
                    const phoneRegex = /^[+\d\s]{8,}$/;
                    if (!phoneRegex.test(value)) {
                        errorMessage = 'Please enter a valid phone number.';
                        isValid = false;
                    }
                    break;
                case 'age':
                    const age = parseInt(value);
                    if (isNaN(age) || age < 25 || age > 90) { // Added upper bound
                        errorMessage = 'Age must be between 25 and 90.';
                        isValid = false;
                    }
                    break;
                // Add other specific validations if needed (e.g., time format)
            }
        }
        
        // Show error or success state
        if (!isValid) {
            this.showError(formGroup, errorElement, errorMessage);
        } else {
            this.showSuccess(formGroup);
        }
        
        return isValid;
    },
    
    showError(formGroup, errorElement, message) {
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    },
    
    showSuccess(formGroup) {
        formGroup.classList.remove('error');
        formGroup.classList.add('success');
    },
    
    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.formSteps.length) return;
        
        this.currentStep = stepNumber;
        
        // Update form steps visibility
        this.formSteps.forEach((step, index) => {
            if (index + 1 === stepNumber) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
        
        // Update step indicators
        this.steps.forEach((step, index) => {
            if (index + 1 === stepNumber) {
                step.classList.add('active');
            } else if (index + 1 < stepNumber) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else {
                step.classList.remove('completed', 'active');
            }
        });
        
        // Update step titles
        this.stepTitles.forEach((title, index) => {
            if (index + 1 === stepNumber) {
                title.classList.add('active');
            } else {
                title.classList.remove('active');
            }
        });
        
        // Scroll to top of form
        this.bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    
    showBookingSuccess(data) {
        if (!this.bookingForm) return;
        
        // Get booking details
        const carName = this.getCarName(document.getElementById('car-selection').value);
        const pickupLocation = document.getElementById('pickup-location').value;
        const dropoffLocation = document.getElementById('dropoff-location').value;
        const pickupDate = document.getElementById('pickup-date').value;
        const dropoffDate = document.getElementById('dropoff-date').value;
        const customerName = document.getElementById('customer-name').value;
        
        // Generate confirmation
        const bookingId = data.booking_id || this.generateBookingReference();
        
        // Create success message
        const successHtml = `
            <div class="booking-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Booking Confirmed!</h3>
                <p>Thank you, ${customerName}. Your car rental has been successfully booked.</p>
                
                <div class="booking-details">
                    <div class="detail-item">
                        <span class="detail-label">Booking Reference:</span>
                        <span class="detail-value">${bookingId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Car:</span>
                        <span class="detail-value">${carName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pick-up:</span>
                        <span class="detail-value">${this.formatDisplayDate(pickupDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Drop-off:</span>
                        <span class="detail-value">${this.formatDisplayDate(dropoffDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Location:</span>
                        <span class="detail-value">${pickupLocation}</span>
                    </div>
                </div>
                
                <p class="confirmation-message">A confirmation email has been sent to your email address.</p>
                
                <button class="btn btn-primary" id="new-booking-btn">Make Another Booking</button>
            </div>
        `;
        
        // Display success message
        this.bookingForm.innerHTML = successHtml;
        
        // Add event listener for new booking button
        const newBookingBtn = document.getElementById('new-booking-btn');
        if (newBookingBtn) {
            newBookingBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
        
        // Scroll to success message
        this.bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    
    getCarName(carValue) {
        const carSelectElement = document.getElementById('car-selection');
        if (carSelectElement) {
            const selectedOption = carSelectElement.querySelector(`option[value="${carValue}"]`);
            return selectedOption ? selectedOption.textContent.split('-')[0].trim() : 'Selected car';
        }
        return 'Selected car';
    },
    
    formatDisplayDate(dateString) {
        const date = new Date(dateString);
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },
    
    generateBookingReference() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    
    // Initialize multi-page booking process
    initMultiPageBooking() {
        const currentPage = this.getCurrentPage();
        
        // Set up index page for multi-page flow
        if (currentPage === 'index') {
            const bookButton = document.getElementById('search-cars-btn');
            if (bookButton) {
                console.log('Found search-cars-btn button, adding event listener');
                bookButton.addEventListener('click', (e) => {
                    // Get form data from step 1
                    if (!this.validateStep1()) {
                        e.preventDefault();
                        return;
                    }
                    
                    // Redirect to choose-car.html with query parameters
                    const form = document.getElementById('booking-form');
                    if (form) {
                        e.preventDefault();
                        const formData = new FormData(form);
                        const queryParams = new URLSearchParams();
                        
                        // Add all form fields to the URL
                        for (const [key, value] of formData.entries()) {
                            if (key && value) {
                                queryParams.append(key, value);
                            }
                        }
                        
                        window.location.href = `choose-car.html?${queryParams.toString()}`;
                    }
                });
            } else {
                console.warn('Search cars button not found with ID search-cars-btn');
                // As a fallback, try to find by class name
                const altButton = document.querySelector('.next-step');
                if (altButton) {
                    console.log('Found next-step button, adding event listener');
                    altButton.addEventListener('click', (e) => {
                        // Get form data from step 1
                        if (!this.validateStep1()) {
                            e.preventDefault();
                            return;
                        }
                        
                        // Redirect to choose-car.html with query parameters
                        const form = document.getElementById('booking-form');
                        if (form) {
                            e.preventDefault();
                            const formData = new FormData(form);
                            const queryParams = new URLSearchParams();
                            
                            // Add all form fields to the URL
                            for (const [key, value] of formData.entries()) {
                                if (key && value) {
                                    queryParams.append(key, value);
                                }
                            }
                            
                            window.location.href = `choose-car.html?${queryParams.toString()}`;
                        }
                    });
                } else {
                    console.error('No search cars button found by ID or class');
                }
            }
        }
        
        // Set up choose-car page
        else if (currentPage === 'choose-car') {
            this.initChooseCarPage();
        }
        
        // Set up personal-info page
        else if (currentPage === 'personal-info') {
            this.initPersonalInfoPage();
        }
        
        // Set up booking-confirmation page
        else if (currentPage === 'booking-confirmation') {
            this.initBookingConfirmationPage();
        }
    },
    
    // Get current page from URL
    getCurrentPage() {
        const path = window.location.pathname;
        const pageName = path.split('/').pop().split('.')[0];
        return pageName || 'index';
    },
    
    // Validate step 1 of the booking form
    validateStep1() {
        console.log('Validating step 1 fields');
        const form = document.getElementById('booking-form');
        if (!form) {
            console.error('Cannot validate: booking form not found');
            return false;
        }
        
        const step1Fields = form.querySelectorAll('#step-1 input[required], #step-1 select[required]');
        if (step1Fields.length === 0) {
            console.warn('No required fields found in step 1');
            
            // As a fallback, try to validate all required fields in the form
            const allRequiredFields = form.querySelectorAll('input[required], select[required]');
            if (allRequiredFields.length === 0) {
                console.warn('No required fields found in the form');
                return true; // Assume valid if no required fields
            }
            
            let isFormValid = true;
            allRequiredFields.forEach(field => {
                console.log('Validating field:', field.name);
                if (!this.validateField(field)) {
                    isFormValid = false;
                }
            });
            
            if (!isFormValid) {
                const firstInvalidField = form.querySelector('.form-group.error input, .form-group.error select');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
                showNotification('Please complete all required fields.', 'error');
            }
            
            return isFormValid;
        }
        
        let isStep1Valid = true;
        
        step1Fields.forEach(field => {
            console.log('Validating field:', field.name);
            if (!this.validateField(field)) {
                isStep1Valid = false;
            }
        });
        
        if (!isStep1Valid) {
            const firstInvalidField = document.querySelector('#step-1 .form-group.error input, #step-1 .form-group.error select');
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
            showNotification('Please complete all required fields in this step.', 'error');
        }
        
        return isStep1Valid;
    },
    
    // Initialize the Choose Car page
    initChooseCarPage() {
        // Load trip details from URL parameters and display in summary
        const urlParams = new URLSearchParams(window.location.search);
        this.displayTripSummary(urlParams);
        
        // Load available cars based on trip details
        this.loadAvailableCars(urlParams);
        
        // Set up continue button functionality
        const continueBtn = document.querySelector('.car-select-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                // Get selected car
                const selectedCar = document.querySelector('input[name="car-selection"]:checked');
                if (!selectedCar) {
                    showNotification('Please select a car to continue.', 'error');
                    return;
                }
                
                // Add car selection to URL parameters
                urlParams.set('car-selection', selectedCar.value);
                
                // Add special requests to URL parameters if any
                const specialRequests = [];
                document.querySelectorAll('input[name="special-requests"]:checked').forEach(req => {
                    specialRequests.push(req.value);
                });
                
                if (specialRequests.length > 0) {
                    urlParams.set('special-requests', specialRequests.join(','));
                }
                
                // Add other requests
                const otherRequestsInput = document.getElementById('other-requests');
                if (otherRequestsInput && otherRequestsInput.value.trim()) {
                    urlParams.set('other-requests', otherRequestsInput.value.trim());
                }
                
                // Redirect to personal info page
                window.location.href = `personal-info.html?${urlParams.toString()}`;
            });
        }
    },
    
    // Initialize the Personal Info page
    initPersonalInfoPage() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check if we have all required information
        if (!urlParams.get('pickup-location') || !urlParams.get('pickup-date') || 
            !urlParams.get('dropoff-date') || !urlParams.get('car-selection')) {
            showNotification('Missing booking information. Please start again.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            return;
        }
        
        // Display booking summary
        this.displayBookingSummary(urlParams);
        
        // Set up back button
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.history.back();
            });
        }
        
        // Set up form submission
        const personalInfoForm = document.getElementById('personal-info-form');
        if (personalInfoForm) {
            personalInfoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Validate form
                if (!this.validatePersonalInfoForm()) {
                    return;
                }
                
                // Collect all data
                const formData = new FormData(personalInfoForm);
                const bookingData = {};
                
                // Add URL parameters to booking data
                for (const [key, value] of urlParams.entries()) {
                    bookingData[key] = value;
                }
                
                // Add form data to booking data
                for (const [key, value] of formData.entries()) {
                    bookingData[key] = value;
                }
                
                // Process booking (in a real app, send to server)
                this.processBooking(bookingData);
            });
        }
    },
    
    // Initialize the Booking Confirmation page
    initBookingConfirmationPage() {
        // Check if we have a booking reference in session storage
        const bookingReference = sessionStorage.getItem('bookingReference');
        
        if (!bookingReference) {
            // If no booking reference, show an error and redirect to home
            showNotification('No booking information found. Redirecting to home page.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            return;
        }
        
        // Display booking reference
        const bookingReferenceElement = document.getElementById('booking-reference-number');
        if (bookingReferenceElement) {
            bookingReferenceElement.textContent = bookingReference;
        }
        
        // Load booking details from session storage
        this.displayConfirmationDetails();
        
        // Add functionality to print button
        const printButton = document.getElementById('print-button');
        if (printButton) {
            printButton.addEventListener('click', () => {
                window.print();
            });
        }
    },
    
    // Display trip summary on choose-car page
    displayTripSummary(urlParams) {
        const pickupLocation = urlParams.get('pickup-location');
        const dropoffLocation = urlParams.get('dropoff-location');
        const pickupDate = urlParams.get('pickup-date');
        const pickupTime = urlParams.get('pickup-time');
        const dropoffDate = urlParams.get('dropoff-date');
        const dropoffTime = urlParams.get('dropoff-time');
        
        // Update summary elements
        this.updateElement('summary-pickup-location', this.getLocationName(pickupLocation));
        this.updateElement('summary-dropoff-location', this.getLocationName(dropoffLocation || pickupLocation));
        this.updateElement('summary-pickup-date', this.formatDisplayDate(pickupDate) + ' ' + this.formatTime(pickupTime));
        this.updateElement('summary-dropoff-date', this.formatDisplayDate(dropoffDate) + ' ' + this.formatTime(dropoffTime));
    },
    
    // Load available cars on choose-car page
    loadAvailableCars(urlParams) {
        const pickupDate = urlParams.get('pickup-date');
        const dropoffDate = urlParams.get('dropoff-date');
        const carsGrid = document.getElementById('available-cars');
        
        if (!carsGrid) return;
        
        // In a real app, fetch from server
        // For demo, we'll load mock data
        setTimeout(() => {
            // Clear loading indicator
            carsGrid.innerHTML = '';
            
            // Add sample cars
            const cars = this.getMockCars();
            
            cars.forEach(car => {
                const carCard = document.createElement('div');
                carCard.className = 'car-card card-visible';
                carCard.innerHTML = `
                    <div class="car-image">
                        <img src="${car.image}" alt="${car.name}" loading="lazy">
                    </div>
                    <div class="car-details">
                        <h3>${car.name}</h3>
                        <div class="car-features">
                            <span><i class="fas fa-users"></i> ${car.seats} Seats</span>
                            <span><i class="fas fa-suitcase"></i> ${car.luggage} Luggage</span>
                            <span><i class="fas fa-cog"></i> ${car.transmission}</span>
                            <span><i class="fas fa-snowflake"></i> ${car.ac}</span>
                        </div>
                        <p>${car.description}</p>
                        <div class="car-pricing">
                            <span class="price">€${car.pricePerDay}/day</span>
                        </div>
                        <div class="car-selection">
                            <input type="radio" id="car-${car.id}" name="car-selection" value="${car.id}">
                            <label for="car-${car.id}" class="btn btn-primary">Select</label>
                        </div>
                    </div>
                `;
                carsGrid.appendChild(carCard);
            });
            
            // Add car selection behavior
            document.querySelectorAll('input[name="car-selection"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    // Enable continue button when a car is selected
                    const continueBtn = document.querySelector('.car-select-continue');
                    if (continueBtn) {
                        continueBtn.disabled = false;
                    }
                    
                    // Highlight selected car
                    document.querySelectorAll('.car-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    radio.closest('.car-card').classList.add('selected');
                });
            });
            
            // Add continue button if not already present
            if (!document.querySelector('.car-select-continue')) {
                const continueButtonDiv = document.createElement('div');
                continueButtonDiv.className = 'continue-button-container';
                continueButtonDiv.style.textAlign = 'center';
                continueButtonDiv.style.marginTop = '30px';
                
                const continueButton = document.createElement('button');
                continueButton.className = 'btn btn-primary car-select-continue';
                continueButton.textContent = 'Continue to Personal Information';
                continueButton.disabled = true;
                
                continueButtonDiv.appendChild(continueButton);
                carsGrid.parentNode.appendChild(continueButtonDiv);
            }
        }, 1000);
    },
    
    // Display booking summary on personal-info page
    displayBookingSummary(urlParams) {
        // Display trip details
        this.displayTripSummary(urlParams);
        
        // Display selected car details
        const carId = urlParams.get('car-selection');
        const selectedCarDetails = document.getElementById('selected-car-details');
        if (selectedCarDetails && carId) {
            const car = this.getMockCars().find(c => c.id === carId);
            if (car) {
                selectedCarDetails.innerHTML = `
                    <div class="selected-car">
                        <h4>${car.name}</h4>
                        <img src="${car.image}" alt="${car.name}" style="max-width: 100%; height: auto; margin: 10px 0;">
                        <div class="car-features">
                            <span><i class="fas fa-users"></i> ${car.seats} Seats</span>
                            <span><i class="fas fa-suitcase"></i> ${car.luggage} Luggage</span>
                            <span><i class="fas fa-cog"></i> ${car.transmission}</span>
                        </div>
                    </div>
                `;
                
                // Update price breakdown
                this.updateElement('daily-rate', `€${car.pricePerDay}`);
                
                // Calculate rental days
                const pickupDate = new Date(urlParams.get('pickup-date'));
                const dropoffDate = new Date(urlParams.get('dropoff-date'));
                const rentalDays = Math.ceil((dropoffDate - pickupDate) / (1000 * 60 * 60 * 24));
                this.updateElement('rental-days', rentalDays);
                
                // Calculate subtotal
                const subtotal = car.pricePerDay * rentalDays;
                this.updateElement('subtotal', `€${subtotal}`);
                
                // Calculate special requests cost if any
                const specialRequests = urlParams.get('special-requests');
                let specialRequestsCost = 0;
                
                if (specialRequests) {
                    const specialRequestsList = document.getElementById('special-requests-list');
                    const specialRequestsArray = specialRequests.split(',');
                    const specialRequestsSummary = document.getElementById('special-requests-summary');
                    
                    if (specialRequestsArray.length > 0 && specialRequestsList && specialRequestsSummary) {
                        specialRequestsSummary.style.display = 'block';
                        specialRequestsList.innerHTML = '';
                        
                        specialRequestsArray.forEach(req => {
                            const requestInfo = this.getSpecialRequestInfo(req);
                            specialRequestsCost += requestInfo.cost * rentalDays;
                            
                            const li = document.createElement('li');
                            li.textContent = `${requestInfo.name} (€${requestInfo.cost}/day)`;
                            specialRequestsList.appendChild(li);
                        });
                        
                        // Show special requests cost
                        const specialRequestsCostItem = document.getElementById('special-requests-cost-item');
                        const specialRequestsCostElement = document.getElementById('special-requests-cost');
                        
                        if (specialRequestsCostItem && specialRequestsCostElement) {
                            specialRequestsCostItem.style.display = 'block';
                            specialRequestsCostElement.textContent = `€${specialRequestsCost}`;
                            specialRequestsCostElement.setAttribute('data-cost', specialRequestsCost);
                        }
                    }
                }
                
                // Add other requests if any
                const otherRequests = urlParams.get('other-requests');
                if (otherRequests && document.getElementById('other-requests-text')) {
                    document.getElementById('other-requests-text').textContent = `Additional notes: ${otherRequests}`;
                    document.getElementById('other-requests-text').style.display = 'block';
                }
                
                // Calculate total
                const total = subtotal + specialRequestsCost;
                this.updateElement('total-price', `€${total}`);
            }
        }
    },
    
    // Display confirmation details on booking-confirmation page
    displayConfirmationDetails() {
        // Get customer details from session storage
        const customerName = sessionStorage.getItem('customerName');
        const customerEmail = sessionStorage.getItem('customerEmail');
        const customerPhone = sessionStorage.getItem('customerPhone');
        
        // Update elements
        this.updateElement('conf-customer-name', customerName);
        this.updateElement('conf-customer-email', customerEmail);
        this.updateElement('conf-customer-phone', customerPhone);
        
        // Get booking details from URL parameters (stored in session)
        const urlParamsString = sessionStorage.getItem('bookingParams');
        if (urlParamsString) {
            const urlParams = new URLSearchParams(urlParamsString);
            
            // Display trip details
            this.updateElement('conf-pickup-location', this.getLocationName(urlParams.get('pickup-location')));
            this.updateElement('conf-dropoff-location', this.getLocationName(urlParams.get('dropoff-location') || urlParams.get('pickup-location')));
            
            const pickupDate = urlParams.get('pickup-date');
            const pickupTime = urlParams.get('pickup-time');
            this.updateElement('conf-pickup-datetime', this.formatDisplayDate(pickupDate) + ' ' + this.formatTime(pickupTime));
            
            const dropoffDate = urlParams.get('dropoff-date');
            const dropoffTime = urlParams.get('dropoff-time');
            this.updateElement('conf-dropoff-datetime', this.formatDisplayDate(dropoffDate) + ' ' + this.formatTime(dropoffTime));
            
            // Calculate rental duration
            const pickupDateObj = new Date(pickupDate);
            const dropoffDateObj = new Date(dropoffDate);
            const rentalDays = Math.ceil((dropoffDateObj - pickupDateObj) / (1000 * 60 * 60 * 24));
            this.updateElement('conf-duration', `${rentalDays} days`);
            
            // Display car details
            const carId = urlParams.get('car-selection');
            const carDetailsElement = document.getElementById('conf-car-details');
            if (carDetailsElement && carId) {
                const car = this.getMockCars().find(c => c.id === carId);
                if (car) {
                    carDetailsElement.innerHTML = `
                        <div class="car-info">
                            <h4>${car.name}</h4>
                            <img src="${car.image}" alt="${car.name}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;">
                            <div class="car-specs">
                                <p><strong>Category:</strong> ${car.category}</p>
                                <p><strong>Seats:</strong> ${car.seats}</p>
                                <p><strong>Transmission:</strong> ${car.transmission}</p>
                                <p><strong>Air Conditioning:</strong> ${car.ac}</p>
                            </div>
                        </div>
                    `;
                    
                    // Update price details
                    this.updateElement('conf-daily-rate', `€${car.pricePerDay}`);
                    this.updateElement('conf-days', rentalDays);
                    
                    const subtotal = car.pricePerDay * rentalDays;
                    this.updateElement('conf-subtotal', `€${subtotal}`);
                    
                    // Add special requests if any
                    const specialRequestsStr = sessionStorage.getItem('specialRequests');
                    let specialRequestsCost = 0;
                    
                    if (specialRequestsStr) {
                        try {
                            const specialRequests = JSON.parse(specialRequestsStr);
                            const specialRequestsList = document.getElementById('conf-special-requests-list');
                            const specialRequestsSection = document.getElementById('conf-special-requests-section');
                            
                            if (specialRequests.length > 0 && specialRequestsList && specialRequestsSection) {
                                specialRequestsSection.style.display = 'block';
                                specialRequestsList.innerHTML = '';
                                
                                specialRequests.forEach(req => {
                                    const requestInfo = this.getSpecialRequestInfo(req);
                                    specialRequestsCost += requestInfo.cost * rentalDays;
                                    
                                    const li = document.createElement('li');
                                    li.textContent = `${requestInfo.name} (€${requestInfo.cost}/day)`;
                                    specialRequestsList.appendChild(li);
                                });
                                
                                // Show special requests cost
                                const specialRequestsCostItem = document.getElementById('conf-special-requests-item');
                                const specialRequestsCostElement = document.getElementById('conf-special-requests-cost');
                                
                                if (specialRequestsCostItem && specialRequestsCostElement) {
                                    specialRequestsCostItem.style.display = 'block';
                                    specialRequestsCostElement.textContent = `€${specialRequestsCost}`;
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing special requests:', e);
                        }
                    }
                    
                    // Add other requests if any
                    const otherRequests = sessionStorage.getItem('otherRequests');
                    if (otherRequests && document.getElementById('conf-other-requests-text')) {
                        document.getElementById('conf-other-requests-text').textContent = `Additional notes: ${otherRequests}`;
                        document.getElementById('conf-other-requests-text').style.display = 'block';
                    }
                    
                    // Calculate total
                    const total = subtotal + specialRequestsCost;
                    this.updateElement('conf-total', `€${total}`);
                }
            }
        }
    },
    
    // Validate personal info form
    validatePersonalInfoForm() {
        const requiredFields = document.querySelectorAll('#personal-info-form input[required], #personal-info-form select[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            const firstInvalidField = document.querySelector('#personal-info-form .form-group.error input, #personal-info-form .form-group.error select');
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
            showNotification('Please complete all required fields correctly.', 'error');
        }
        
        return isValid;
    },
    
    // Process booking data
    processBooking(bookingData) {
        // Show loading indicator
        const submitButton = document.querySelector('#personal-info-form button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
        
        // In a real app, send to server
        // For demo, we'll use setTimeout
        setTimeout(() => {
            try {
                // Generate a booking reference
                const bookingRef = 'CALMA-' + Math.floor(100000 + Math.random() * 900000);
                
                // Store booking data in session storage
                sessionStorage.setItem('bookingReference', bookingRef);
                sessionStorage.setItem('customerName', `${bookingData['first-name']} ${bookingData['last-name']}`);
                sessionStorage.setItem('customerEmail', bookingData.email);
                sessionStorage.setItem('customerPhone', bookingData.phone);
                
                // Store URL parameters for the confirmation page
                const urlParams = new URLSearchParams();
                for (const key in bookingData) {
                    if (Object.hasOwnProperty.call(bookingData, key)) {
                        urlParams.append(key, bookingData[key]);
                    }
                }
                sessionStorage.setItem('bookingParams', urlParams.toString());
                
                // Store the complete booking data in localStorage for the payment page
                const fullBookingData = {
                    bookingReference: bookingRef,
                    pickupLocation: sessionStorage.getItem('pickupLocation'),
                    pickupDate: sessionStorage.getItem('pickupDate'),
                    returnDate: sessionStorage.getItem('returnDate'),
                    selectedCar: this.selectedCar || { 
                        id: sessionStorage.getItem('carId'),
                        make: sessionStorage.getItem('carMake'),
                        model: sessionStorage.getItem('carModel'),
                        price: parseFloat(sessionStorage.getItem('carPrice') || 0)
                    },
                    durationDays: parseInt(sessionStorage.getItem('duration') || 1),
                    totalPrice: parseFloat(sessionStorage.getItem('totalPrice') || 0),
                    customer: {
                        firstName: bookingData['first-name'],
                        lastName: bookingData['last-name'],
                        email: bookingData.email,
                        phone: bookingData.phone,
                        age: bookingData.age || 0,
                        driverLicense: bookingData.license,
                        additionalRequests: bookingData.requests
                    }
                };
                
                // Save to sessionStorage as bookingData for customer-info.js
                sessionStorage.setItem('bookingData', JSON.stringify(fullBookingData));
                
                // Redirect to payment page
                window.location.href = 'payment.html';
            } catch (error) {
                console.error('Error processing booking:', error);
                showNotification('An error occurred while processing your booking. Please try again.', 'error');
                
                // Re-enable submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Complete Booking';
                }
            }
        }, 1500);
    },
    
    // Helper function to update element text content
    updateElement(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text || 'Not specified';
        }
    },
    
    // Helper function to get location name
    getLocationName(locationCode) {
        if (!locationCode) return 'Not specified';
        
        const locations = {
            'airport': 'Chania International Airport',
            'port': 'Chania Port',
            'city': 'Chania City Center',
            'hotel': 'Hotel/Villa in Chania'
        };
        return locations[locationCode] || locationCode;
    },
    
    // Helper function to format time
    formatTime(timeString) {
        if (!timeString) return '';
        try {
            const [hours, minutes] = timeString.split(':');
            return `${hours}:${minutes}`;
        } catch(e) {
            return timeString;
        }
    },
    
    // Helper function to format date
    formatDisplayDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    },
    
    // Helper function to get special request info
    getSpecialRequestInfo(requestCode) {
        const requestsInfo = {
            'gps': { name: 'GPS Navigation System', cost: 5 },
            'baby-seat': { name: 'Baby/Child Seat', cost: 3 },
            'additional-driver': { name: 'Additional Driver', cost: 7 },
            'full-insurance': { name: 'Full Insurance Coverage', cost: 10 }
        };
        return requestsInfo[requestCode] || { name: requestCode, cost: 0 };
    },
    
    // Mock data for cars
    getMockCars() {
        return [
            {
                id: 'economy1',
                name: 'Fiat Panda or similar',
                category: 'Economy',
                description: 'Compact and fuel-efficient, perfect for city driving and small groups.',
                image: 'images/cars/fiat-panda.jpg',
                seats: 4,
                luggage: 2,
                transmission: 'Manual',
                ac: 'A/C',
                pricePerDay: 35
            },
            {
                id: 'compact1',
                name: 'Toyota Yaris or similar',
                category: 'Compact',
                description: 'Reliable and comfortable compact car with good fuel economy.',
                image: 'images/cars/toyota-yaris.jpg',
                seats: 5,
                luggage: 2,
                transmission: 'Manual',
                ac: 'A/C',
                pricePerDay: 40
            },
            {
                id: 'midsize1',
                name: 'Volkswagen Golf or similar',
                category: 'Mid-size',
                description: 'Spacious and comfortable mid-size car with modern features.',
                image: 'images/cars/vw-golf.jpg',
                seats: 5,
                luggage: 3,
                transmission: 'Manual',
                ac: 'A/C',
                pricePerDay: 55
            },
            {
                id: 'suv1',
                name: 'Nissan Qashqai or similar',
                category: 'SUV',
                description: 'Versatile SUV with higher clearance, perfect for exploring Crete.',
                image: 'images/cars/nissan-qashqai.jpg',
                seats: 5,
                luggage: 4,
                transmission: 'Automatic',
                ac: 'A/C',
                pricePerDay: 75
            }
        ];
    }
}; 
