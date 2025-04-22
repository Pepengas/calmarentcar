/**
 * Calma Car Rental Website - Combined JavaScript
 * This file handles all interactive functionality of the Calma car rental website
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // =====================
    // MAIN FUNCTIONALITY
    // =====================
    
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
    
    // Make sure the booking form is visible immediately
    if (bookingFormContainer) {
        bookingFormContainer.style.display = 'block';
        bookingFormContainer.style.opacity = '1';
    }
    
    // Animation for car cards
    const carCards = document.querySelectorAll('.car-card');
    
    // Set up Intersection Observer for car cards
    if (carCards.length > 0) {
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('card-visible');
                }
            });
        }, { threshold: 0.1 });
        
        carCards.forEach(card => {
            cardObserver.observe(card);
        });
    }
    
    // Step navigation for booking form
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
    
    // FAQ toggle functionality
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });
    
    // Form validation
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
    
    const pickupDate = document.getElementById('pickup-date');
    const dropoffDate = document.getElementById('dropoff-date');
    
    if (pickupDate) pickupDate.min = todayFormatted;
    if (dropoffDate) dropoffDate.min = todayFormatted;
    
    // Form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate all required fields
            const requiredFields = bookingForm.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!validateField(field)) {
                    isValid = false;
                }
            });
            
            if (isValid) {
                // Show loading indicator
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'loading-indicator';
                loadingIndicator.innerHTML = `
                    <div class="spinner"></div>
                    <span>Processing your booking request...</span>
                `;
                document.body.appendChild(loadingIndicator);
                
                // Simulate form submission (would be replaced with actual API call)
                setTimeout(() => {
                    // Hide loading indicator
                    document.body.removeChild(loadingIndicator);
                    
                    // Show success message
                    bookingForm.innerHTML = `
                        <div class="success-message">
                            <div class="success-checkmark">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <h3>Booking Request Received!</h3>
                            <p>Thank you for choosing Calma Car Rental. We have received your booking request and will contact you shortly to confirm the details.</p>
                            <p>A confirmation email has been sent to your email address.</p>
                        </div>
                    `;
                    
                    // Show notification
                    showNotification('Booking request submitted successfully!', 'success');
                    
                    // Scroll to the success message
                    bookingForm.scrollIntoView({ behavior: 'smooth' });
                }, 2000);
            } else {
                // Focus the first invalid field
                const firstInvalidField = bookingForm.querySelector('.form-group.error input, .form-group.error select');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
                showNotification('Please fill in all required fields correctly.', 'error');
            }
        });
    }
    
    // =====================
    // MOBILE MENU FUNCTIONALITY
    // =====================
    const mobileMenuButton = document.querySelector('.mobile-menu');
    const navContainer = document.querySelector('.nav-container');
    
    if (mobileMenuButton && navContainer) {
        mobileMenuButton.addEventListener('click', function() {
            // Toggle the active class on the navigation container
            navContainer.classList.toggle('active');
            
            // Update the aria-expanded attribute for accessibility
            const isExpanded = navContainer.classList.contains('active');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded);
            
            // Toggle icon between bars and times (X)
            const icon = mobileMenuButton.querySelector('i');
            if (icon) {
                if (isExpanded) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        // Close the menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navContainer.contains(event.target) && 
                !mobileMenuButton.contains(event.target) && 
                navContainer.classList.contains('active')) {
                navContainer.classList.remove('active');
                mobileMenuButton.setAttribute('aria-expanded', false);
                
                const icon = mobileMenuButton.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        // Close menu when a nav link is clicked
        const navLinks = navContainer.querySelectorAll('a');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                navContainer.classList.remove('active');
                mobileMenuButton.setAttribute('aria-expanded', false);
                
                const icon = mobileMenuButton.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // =====================
    // DARK MODE FUNCTIONALITY
    // =====================
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const toggleIcon = document.querySelector('.toggle-icon i');
    const html = document.documentElement;
    
    // Check for saved user preference, if any
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Function to set theme
    function setTheme(theme) {
        html.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme); // Also set on body
        localStorage.setItem('theme', theme);
        
        // Set background color directly on html and body for full coverage
        if (theme === 'dark') {
            document.documentElement.style.backgroundColor = '#121212';
            document.body.style.backgroundColor = '#121212';
            if (darkModeToggle) darkModeToggle.checked = true;
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-moon');
                toggleIcon.classList.add('fa-sun');
            }
        } else {
            document.documentElement.style.backgroundColor = '';
            document.body.style.backgroundColor = '';
            if (darkModeToggle) darkModeToggle.checked = false;
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-sun');
                toggleIcon.classList.add('fa-moon');
            }
        }
    }
    
    // Apply saved theme on page load
    setTheme(currentTheme);
    
    // Add toggle event listener if the toggle exists
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            setTheme(newTheme);
        });
    }
    
    // Check for system preference
    function checkSystemPreference() {
        // Only apply system preference if user hasn't manually set a preference
        if (!localStorage.getItem('theme')) {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setTheme('dark');
            } else {
                setTheme('light');
            }
        }
    }
    
    // Check system preference on load
    checkSystemPreference();
    
    // Listen for system preference changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                setTheme(newTheme);
            }
        });
    }
    
    // Keyboard accessibility for the toggle
    if (darkModeToggle) {
        darkModeToggle.parentElement.addEventListener('keydown', function(e) {
            // Toggle on Space or Enter
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                darkModeToggle.checked = !darkModeToggle.checked;
                
                // Trigger the change event
                const event = new Event('change');
                darkModeToggle.dispatchEvent(event);
            }
        });
    }
    
    // =====================
    // FIXED HEADER FUNCTIONALITY
    // =====================
    const header = document.querySelector('header') || document.querySelector('.site-header');
    
    // Function to handle scroll effect
    function handleScroll() {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Initialize on page load
    handleScroll();
});

// =====================
// HELPER FUNCTIONS
// =====================

// Go to step function for booking form
function goToStep(stepNumber) {
    const formSteps = document.querySelectorAll('.form-step');
    const steps = document.querySelectorAll('.step');
    const stepTitles = document.querySelectorAll('.step-title');
    
    formSteps.forEach(step => {
        step.classList.remove('active');
    });
    
    steps.forEach(step => {
        step.classList.remove('active');
        step.classList.remove('completed');
    });
    
    stepTitles.forEach(title => {
        title.classList.remove('active');
    });
    
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    
    for (let i = 1; i <= steps.length; i++) {
        const stepEl = document.querySelector(`.step[data-step="${i}"]`);
        const titleEl = document.querySelector(`.step-title:nth-child(${i})`);
        
        if (i < stepNumber) {
            stepEl.classList.add('completed');
        } else if (i === stepNumber) {
            stepEl.classList.add('active');
            titleEl.classList.add('active');
        }
    }
}

// Form validation function
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
        case 'customer-email':
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
                showError(formGroup, errorElement, 'Please enter a valid email address');
                return false;
            }
            break;
            
        case 'customer-phone':
            const phonePattern = /^\+?[0-9\s\-()]{7,20}$/;
            if (!phonePattern.test(value)) {
                showError(formGroup, errorElement, 'Please enter a valid phone number');
                return false;
            }
            break;
            
        case 'age':
            const age = parseInt(value);
            if (isNaN(age) || age < 21) {
                showError(formGroup, errorElement, 'Driver must be at least 21 years old');
                return false;
            }
            break;
            
        case 'dropoff-date':
            const pickupDateField = document.getElementById('pickup-date');
            if (pickupDateField && pickupDateField.value) {
                const pickupDate = new Date(pickupDateField.value);
                const dropoffDate = new Date(value);
                
                if (dropoffDate <= pickupDate) {
                    showError(formGroup, errorElement, 'Drop-off date must be after pick-up date');
                    return false;
                }
            }
            break;
    }
    
    // Field is valid
    formGroup.classList.add('success');
    return true;
}

// Show error message
function showError(formGroup, errorElement, message) {
    formGroup.classList.add('error');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

// Create validation message element
function createValidationMessage(formGroup) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'validation-message';
    formGroup.appendChild(errorMessage);
    return errorMessage;
}

// Show notification
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
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Close button functionality
    const closeButton = notification.querySelector('.close-notification');
    closeButton.addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Auto close after duration
    const autoCloseTimeout = setTimeout(() => {
        closeNotification(notification);
    }, duration);
    
    // Pause auto close when hovering
    notification.addEventListener('mouseenter', () => {
        clearTimeout(autoCloseTimeout);
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeNotification(notification);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
    
    return notification;
}

// Close notification
function closeNotification(notification) {
    notification.classList.remove('show');
    
    // Remove from DOM after animation
    notification.addEventListener('transitionend', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
} 