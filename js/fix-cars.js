/**
 * Fix for the "Search Available Cars" button
 */
document.addEventListener('DOMContentLoaded', function() {
  // Get the button element
  const searchCarsButton = document.getElementById('search-cars-btn');
  
  if (searchCarsButton) {
    console.log('Search cars button found, adding event listener');
    
    // Add click event listener
    searchCarsButton.addEventListener('click', function(e) {
      console.log('Search cars button clicked');
      e.preventDefault(); // Prevent any form submission
      
      // Get all required fields in step 1
      const requiredFields = document.querySelectorAll('#step-1 input[required], #step-1 select[required]');
      let isValid = true;
      
      // Validate all required fields
      requiredFields.forEach(field => {
        console.log('Checking field:', field.id, 'Value:', field.value);
        if (!field.value.trim()) {
          isValid = false;
          
          // Add error styling
          const formGroup = field.closest('.form-group');
          if (formGroup) {
            formGroup.classList.add('error');
            
            // Show error message if available
            const errorElement = formGroup.querySelector('.validation-message');
            if (errorElement) {
              errorElement.textContent = 'This field is required';
            }
          }
        } else {
          // Remove error styling
          const formGroup = field.closest('.form-group');
          if (formGroup) {
            formGroup.classList.remove('error');
            
            // Clear error message
            const errorElement = formGroup.querySelector('.validation-message');
            if (errorElement) {
              errorElement.textContent = '';
            }
          }
        }
      });
      
      if (isValid) {
        console.log('Form is valid, redirecting to car selection page');
        
        // Collect form data to send to the next page
        const pickupLocation = document.getElementById('pickup-location').value;
        const dropoffLocation = document.getElementById('dropoff-location').value;
        const pickupDate = document.getElementById('pickup-date').value;
        const pickupTime = document.getElementById('pickup-time').value;
        const dropoffDate = document.getElementById('dropoff-date').value;
        const dropoffTime = document.getElementById('dropoff-time').value;
        
        console.log('Collected data:', {
          pickupLocation,
          dropoffLocation,
          pickupDate,
          pickupTime,
          dropoffDate,
          dropoffTime
        });
        
        // Create URL parameters
        const params = new URLSearchParams();
        params.append('pickup-location', pickupLocation);
        params.append('dropoff-location', dropoffLocation);
        params.append('pickup-date', pickupDate);
        params.append('pickup-time', pickupTime);
        params.append('dropoff-date', dropoffDate);
        params.append('dropoff-time', dropoffTime);
        
        // Calculate rental duration in days
        const pickupDateTime = new Date(`${pickupDate} ${pickupTime}`);
        const dropoffDateTime = new Date(`${dropoffDate} ${dropoffTime}`);
        const durationMs = dropoffDateTime - pickupDateTime;
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        
        params.append('duration', durationDays);
        
        // Redirect to car selection page
        const redirectURL = `car-selection.html?${params.toString()}`;
        console.log('Redirecting to:', redirectURL);
        window.location.href = redirectURL;
      } else {
        console.log('Form validation failed');
        showNotification('Please fill in all required fields.', 'error');
      }
    });
  } else {
    console.error('Search cars button not found - check element ID');
  }
  
  // Back button functionality
  const backButton = document.getElementById('to-step-1');
  if (backButton) {
    console.log('Back button found, adding event listener');
    
    backButton.addEventListener('click', function() {
      console.log('Back button clicked');
      
      // Move back to step 1 of the booking form
      const step1 = document.getElementById('step-1');
      const step2 = document.getElementById('step-2');
      
      if (step1 && step2) {
        step2.classList.remove('active');
        step1.classList.add('active');
        
        // Update progress indicators
        const step1Indicator = document.querySelector('.step[data-step="1"]');
        const step2Indicator = document.querySelector('.step[data-step="2"]');
        
        if (step1Indicator && step2Indicator) {
          step2Indicator.classList.remove('active');
          step1Indicator.classList.add('active');
        }
        
        // Update step titles
        const step1Title = document.querySelector('.step-title:nth-child(1)');
        const step2Title = document.querySelector('.step-title:nth-child(2)');
        
        if (step1Title && step2Title) {
          step2Title.classList.remove('active');
          step1Title.classList.add('active');
        }
      }
    });
  }
  
  // Check if we're on the car selection page
  if (window.location.pathname.includes('car-selection.html')) {
    displayAvailableCars();
  }
  
  // Function to display available cars on the car selection page
  function displayAvailableCars() {
    console.log('Displaying available cars');
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Get booking details from URL parameters
    const pickupLocation = urlParams.get('pickup-location');
    const dropoffLocation = urlParams.get('dropoff-location');
    const pickupDate = urlParams.get('pickup-date');
    const pickupTime = urlParams.get('pickup-time');
    const dropoffDate = urlParams.get('dropoff-date');
    const dropoffTime = urlParams.get('dropoff-time');
    const duration = parseInt(urlParams.get('duration') || '1');
    
    // Display booking summary if elements exist
    const summaryContainer = document.getElementById('booking-summary');
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div class="summary-title">Your Trip Details</div>
        <div class="summary-item">
          <span class="summary-label">Pickup:</span>
          <span class="summary-value">${formatLocation(pickupLocation)} - ${formatDate(pickupDate)} at ${pickupTime}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Return:</span>
          <span class="summary-value">${formatLocation(dropoffLocation)} - ${formatDate(dropoffDate)} at ${dropoffTime}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Duration:</span>
          <span class="summary-value">${duration} ${duration === 1 ? 'day' : 'days'}</span>
        </div>
      `;
    }
    
    // Get container for car cards
    const carContainer = document.getElementById('available-cars');
    if (!carContainer) {
      console.error('Car container not found');
      return;
    }
    
    // Show loading state
    carContainer.innerHTML = '<div class="loading">Loading available vehicles...</div>';
    
    // Simulate getting available cars (in a real app, this would be an API call)
    setTimeout(() => {
      // Display available cars
      carContainer.innerHTML = getAvailableCarsHTML(duration);
      
      // Add event listeners to the car selection buttons
      const selectButtons = document.querySelectorAll('.select-car-btn');
      selectButtons.forEach(button => {
        button.addEventListener('click', function() {
          const carId = this.getAttribute('data-car-id');
          const carName = this.getAttribute('data-car-name');
          const carPrice = this.getAttribute('data-car-price');
          
          // Create URL parameters for the personal info page
          const params = new URLSearchParams(window.location.search);
          params.append('car-id', carId);
          params.append('car-name', carName);
          params.append('car-price', carPrice);
          
          // Redirect to personal info page
          window.location.href = `personal-info.html?${params.toString()}`;
        });
      });
    }, 1000);
  }
  
  // Helper function to format location names
  function formatLocation(locationCode) {
    const locations = {
      'airport': 'Chania Airport',
      'port': 'Chania Port',
      'city': 'Chania City Center',
      'hotel': 'Your Hotel/Villa'
    };
    
    return locations[locationCode] || locationCode;
  }
  
  // Helper function to format dates
  function formatDate(dateStr) {
    // Convert from MM/DD/YYYY to a more readable format
    if (!dateStr) return '';
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    return `${months[month]} ${day}, ${year}`;
  }
  
  // Function to generate HTML for available cars
  function getAvailableCarsHTML(duration) {
    // Car data with detailed specifications
    const cars = [
      {
        id: "aygo",
        name: "Toyota Aygo",
        description: "Compact and fuel-efficient, perfect for city driving.",
        pricePerDay: 35,
        image: "https://calmarental.com/images/CalmaAygo.jpg",
        category: "Small",
        group: "A1",
        specs: {
          engine: "1000cc",
          passengers: 4,
          doors: 5,
          gearbox: "Manual",
          airCondition: true,
          abs: true,
          airbag: true,
          fuel: "Gasoline",
          entertainment: "Radio/Bluetooth/USB"
        }
      },
      {
        id: "tiguan",
        name: "Volkswagen Tiguan R-Line",
        description: "Spacious SUV with advanced features for comfort.",
        pricePerDay: 75,
        image: "https://calmarental.com/images/CalmaTiguan.jpg",
        category: "SUV",
        group: "SUV",
        specs: {
          engine: "1600cc",
          passengers: 5,
          doors: 5,
          gearbox: "Manual",
          airCondition: true,
          abs: true,
          airbag: true,
          fuel: "Gasoline",
          entertainment: "Radio/Bluetooth/USB"
        }
      },
      {
        id: "golf",
        name: "Volkswagen Golf TDI",
        description: "Versatile hatchback with excellent handling.",
        pricePerDay: 55,
        image: "https://calmarental.com/images/CalmaGolf.jpg",
        category: "Compact",
        group: "C1",
        specs: {
          engine: "1600cc",
          passengers: 5,
          doors: 5,
          gearbox: "Manual",
          airCondition: true,
          abs: true,
          airbag: true,
          fuel: "Diesel",
          entertainment: "Radio/Bluetooth/USB"
        }
      },
      {
        id: "i10",
        name: "Hyundai i10",
        description: "Economical and easy to drive mini car.",
        pricePerDay: 32,
        image: "https://calmarental.com/images/Calmai10.jpg",
        category: "Small",
        group: "A1",
        specs: {
          engine: "1000cc",
          passengers: 4,
          doors: 5,
          gearbox: "Manual",
          airCondition: true,
          abs: true,
          airbag: true,
          fuel: "Gasoline",
          entertainment: "Radio/CD/USB"
        }
      },
      {
        id: "c3",
        name: "Citroen C3",
        description: "Stylish compact car with excellent comfort.",
        pricePerDay: 40,
        image: "https://calmarental.com/images/CalmaCitroen.jpg",
        category: "Economy",
        group: "B",
        specs: {
          engine: "1400cc",
          passengers: 5,
          doors: 5,
          gearbox: "Manual",
          airCondition: true,
          abs: true,
          airbag: true,
          fuel: "Diesel",
          entertainment: "Radio/Bluetooth/USB"
        }
      },
      {
        id: "celerio",
        name: "Suzuki Celerio",
        description: "Economical and reliable compact car.",
        pricePerDay: 38,
        image: "https://calmarental.com/images/CalmaSuzuki.jpg",
        category: "Small",
        group: "A1",
        specs: {
          engine: "1000cc",
          passengers: 4,
          doors: 5,
          gearbox: "Manual",
          airCondition: true,
          abs: true,
          airbag: true,
          fuel: "Gasoline",
          entertainment: "Radio/Bluetooth/USB"
        }
      }
    ];

    // Generate HTML for the cars grid
    let html = '<div class="cars-grid">';
    
    cars.forEach(car => {
      // Calculate total price
      const totalPrice = car.pricePerDay * duration;

      // Create specs HTML with icons
      let specsHTML = `
        <div class="car-specs">
          <div class="spec-item">
            <i class="fas fa-car-engine"></i>
            <span>Engine: ${car.specs.engine}</span>
          </div>
          <div class="spec-item">
            <i class="fas fa-users"></i>
            <span>Passengers: ${car.specs.passengers}</span>
          </div>
          <div class="spec-item">
            <i class="fas fa-door-open"></i>
            <span>Doors: ${car.specs.doors}</span>
          </div>
          <div class="spec-item">
            <i class="fas fa-cogs"></i>
            <span>Gearbox: ${car.specs.gearbox}</span>
          </div>
          <div class="spec-item">
            <i class="fas fa-snowflake"></i>
            <span>Air Condition</span>
          </div>
          <div class="spec-item">
            <i class="fas fa-car-crash"></i>
            <span>ABS</span>
          </div>
          <div class="spec-item">
            <i class="fas fa-shield-alt"></i>
            <span>Airbag</span>
          </div>
          <div class="spec-item">
            <i class="fas fa-gas-pump"></i>
            <span>Fuel: ${car.specs.fuel}</span>
          </div>
          <div class="spec-item">
            <i class="fas fa-music"></i>
            <span>${car.specs.entertainment}</span>
          </div>
        </div>
      `;

      html += `
        <div class="car-card" data-car-id="${car.id}">
          <div class="car-image">
            <img src="${car.image}" alt="${car.name}" onerror="this.src='images/CalmaLogo.jpg'">
            <div class="car-category">${car.category}</div>
          </div>
          <div class="car-details">
            <div>
              <h3>${car.name}</h3>
              <div class="car-group">Group ${car.group}</div>
              <p>${car.description}</p>
            </div>
            
            ${specsHTML}
            
            <div class="mt-auto">
              <div class="car-pricing">
                <div class="price">€${car.pricePerDay} per day</div>
                <div class="total-price">€${totalPrice.toFixed(2)} total</div>
              </div>
              
              <button class="select-car-btn" 
                      data-car-id="${car.id}" 
                      data-car-name="${car.name}" 
                      data-car-price="${car.pricePerDay}">
                Select This Car
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  // Helper function to show notifications
  function showNotification(message, type = 'success') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<p>${message}</p>`;
    
    // Add to container
    container.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  function addBookingToAdmin(bookingData) {
    // Generate a unique booking reference
    const bookingReference = 'BK' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Add timestamp and reference to the booking data
    const adminBookingData = {
        ...bookingData,
        bookingReference,
        timestamp: Date.now(),
        status: 'PENDING'
    };
    
    // Get existing bookings or initialize empty array
    const existingBookings = JSON.parse(localStorage.getItem('adminBookings')) || [];
    
    // Add new booking
    existingBookings.push(adminBookingData);
    
    // Save back to localStorage
    localStorage.setItem('adminBookings', JSON.stringify(existingBookings));
    
    return bookingReference;
  }

  function bookCar() {
    // ... existing code ...
    
    // After collecting all booking data and before showing notification
    const bookingReference = addBookingToAdmin(bookingData);
    
    // Show success notification with booking reference
    showNotification('success', `Car booked successfully! Your booking reference is ${bookingReference}.`);
    
    // ... existing code ...
  }
}); 