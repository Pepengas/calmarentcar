/**
 * Calma Car Rental Website - Main JavaScript
 * This file handles all the interactive functionality of the Calma car rental website
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Elements
    const bookingForm = document.getElementById('booking-form');
    const formElements = document.querySelectorAll('.form-group input, .form-group select');
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    const navLinksItems = document.querySelectorAll('.nav-links a');
    const bookingFormContainer = document.querySelector('.booking-form');
    const faqItems = document.querySelectorAll('.faq-item');
    
    // Multi-step form elements
    const formSteps = document.querySelectorAll('.form-step');
    const steps = document.querySelectorAll('.step');
    const stepTitles = document.querySelectorAll('.step-title');
    const nextBtn = document.getElementById('to-step-2');
    const prevBtn = document.getElementById('to-step-1');
    let currentStep = 1;
    
    // Step navigation
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            // Validate first step fields before proceeding
            const step1Fields = document.querySelectorAll('#step-1 input[required], #step-1 select[required]');
            let isStep1Valid = true;
            
            step1Fields.forEach(field => {
                if (!validateField(field)) {
                    isStep1Valid = false;
                }
            });
            
            if (isStep1Valid) {
                goToStep(2);
            } else {
                // Focus the first invalid field
                const firstInvalidField = document.querySelector('#step-1 .form-group.error input, #step-1 .form-group.error select');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
                showNotification('Please complete all required fields in this step.', 'error');
            }
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            goToStep(1);
        });
    }
    
    // Animation for car cards
    const carCards = document.querySelectorAll('.car-card');
    
    // Make sure the booking form is visible immediately
    if (bookingFormContainer) {
        bookingFormContainer.style.display = 'block';
        bookingFormContainer.style.opacity = '1';
    }
    
    if (carCards.length > 0) {
        // Use IntersectionObserver for revealing car cards when they enter the viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('card-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        carCards.forEach(card => {
            observer.observe(card);
        });
    }
    
    // Mobile menu toggle - with accessibility improvements
    mobileMenu.addEventListener('click', () => {
        const isExpanded = mobileMenu.getAttribute('aria-expanded') === 'true';
        
        // Toggle the menu
        navLinks.classList.toggle('active');
        
        // Update the aria-expanded attribute
        mobileMenu.setAttribute('aria-expanded', !isExpanded);
        
        // Toggle the icon
        if (isExpanded) {
            mobileMenu.querySelector('i').classList.add('fa-bars');
            mobileMenu.querySelector('i').classList.remove('fa-times');
            mobileMenu.setAttribute('aria-label', 'Open navigation menu');
        } else {
            mobileMenu.querySelector('i').classList.remove('fa-bars');
            mobileMenu.querySelector('i').classList.add('fa-times');
            mobileMenu.setAttribute('aria-label', 'Close navigation menu');
        }
    });
    
    // Trap focus in mobile menu when it's open
    document.addEventListener('keydown', function(e) {
        // Only if the mobile menu is visible
        if (window.innerWidth <= 991 && navLinks.classList.contains('active')) {
            const focusableElements = navLinks.querySelectorAll('a, button');
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];
            
            // If Tab is pressed
            if (e.key === 'Tab') {
                // If Shift + Tab and focus is on first element, move to last
                if (e.shiftKey && document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
                // If Tab and focus is on last element, move to first
                else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
            
            // If Escape key is pressed, close the menu
            if (e.key === 'Escape') {
                navLinks.classList.remove('active');
                mobileMenu.setAttribute('aria-expanded', 'false');
                mobileMenu.querySelector('i').classList.add('fa-bars');
                mobileMenu.querySelector('i').classList.remove('fa-times');
                mobileMenu.focus(); // Return focus to the menu button
            }
        }
    });
    
    // Smooth scrolling for internal links
    navLinksItems.forEach(link => {
        link.addEventListener('click', function(e) {
            // Only for internal links
            if (this.getAttribute('href').startsWith('#') && this.getAttribute('href') !== '#') {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Close the mobile menu if it's open
                    navLinks.classList.remove('active');
                    mobileMenu.setAttribute('aria-expanded', 'false');
                    mobileMenu.querySelector('i').classList.remove('fa-times');
                    mobileMenu.querySelector('i').classList.add('fa-bars');
                    
                    // Smooth scroll to the target
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Adjusted for header height
                        behavior: 'smooth'
                    });
                    
                    // Update active link
                    navLinksItems.forEach(item => item.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Set focus to the target for better accessibility
                    targetElement.setAttribute('tabindex', '-1');
                    targetElement.focus({ preventScroll: true });
                    
                    // Remove tabindex after transition
                    setTimeout(() => {
                        targetElement.removeAttribute('tabindex');
                    }, 1000);
                }
            }
        });
    });
    
    // FAQ Accordion
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        // Add ARIA attributes for accessibility
        question.setAttribute('aria-expanded', 'false');
        answer.setAttribute('aria-hidden', 'true');
        
        question.addEventListener('click', () => {
            // Check if current item is active
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(faqItem => {
                const faqQuestion = faqItem.querySelector('.faq-question');
                const faqAnswer = faqItem.querySelector('.faq-answer');
                
                faqItem.classList.remove('active');
                faqQuestion.setAttribute('aria-expanded', 'false');
                faqAnswer.setAttribute('aria-hidden', 'true');
            });
            
            // If clicked item wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
                question.setAttribute('aria-expanded', 'true');
                answer.setAttribute('aria-hidden', 'false');
            }
        });
        
        // Make FAQ accessible by keyboard
        question.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                question.click();
            }
        });
        
        // Make FAQs focusable
        question.setAttribute('tabindex', '0');
        question.setAttribute('role', 'button');
    });
    
    // Real-time form validation
    function validateField(field) {
        const fieldName = field.name;
        const value = field.value.trim();
        const formGroup = field.closest('.form-group');
        const errorElement = formGroup.querySelector('.validation-message') || 
                             createValidationMessage(formGroup);
        
        // Reset previous validation state
        formGroup.classList.remove('error', 'success');
        errorElement.classList.remove('show');
        errorElement.textContent = '';
        
        // Check required fields
        if (field.hasAttribute('required') && value === '') {
            showError(formGroup, errorElement, 'This field is required');
            return false;
        }
        
        // Field-specific validations
        switch(fieldName) {
            case 'age':
                if (value && (isNaN(value) || Number(value) < 21 || Number(value) > 85)) {
                    showError(formGroup, errorElement, 'Age must be between 21 and 85');
                    return false;
                }
                break;
                
            case 'pickup-date':
            case 'dropoff-date':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selectedDate = new Date(value);
                
                if (value && selectedDate < today) {
                    showError(formGroup, errorElement, 'Please select a future date');
                    return false;
                }
                
                // Validate dropoff date is after pickup date
                if (fieldName === 'dropoff-date') {
                    const pickupDate = document.getElementById('pickup-date').value;
                    if (pickupDate && value && value < pickupDate) {
                        showError(formGroup, errorElement, 'Drop-off date must be after pick-up date');
                        return false;
                    }
                }
                break;
                
            case 'customer-email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (value && !emailRegex.test(value)) {
                    showError(formGroup, errorElement, 'Please enter a valid email address');
                    return false;
                }
                break;
                
            case 'customer-phone':
                const phoneRegex = /^\+?[\d\s-]{10,15}$/;
                if (value && !phoneRegex.test(value)) {
                    showError(formGroup, errorElement, 'Please enter a valid phone number');
                    return false;
                }
                break;
                
            case 'customer-name':
                if (value && value.length < 3) {
                    showError(formGroup, errorElement, 'Name must be at least 3 characters');
                    return false;
                }
                break;
        }
        
        // Field is valid
        if (value !== '') {
            showSuccess(formGroup);
        }
        
        return true;
    }
    
    // Show error message
    function showError(formGroup, errorElement, message) {
        formGroup.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
    
    // Show success state
    function showSuccess(formGroup) {
        formGroup.classList.add('success');
    }
    
    // Create validation message element if not exists
    function createValidationMessage(formGroup) {
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-message';
        formGroup.appendChild(errorElement);
        return errorElement;
    }
    
    // Validate fields on input/change
    formElements.forEach(element => {
        // Add focus effect
        element.addEventListener('focus', function() {
            this.parentNode.classList.add('input-focused');
        });
        
        // Remove focus effect and validate on blur
        element.addEventListener('blur', function() {
            this.parentNode.classList.remove('input-focused');
            validateField(this);
        });
        
        // Validate specific fields on input for immediate feedback
        if (element.id === 'age' || element.id === 'customer-email' || element.id === 'customer-phone') {
            element.addEventListener('input', function() {
                validateField(this);
            });
        }
        
        // For date fields, validate when changed
        if (element.type === 'date') {
            element.addEventListener('change', function() {
                validateField(this);
                
                // If it's pickup-date, also validate dropoff-date
                if (this.id === 'pickup-date') {
                    const dropoffDate = document.getElementById('dropoff-date');
                    if (dropoffDate.value) {
                        validateField(dropoffDate);
                    }
                }
            });
        }
    });
    
    // Set minimum date for date pickers (today)
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    
    document.getElementById('pickup-date').min = todayFormatted;
    document.getElementById('dropoff-date').min = todayFormatted;
    
    // Set dropoff date based on pickup date
    document.getElementById('pickup-date').addEventListener('change', function() {
        document.getElementById('dropoff-date').min = this.value;
        
        // If dropoff date is less than new pickup date, update it
        if (document.getElementById('dropoff-date').value < this.value) {
            document.getElementById('dropoff-date').value = this.value;
        }
    });
    
    // Handle form submission
    document.getElementById('booking-form').addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (validateStep(currentStep)) {
            // Show loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = `
                <div class="spinner"></div>
                <span>Processing your booking...</span>
            `;
            document.body.appendChild(loadingIndicator);
            
            // Gather form data
            const formData = {
                // Trip Details
                pickupLocation: document.getElementById('pickup-location').value,
                dropoffLocation: document.getElementById('dropoff-location').value,
                pickupDate: document.getElementById('pickup-date').value,
                pickupTime: document.getElementById('pickup-time').value,
                dropoffDate: document.getElementById('dropoff-date').value,
                dropoffTime: document.getElementById('dropoff-time').value,
                carSelection: getCarName(document.getElementById('car-selection').value),
                
                // Personal Information
                name: document.getElementById('customer-name').value,
                email: document.getElementById('customer-email').value,
                phone: document.getElementById('customer-phone').value,
                age: document.getElementById('age').value
            };
            
            console.log("Form data to be sent:", formData);
            
            // Simulate sending data to backend
            setTimeout(() => {
                // Remove loading indicator
                document.body.removeChild(loadingIndicator);
                
                // Show success message
                const formContainer = document.querySelector('.booking-form-container');
                formContainer.innerHTML = `
                    <div class="success-message">
                        <div class="success-checkmark">
                            <i class="fa fa-check-circle"></i>
                        </div>
                        <h3>Booking Successful!</h3>
                        <p>Thank you, ${formData.name}! Your booking request has been received.</p>
                        <p>We've sent a confirmation email to ${formData.email}.</p>
                        <p>Vehicle: ${formData.carSelection}</p>
                        <p>Pickup: ${formData.pickupDate} at ${formData.pickupTime} from ${getLocationName(formData.pickupLocation)}</p>
                        <p>Drop-off: ${formData.dropoffDate} at ${formData.dropoffTime} at ${getLocationName(formData.dropoffLocation)}</p>
                        <p>Our team will contact you shortly to finalize your reservation.</p>
                    </div>
                `;
                
                // Here you would normally send a POST request to your backend
                // fetch('/api/booking', {
                //     method: 'POST',
                //     headers: {
                //         'Content-Type': 'application/json',
                //     },
                //     body: JSON.stringify(formData),
                // })
                // .then(response => response.json())
                // .then(data => {
                //     console.log('Success:', data);
                // })
                // .catch((error) => {
                //     console.error('Error:', error);
                // });
                
            }, 2000); // Simulate network delay
        }
    });
    
    // Get car name from value
    function getCarName(carValue) {
        const carOptions = {
            'aygo': 'Toyota Aygo',
            'polo': 'Volkswagen Polo',
            'yaris': 'Toyota Yaris Hybrid',
            'vitara': 'Suzuki Vitara',
            'qashqai': 'Nissan Qashqai',
            'tiguan': 'Volkswagen Tiguan'
        };
        
        return carOptions[carValue] || carValue;
    }
    
    // Get location name from value
    function getLocationName(locationValue) {
        const locationOptions = {
            'airport': 'Chania International Airport',
            'port': 'Chania Port',
            'city': 'Chania City Center',
            'hotel': 'Hotel/Villa in Chania'
        };
        
        return locationOptions[locationValue] || locationValue;
    }
    
    // Function to navigate between form steps
    function goToStep(stepNumber) {
        // Hide all steps
        formSteps.forEach(step => {
            step.classList.remove('active');
        });
        
        // Remove active class from all step indicators
        steps.forEach(step => {
            step.classList.remove('active');
            step.classList.remove('completed');
        });
        
        // Remove active class from all step titles
        stepTitles.forEach(title => {
            title.classList.remove('active');
        });
        
        // Show current step
        document.getElementById(`step-${stepNumber}`).classList.add('active');
        
        // Update step indicators
        for (let i = 1; i <= steps.length; i++) {
            const stepEl = document.querySelector(`.step[data-step="${i}"]`);
            const titleEl = document.querySelector(`.step-title:nth-child(${i})`);
            
            if (i < stepNumber) {
                stepEl.classList.add('completed');
            }
            else if (i === stepNumber) {
                stepEl.classList.add('active');
                titleEl.classList.add('active');
            }
        }
        
        currentStep = stepNumber;
    }
    
    // Highlight active section in navigation based on scroll position
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        
        // Get all sections
        const sections = document.querySelectorAll('section[id]');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active class from all links
                navLinksItems.forEach(item => item.classList.remove('active'));
                
                // Add active class to the current section's link
                const correspondingLink = document.querySelector(`.nav-links a[href="#${sectionId}"]`);
                if (correspondingLink) {
                    correspondingLink.classList.add('active');
                }
            }
        });
    });
    
    // Enhanced notification system with accessibility
    function showNotification(message, type = 'success', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                </div>
                <p>${message}</p>
                <button class="close-notification" aria-label="Close notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Wait a moment before adding the 'show' class for the animation to trigger
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Close button functionality
        const closeButton = notification.querySelector('.close-notification');
        closeButton.addEventListener('click', () => {
            closeNotification(notification);
        });
        
        // Auto-close after duration
        const autoCloseTimeout = setTimeout(() => {
            closeNotification(notification);
        }, duration);
        
        // Stop auto-close when hovering
        notification.addEventListener('mouseenter', () => {
            clearTimeout(autoCloseTimeout);
        });
        
        // Keyboard accessibility - close on Escape key
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                closeNotification(notification);
                document.removeEventListener('keydown', escapeHandler);
            }
        });
        
        return notification;
    }
    
    function closeNotification(notification) {
        notification.classList.remove('show');
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }
    
    // Function to validate a specific form step
    function validateStep(step) {
        const stepFields = document.querySelectorAll(`#step-${step} input[required], #step-${step} select[required]`);
        let isStepValid = true;
        
        stepFields.forEach(field => {
            if (!validateField(field)) {
                isStepValid = false;
            }
        });
        
        if (!isStepValid) {
            // Focus the first invalid field
            const firstInvalidField = document.querySelector(`#step-${step} .form-group.error input, #step-${step} .form-group.error select`);
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
            showNotification('Please complete all required fields correctly.', 'error');
        }
        
        return isStepValid;
    }
}); 