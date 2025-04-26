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
        // Initialize booking form elements
        this.bookingForm = document.getElementById('booking-form');
        if (!this.bookingForm) return;
        
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
        if (!field) return true;
        
        const formGroup = field.closest('.form-group');
        if (!formGroup) return true;
        
        const errorElement = formGroup.querySelector('.error-message');
        let isValid = true;
        let errorMessage = '';
        
        // Clear previous validation
        formGroup.classList.remove('error', 'success');
        if (errorElement) errorElement.textContent = '';
        
        // Skip validation for non-required empty fields
        if (!field.hasAttribute('required') && field.value.trim() === '') {
            return true;
        }
        
        // Required field validation
        if (field.hasAttribute('required') && field.value.trim() === '') {
            isValid = false;
            errorMessage = 'This field is required';
        } else {
            // Type-specific validation
            switch (field.type) {
                case 'email':
                    // Basic email validation
                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailPattern.test(field.value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;
                    
                case 'tel':
                    // Phone number validation - allow digits, spaces, and some special chars
                    const phonePattern = /^[+]?[\s./0-9()-]+$/;
                    if (!phonePattern.test(field.value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid phone number';
                    }
                    break;
                    
                case 'number':
                    // Number range validation
                    if (field.id === 'age' && parseInt(field.value) < 25) {
                        isValid = false;
                        errorMessage = 'You must be at least 25 years old to rent a car';
                    }
                    break;
                    
                case 'date':
                    // Date validation
                    const selectedDate = new Date(field.value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (selectedDate < today) {
                        isValid = false;
                        errorMessage = 'Date cannot be in the past';
                    }
                    
                    // Pickup and dropoff date validation
                    if (field.id === 'dropoff-date') {
                        const pickupDateInput = document.getElementById('pickup-date');
                        if (pickupDateInput && pickupDateInput.value) {
                            const pickupDate = new Date(pickupDateInput.value);
                            if (selectedDate < pickupDate) {
                                isValid = false;
                                errorMessage = 'Drop-off date cannot be earlier than pickup date';
                            }
                        }
                    }
                    break;
            }
        }
        
        // Custom field validation
        if (field.id === 'customer-name' && field.value.trim().length < 3) {
            isValid = false;
            errorMessage = 'Name must be at least 3 characters';
        }
        
        // Set validation state
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
    }
}; 