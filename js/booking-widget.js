/**
 * Calma Car Rental - Booking Widget
 * Handles the booking process workflow with steps for location,
 * date/time selection, car selection, and customer information.
 */

import ClockTimePicker from './time-picker.js';

document.addEventListener('DOMContentLoaded', function() {
  BookingWidget.init();
});

const BookingWidget = {
  currentStep: 1,
  totalSteps: 4,
  booking: {
    location: '',
    pickupDate: '',
    pickupTime: '',
    returnDate: '',
    returnTime: '',
    selectedCar: null,
    customerInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      licenseNumber: ''
    }
  },
  
  // Initialize the booking widget
  init: function() {
    this.cacheDOM();
    this.bindEvents();
    this.initTimePickerComponents();
    this.renderStep(1);
  },
  
  // Cache DOM elements
  cacheDOM: function() {
    this.bookingWidget = document.querySelector('.booking-widget');
    this.stepIndicators = document.querySelectorAll('.step-indicator');
    this.stepContents = document.querySelectorAll('.step-content');
    this.nextButtons = document.querySelectorAll('.button.next');
    this.prevButtons = document.querySelectorAll('.button.prev');
    this.submitButton = document.querySelector('.button.submit');
    this.locationSelect = document.querySelector('#pickup-location');
    this.pickupDateInput = document.querySelector('#pickup-date');
    this.pickupTimeInput = document.querySelector('#pickup-time');
    this.returnDateInput = document.querySelector('#return-date');
    this.returnTimeInput = document.querySelector('#return-time');
    this.carSelectionGrid = document.querySelector('.car-selection-grid');
    this.customerForm = document.querySelector('#customer-form');
    this.bookingSummary = document.querySelector('.booking-summary');
    this.bookingErrorMessage = document.querySelector('.booking-error-message');
    this.loadingOverlay = document.querySelector('.loading-overlay');
    this.confirmationView = document.querySelector('.booking-confirmation');
  },
  
  // Initialize time picker component
  initTimePickerComponents: function() {
    console.log('Initializing time picker components');
    
    try {
      // Initialize pickupTimePicker 
      this.pickupTimePicker = new ClockTimePicker({
        selector: '#pickup-time',
        inputSelector: '#pickup-time',
        minHour: 8,
        maxHour: 20,
        interval: 30,
        initialValue: '09:00',
        onChange: (timeInfo) => {
          this.booking.pickupTime = timeInfo.timeString;
          console.log('Pickup time selected:', timeInfo.timeString);
        }
      });
      
      // Initialize dropoffTimePicker (note the name change from returnTimePicker)
      this.dropoffTimePicker = new ClockTimePicker({
        selector: '#dropoff-time',
        inputSelector: '#dropoff-time',
        minHour: 8,
        maxHour: 20,
        interval: 30,
        initialValue: '17:00',
        onChange: (timeInfo) => {
          this.booking.returnTime = timeInfo.timeString;
          // Check for late surcharge
          this.checkLateSurcharge(timeInfo.hour);
          console.log('Dropoff time selected:', timeInfo.timeString);
        }
      });
      
      console.log('Time picker components initialized successfully');
    } catch (error) {
      console.error('Error initializing time pickers:', error);
    }
  },
  
  // Check if late return time surcharge applies
  checkLateSurcharge: function(hour) {
    const lateCutoff = 20; // 8 PM
    const lateSurchargeElement = document.querySelector('.late-surcharge');
    
    if (lateSurchargeElement) {
      if (hour >= lateCutoff) {
        lateSurchargeElement.style.display = 'block';
        this.booking.lateSurcharge = true;
      } else {
        lateSurchargeElement.style.display = 'none';
        this.booking.lateSurcharge = false;
      }
    }
  },
  
  // Bind event listeners
  bindEvents: function() {
    const self = this;
    
    // Next button clicks
    this.nextButtons.forEach(button => {
      button.addEventListener('click', function() {
        if (self.validateCurrentStep()) {
          self.goToNextStep();
        }
      });
    });
    
    // Previous button clicks
    this.prevButtons.forEach(button => {
      button.addEventListener('click', function() {
        self.goToPrevStep();
      });
    });
    
    // Car selection
    if (this.carSelectionGrid) {
      this.carSelectionGrid.addEventListener('click', function(e) {
        const carCard = e.target.closest('.car-card');
        if (carCard) {
          const carId = carCard.dataset.carId;
          self.selectCar(carId);
        }
      });
    }
    
    // Handle date changes to enforce logical date ranges
    if (this.pickupDateInput) {
      this.pickupDateInput.addEventListener('change', function() {
        // Set minimum return date to be the pickup date
        self.returnDateInput.min = this.value;
        
        // If return date is before pickup date, reset it
        if (self.returnDateInput.value && self.returnDateInput.value < this.value) {
          self.returnDateInput.value = this.value;
        }
      });
    }
    
    // Submit button click
    if (this.submitButton) {
      this.submitButton.addEventListener('click', function(e) {
        e.preventDefault();
        if (self.validateCurrentStep()) {
          self.submitBooking();
        }
      });
    }
  },
  
  // Validate the current step
  validateCurrentStep: function() {
    this.hideErrorMessage();
    
    switch(this.currentStep) {
      case 1: // Location selection
        if (!this.locationSelect.value) {
          this.showErrorMessage('Please select a pickup location');
          return false;
        }
        this.booking.location = this.locationSelect.value;
        return true;
        
      case 2: // Date and time selection
        if (!this.pickupDateInput.value) {
          this.showErrorMessage('Please select a pickup date');
          return false;
        }
        if (!this.pickupTimeInput.value) {
          this.showErrorMessage('Please select a pickup time');
          return false;
        }
        if (!this.returnDateInput.value) {
          this.showErrorMessage('Please select a return date');
          return false;
        }
        if (!this.returnTimeInput.value) {
          this.showErrorMessage('Please select a return time');
          return false;
        }
        
        // Validate that return date/time is after pickup date/time
        const pickupDateTime = new Date(`${this.pickupDateInput.value}T${this.pickupTimeInput.value}`);
        const returnDateTime = new Date(`${this.returnDateInput.value}T${this.returnTimeInput.value}`);
        
        if (returnDateTime <= pickupDateTime) {
          this.showErrorMessage('Return date/time must be after pickup date/time');
          return false;
        }
        
        this.booking.pickupDate = this.pickupDateInput.value;
        this.booking.pickupTime = this.pickupTimeInput.value;
        this.booking.returnDate = this.returnDateInput.value;
        this.booking.returnTime = this.returnTimeInput.value;
        return true;
        
      case 3: // Car selection
        if (!this.booking.selectedCar) {
          this.showErrorMessage('Please select a car');
          return false;
        }
        return true;
        
      case 4: // Customer information
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'licenseNumber'];
        let isValid = true;
        
        requiredFields.forEach(field => {
          const input = document.querySelector(`#customer-${field}`);
          if (!input.value.trim()) {
            this.showErrorMessage(`Please enter your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
            isValid = false;
            return;
          }
          
          // Email validation
          if (field === 'email' && !this.isValidEmail(input.value)) {
            this.showErrorMessage('Please enter a valid email address');
            isValid = false;
            return;
          }
          
          // Phone validation
          if (field === 'phone' && !this.isValidPhone(input.value)) {
            this.showErrorMessage('Please enter a valid phone number');
            isValid = false;
            return;
          }
          
          this.booking.customerInfo[field] = input.value.trim();
        });
        
        // Get optional address
        this.booking.customerInfo.address = document.querySelector('#customer-address').value.trim();
        
        return isValid;
    }
    
    return true;
  },
  
  // Validate email format
  isValidEmail: function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  // Validate phone format
  isValidPhone: function(phone) {
    // Simple validation - can be enhanced as needed
    return phone.replace(/[^0-9]/g, '').length >= 10;
  },
  
  // Show error message
  showErrorMessage: function(message) {
    this.bookingErrorMessage.textContent = message;
    this.bookingErrorMessage.style.display = 'block';
  },
  
  // Hide error message
  hideErrorMessage: function() {
    this.bookingErrorMessage.style.display = 'none';
  },
  
  // Go to the next step
  goToNextStep: function() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.renderStep(this.currentStep);
      
      // If we're at the summary step, render the booking summary
      if (this.currentStep === 4) {
        this.renderBookingSummary();
      }
    }
  },
  
  // Go to the previous step
  goToPrevStep: function() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderStep(this.currentStep);
    }
  },
  
  // Render the current step
  renderStep: function(stepNumber) {
    // Update step indicators
    this.stepIndicators.forEach((indicator, index) => {
      indicator.classList.remove('active');
      
      if (index + 1 === stepNumber) {
        indicator.classList.add('active');
      } else if (index + 1 < stepNumber) {
        indicator.classList.add('completed');
      } else {
        indicator.classList.remove('completed');
      }
    });
    
    // Show only the current step content
    this.stepContents.forEach((content, index) => {
      content.classList.remove('active');
      
      if (index + 1 === stepNumber) {
        content.classList.add('active');
      }
    });
    
    // Scroll to the top of the widget
    this.bookingWidget.scrollIntoView({ behavior: 'smooth' });
  },
  
  // Select a car
  selectCar: function(carId) {
    // Sample car data - in a real app, this would come from a server
    const cars = [
      { id: '1', name: 'Economy Sedan', features: ['4 Seats', '2 Bags', 'A/C'], price: 40 },
      { id: '2', name: 'Compact SUV', features: ['5 Seats', '3 Bags', 'A/C', 'GPS'], price: 55 },
      { id: '3', name: 'Luxury Sedan', features: ['5 Seats', '4 Bags', 'A/C', 'GPS', 'Leather'], price: 80 },
      { id: '4', name: 'Convertible', features: ['2 Seats', '2 Bags', 'A/C', 'GPS'], price: 95 }
    ];
    
    const selectedCar = cars.find(car => car.id === carId);
    
    if (selectedCar) {
      this.booking.selectedCar = selectedCar;
      
      // Update UI to show selected car
      const carCards = document.querySelectorAll('.car-card');
      carCards.forEach(card => {
        if (card.dataset.carId === carId) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
    }
  },
  
  // Render the booking summary
  renderBookingSummary: function() {
    if (!this.bookingSummary || !this.booking.selectedCar) return;
    
    // Calculate rental duration
    const pickupDateTime = new Date(`${this.booking.pickupDate}T${this.booking.pickupTime}`);
    const returnDateTime = new Date(`${this.booking.returnDate}T${this.booking.returnTime}`);
    const durationMs = returnDateTime - pickupDateTime;
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    
    // Calculate total price
    let totalPrice = this.booking.selectedCar.price * durationDays;
    
    // Add late surcharge if applicable
    if (this.booking.lateSurcharge) {
      const lateSurchargeAmount = 10; // €10 surcharge
      totalPrice += lateSurchargeAmount;
    }
    
    // Format dates for display
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };
    
    // Format time for display in a friendly way
    const formatTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    // Create summary HTML
    let summaryHTML = `
      <h3>Booking Summary</h3>
      <div class="summary-item">
        <span>Pickup Location:</span>
        <span>${this.booking.location}</span>
      </div>
      <div class="summary-item">
        <span>Pickup Date:</span>
        <span>${formatDate(this.booking.pickupDate)} at ${formatTime(this.booking.pickupTime)}</span>
      </div>
      <div class="summary-item">
        <span>Return Date:</span>
        <span>${formatDate(this.booking.returnDate)} at ${formatTime(this.booking.returnTime)}</span>
      </div>
      <div class="summary-item">
        <span>Duration:</span>
        <span>${durationDays} day${durationDays !== 1 ? 's' : ''}</span>
      </div>
      <div class="summary-item">
        <span>Selected Car:</span>
        <span>${this.booking.selectedCar.name}</span>
      </div>
      <div class="summary-item">
        <span>Daily Rate:</span>
        <span>$${this.booking.selectedCar.price}/day</span>
      </div>
    `;
    
    // Add late surcharge if applicable
    if (this.booking.lateSurcharge) {
      summaryHTML += `
        <div class="summary-item">
          <span>Late Return Surcharge:</span>
          <span>$10</span>
        </div>
      `;
    }
    
    summaryHTML += `
      <div class="summary-item total">
        <span>Total:</span>
        <span>$${totalPrice}</span>
      </div>
    `;
    
    this.bookingSummary.innerHTML = summaryHTML;
  },
  
  // Submit the booking
  submitBooking: function() {
    const self = this;
    
    // Show loading overlay
    this.loadingOverlay.style.display = 'flex';
    
    // Simulate server request
    setTimeout(function() {
      // Hide loading overlay
      self.loadingOverlay.style.display = 'none';
      
      // Show confirmation screen
      self.showConfirmation();
      
      // In a real app, you would send the booking data to the server here
      console.log('Booking submitted:', self.booking);
    }, 2000);
  },
  
  // Show booking confirmation
  showConfirmation: function() {
    // Hide the booking form
    this.bookingWidget.style.display = 'none';
    
    // Show the confirmation view
    this.confirmationView.style.display = 'block';
    
    // Generate a random booking reference
    const bookingRef = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Format time for display
    const formatTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    // Update confirmation details
    const confirmationDetails = document.querySelector('.confirmation-details');
    if (confirmationDetails) {
      confirmationDetails.innerHTML = `
        <p>Your booking reference: <strong>${bookingRef}</strong></p>
        <p>We've sent a confirmation email to <strong>${this.booking.customerInfo.email}</strong></p>
        <p>Pick up your ${this.booking.selectedCar.name} from ${this.booking.location} on 
           ${new Date(this.booking.pickupDate).toLocaleDateString()} at ${formatTime(this.booking.pickupTime)}</p>
      `;
    }
  }
}; 