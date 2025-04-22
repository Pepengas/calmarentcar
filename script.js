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
    const carGrid = document.querySelector('.cars-grid'); // Get car grid container
    const carSelectionDropdown = document.getElementById('car-selection'); // Get car select dropdown
    const pickupDateInput = document.getElementById('pickup-date');
    const dropoffDateInput = document.getElementById('dropoff-date');
    
    // Multi-step form elements
    const formSteps = document.querySelectorAll('.form-step');
    const steps = document.querySelectorAll('.step');
    const stepTitles = document.querySelectorAll('.step-title');
    const nextBtn = document.getElementById('to-step-2');
    const prevBtn = document.getElementById('to-step-1');
    let currentStep = 1;
    
    // --- Function to fetch car data ---
    async function fetchCars() {
        try {
            const response = await fetch('https://calma-car-rental-0c39a21370e6.herokuapp.com/api/cars'); // Ensure backend is running
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const cars = await response.json();
            return cars;
        } catch (error) {
            console.error('Failed to fetch cars:', error);
            if (carGrid) carGrid.innerHTML = '<p class="error-message">Failed to load car fleet. Please try refreshing.</p>';
            if (carSelectionDropdown) carSelectionDropdown.innerHTML = '<option value="" disabled selected>Failed to load cars</option>';
            return [];
        }
    }
    
    // --- Function to display cars in the grid ---
    function displayCars(cars) {
        if (!carGrid) return;
        carGrid.innerHTML = ''; // Clear existing hardcoded cars
        
        if (cars.length === 0) {
             carGrid.innerHTML = '<p>No cars available at the moment.</p>';
             return;
        }
        
        cars.forEach(car => {
            const card = document.createElement('div');
            card.className = 'car-card';
            
            let featuresHtml = '';
            if (car.features && car.features.length > 0) {
                featuresHtml = `<ul class="car-features"><li>${car.features.join('</li><li>')}</li></ul>`;
            }
            
            card.innerHTML = `
                <div class="car-image">
                    <img src="${car.image}" alt="${car.name}" loading="lazy" width="300" height="200">
                </div>
                <div class="car-details">
                    <h3>${car.name}</h3>
                    <p>${car.description}</p>
                    ${featuresHtml}
                    <div class="car-pricing">
                        <span class="price">From €${car.pricePerDay}/day</span>
                        <span class="price-note">· Free cancellation</span>
                    </div>
                    <button class="btn btn-primary book-from-grid" data-car-id="${car.id}">Book Now</button>
                </div>
            `;
            carGrid.appendChild(card);
        });
        addGridBookNowListeners();
        // Re-initialize IntersectionObserver if needed for animations
        // setupCarCardObserver(); 
    }
    
    // --- Function to populate car selection dropdown ---
    function populateCarDropdown(cars) {
        if (!carSelectionDropdown) return;
        const firstOption = carSelectionDropdown.querySelector('option[disabled]');
        carSelectionDropdown.innerHTML = '';
        if (firstOption) {
            carSelectionDropdown.appendChild(firstOption);
        }
        if (cars.length === 0 && firstOption) {
             firstOption.textContent = 'No cars available';
             return;
        }
        cars.forEach(car => {
            const option = document.createElement('option');
            option.value = car.id;
            option.textContent = `${car.name} - From €${car.pricePerDay}/day`;
            carSelectionDropdown.appendChild(option);
        });
    }
    
    // --- Function to handle "Book Now" clicks from the car grid ---
    function addGridBookNowListeners() {
       const bookButtons = carGrid.querySelectorAll('.book-from-grid');
       bookButtons.forEach(button => {
           button.addEventListener('click', function(e) {
               e.preventDefault();
               const carId = this.getAttribute('data-car-id');
               if (carSelectionDropdown) {
                   carSelectionDropdown.value = carId;
                   carSelectionDropdown.dispatchEvent(new Event('change'));
               }
               const bookingFormSection = document.querySelector('.booking-form');
               if (bookingFormSection) {
                   bookingFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
               }
               const firstField = document.getElementById('pickup-location');
               if(firstField) firstField.focus();
           });
       });
   }
    
    // --- Function to check car availability (Placeholder) ---
    async function checkAvailability() {
        if (!carSelectionDropdown || !pickupDateInput || !dropoffDateInput || !nextBtn) return;
        
        const carId = carSelectionDropdown.value;
        const pickupDate = pickupDateInput.value;
        const dropoffDate = dropoffDateInput.value;
        
        if (carId && pickupDate && dropoffDate) {
             if (new Date(dropoffDate) < new Date(pickupDate)) {
                 showNotification('Drop-off date cannot be earlier than pickup date.', 'error');
                 nextBtn.disabled = true;
                 return;
             }
            try {
                 nextBtn.textContent = 'Checking...';
                 nextBtn.disabled = true;
                const response = await fetch(`https://calma-car-rental-0c39a21370e6.herokuapp.com/api/cars/availability?carId=${encodeURIComponent(carId)}&pickupDate=${encodeURIComponent(pickupDate)}&dropoffDate=${encodeURIComponent(dropoffDate)}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                if (data.success && data.available) {
                    console.log(`Car ${carId} is available from ${pickupDate} to ${dropoffDate}`);
                    showNotification('Car is available for selected dates.', 'success', 2000);
                    nextBtn.disabled = false;
                } else {
                    console.warn(`Car ${carId} is NOT available from ${pickupDate} to ${dropoffDate}`);
                    showNotification(data.message || 'Selected car is not available for these dates.', 'error');
                    nextBtn.disabled = true;
                }
            } catch (error) {
                console.error('Failed to check availability:', error);
                showNotification('Could not check car availability. Please try again.', 'error');
                nextBtn.disabled = true;
            } finally {
                 nextBtn.textContent = 'Continue';
            }
        } else {
             // Don't reset button if it's already checking
             if (nextBtn.textContent !== 'Checking...') {
                const hasErrors = !!bookingForm.querySelector('#step-1 .form-group.error');
                nextBtn.disabled = hasErrors; // Disable only if there are existing errors
            } 
        }
    }
    
    // --- Initial Load --- 
    async function initializeFleet() {
        const cars = await fetchCars();
        displayCars(cars);
        populateCarDropdown(cars);
    }
    initializeFleet();
    
    // --- Add event listeners to check availability --- 
    if (carSelectionDropdown) carSelectionDropdown.addEventListener('change', checkAvailability);
    if (pickupDateInput) pickupDateInput.addEventListener('change', checkAvailability);
    if (dropoffDateInput) dropoffDateInput.addEventListener('change', checkAvailability);
    
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
            
            // Also ensure availability check passed (button isn't disabled)
            if (isStep1Valid && !nextBtn.disabled) {
                goToStep(2);
            } else if (isStep1Valid && nextBtn.disabled) {
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
        const errorElement = formGroup?.querySelector('.validation-message'); // Use optional chaining
        
        if (!formGroup || !errorElement) return true; // Cannot validate if structure is wrong
        
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
                case 'customer-email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        errorMessage = 'Please enter a valid email address.';
                        isValid = false;
                    }
                    break;
                case 'customer-phone':
                    // Basic phone validation (e.g., allows +, numbers, spaces, min length)
                    const phoneRegex = /^[+\d\s]{8,}$/;
                    if (!phoneRegex.test(value)) {
                        errorMessage = 'Please enter a valid phone number.';
                        isValid = false;
                    }
                    break;
                case 'age':
                    const age = parseInt(value);
                    if (isNaN(age) || age < 21 || age > 90) { // Added upper bound
                        errorMessage = 'Age must be between 21 and 90.';
                        isValid = false;
                    }
                    break;
                // Add other specific validations if needed (e.g., time format)
            }
        }
        
        // Show error or success state
        if (!isValid) {
            showError(formGroup, errorElement, errorMessage);
        } else {
            showSuccess(formGroup);
        }
        
        return isValid;
    }
    
    // Show error message
    function showError(formGroup, errorElement, message) {
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
        errorElement.textContent = message;
        errorElement.style.display = 'block'; // Show error message
    }
    
    // Show success state
    function showSuccess(formGroup) {
        formGroup.classList.add('success');
        formGroup.classList.remove('error');
        const errorElement = formGroup.querySelector('.validation-message');
        if(errorElement) { 
            errorElement.textContent = '';
            errorElement.style.display = 'none'; // Hide error message container
        }
    }
    
    // Apply validation on blur/change
    formElements.forEach(element => {
        element.addEventListener('blur', function() { validateField(this); });
        if (element.tagName === 'SELECT' || element.type === 'date' || element.type === 'time') {
            element.addEventListener('change', function() { validateField(this); });
        }
        // Maybe add input event listeners for specific fields if needed
    });
    
    // Form submission - Now uses fetch to the backend
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            let isClientValid = true;
            const step2Fields = bookingForm.querySelectorAll('#step-2 [required]');
            step2Fields.forEach(field => {
                 if (!validateField(field)) {
                     isClientValid = false;
                 }
             });
            // Also re-validate step 1 just in case?
            const step1Fields = bookingForm.querySelectorAll('#step-1 [required]');
             step1Fields.forEach(field => {
                 if (!validateField(field)) {
                     isClientValid = false;
                 }
             });
             
            // Final check on availability button state
            if (nextBtn && nextBtn.disabled) {
                 isClientValid = false; // Prevent submission if availability check failed
                 showNotification('Selected car or dates are unavailable.', 'error');
            }
            
            if (!isClientValid) {
                const firstInvalidField = bookingForm.querySelector('.form-group.error input, .form-group.error select');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
                showNotification('Please fill in all required fields correctly and ensure car is available.', 'error');
                return;
            }
            
            // Prepare data for backend
            const formData = new FormData(bookingForm);
            const bookingData = {};
            formData.forEach((value, key) => { bookingData[key] = value; });
            
            // Show loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = `<div class="spinner"></div><span>Processing...</span>`;
            document.body.appendChild(loadingIndicator);
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            
            // Send data to backend
            fetch('https://calma-car-rental-0c39a21370e6.herokuapp.com/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
                    });
                 }
                 return response.json();
            })
            .then(data => {
                if (data.success) {
                    bookingForm.innerHTML = `
                        <div class="success-message">
                            <div class="success-checkmark"><i class="fas fa-check-circle"></i></div>
                            <h3>Booking Request Received!</h3>
                            <p>Thank you! We've received your request for the ${getCarName(bookingData['car-selection'])} and will contact you shortly via ${bookingData['customer-email']} to confirm.</p>
                        </div>
                    `;
                    showNotification(data.message || 'Booking request submitted!', 'success');
                    bookingForm.scrollIntoView({ behavior: 'smooth' });
                } else {
                     throw new Error(data.message || 'Backend reported an issue.');
                }
            })
            .catch(error => {
                console.error('Error submitting booking:', error);
                showNotification(`Error: ${error.message}`, 'error');
            })
            .finally(() => {
                 if (document.body.contains(loadingIndicator)) {
                     document.body.removeChild(loadingIndicator);
                 }
                 // Don't re-enable submit button as form is replaced on success
                 // if(submitButton && bookingForm.contains(submitButton)) { 
                 //     submitButton.disabled = false;
                 // }
            });
        });
    }
    
    // Get car name from value
    function getCarName(carValue) {
        const option = carSelectionDropdown?.querySelector(`option[value="${carValue}"]`);
        return option ? option.textContent.split(' - ')[0] : 'Selected Car'; // Extract name
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
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.className = 'close-button';
        closeButton.onclick = () => closeNotification(notification);
        notification.appendChild(closeButton);
        
        document.body.appendChild(notification);
        
        // Auto close
        const timer = setTimeout(() => closeNotification(notification), duration);
        
        // Keep notification if hovered
        notification.addEventListener('mouseover', () => clearTimeout(timer));
        notification.addEventListener('mouseleave', () => setTimeout(() => closeNotification(notification), duration));
    }
    
    function closeNotification(notification) {
        if (notification && document.body.contains(notification)) {
            notification.classList.add('hide');
            // Remove after animation
            setTimeout(() => { 
                if (document.body.contains(notification)) { 
                    document.body.removeChild(notification); 
                }
            }, 500);
        }
    }
    
    // === Date picker fix enhancement ===
    // Get all date and time inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const timeInputs = document.querySelectorAll('input[type="time"]');
    
    // Add click event listeners to date inputs
    dateInputs.forEach(input => {
        input.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default action
            
            // Try using the modern showPicker() method
            if (typeof input.showPicker === 'function') {
                try {
                    input.showPicker();
                } catch (error) {
                    console.error("Error showing date picker:", error);
                    // Fallback if showPicker fails (e.g., security restrictions)
                    input.focus();
                }
            } else {
                // Fallback for browsers that don't support showPicker()
                input.focus();
            }
        });
    });
    
    // Add click event listeners to time inputs
    timeInputs.forEach(input => {
        input.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default action
            
            // Try using the modern showPicker() method
            if (typeof input.showPicker === 'function') {
                try {
                    input.showPicker();
                } catch (error) {
                    console.error("Error showing time picker:", error);
                    // Fallback if showPicker fails
                    input.focus();
                }
            } else {
                // Fallback for browsers that don't support showPicker()
                input.focus();
            }
        });
    });
}); 