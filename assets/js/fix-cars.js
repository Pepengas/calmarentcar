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
        
        // Save booking data to sessionStorage for restoration
        const bookingData = {
          pickupLocation,
          dropoffLocation,
          pickupDate,
          pickupTime,
          returnDate: dropoffDate,
          returnTime: dropoffTime,
          duration: null // will set below
        };
        // Calculate rental duration in days
        const pickupDateTime = new Date(`${pickupDate} ${pickupTime}`);
        const dropoffDateTime = new Date(`${dropoffDate} ${dropoffTime}`);
        const durationMs = dropoffDateTime - pickupDateTime;
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        bookingData.duration = durationDays;
        sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
        
        // Create URL parameters
        const params = new URLSearchParams();
        params.append('pickup-location', pickupLocation);
        params.append('dropoff-location', dropoffLocation);
        params.append('pickup-date', pickupDate);
        params.append('pickup-time', pickupTime);
        params.append('dropoff-date', dropoffDate);
        params.append('dropoff-time', dropoffTime);
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
  
  // Restore booking data from sessionStorage if URL params are missing or null
  if (window.location.pathname.includes('car-selection.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const keys = ['pickup-location', 'dropoff-location', 'pickup-date', 'dropoff-date', 'duration'];
    let missing = false;
    for (const key of keys) {
      const val = urlParams.get(key);
      if (!val || val === 'null' || val === 'undefined') {
        missing = true;
        break;
      }
    }
    if (missing) {
      // Try to get from sessionStorage
      const bookingDataRaw = sessionStorage.getItem('bookingData');
      if (bookingDataRaw) {
        const bookingData = JSON.parse(bookingDataRaw);
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
        return; // Prevent further execution
      }
    }
  }
  
  // Check if we're on the car selection page
  if (window.location.pathname.includes('car-selection.html')) {
    displayAvailableCars();
  }
  
  // Function to display available cars on the car selection page
  async function displayAvailableCars() {
    // Log the selected dates for debugging
    const urlParams = new URLSearchParams(window.location.search);
    const pickupDateRaw = urlParams.get('pickup-date');
    const dropoffDateRaw = urlParams.get('dropoff-date');
    const pickupDate = toISODateString(pickupDateRaw);
    const dropoffDate = toISODateString(dropoffDateRaw);
    console.log('[CAR SELECTION DEBUG] pickupDate:', pickupDate, 'dropoffDate:', dropoffDate);
    if (!pickupDate || !dropoffDate || isNaN(Date.parse(pickupDate + 'T00:00:00Z')) || isNaN(Date.parse(dropoffDate + 'T00:00:00Z'))) {
      const carContainer = document.getElementById('available-cars');
      if (carContainer) {
        carContainer.innerHTML = '<div class="loading">Please select valid pickup and return dates.</div>';
      }
      console.error('[CAR SELECTION ERROR] Invalid pickup or dropoff date:', pickupDateRaw, dropoffDateRaw);
      return;
    }
    console.log('Displaying available cars');
    // Get booking details from URL parameters
    const pickupLocation = urlParams.get('pickup-location');
    const dropoffLocation = urlParams.get('dropoff-location');
    const pickupTime = urlParams.get('pickup-time');
    const dropoffTime = urlParams.get('dropoff-time');
    const duration = parseInt(urlParams.get('duration') || '1');
    // Display booking summary if elements exist
    const summaryContainer = document.getElementById('booking-summary');
    if (summaryContainer) {
      // Calculate correct duration (inclusive)
      let durationDays = 1;
      if (pickupDate && dropoffDate) {
        const pickup = new Date(pickupDate);
        const dropoff = new Date(dropoffDate);
        durationDays = Math.ceil((dropoff - pickup) / (1000 * 60 * 60 * 24)) + 1;
        if (durationDays < 1) durationDays = 1;
      }
      summaryContainer.innerHTML = `
        <div class="summary-title">Your Trip Details</div>
        <div class="trip-detail">
          <div class="trip-label"><i class="fas fa-map-marker-alt"></i> Pickup Location</div>
          <div class="trip-value">${formatLocation(pickupLocation)}</div>
          <div class="trip-date"><i class="fas fa-calendar-alt"></i> ${formatDate(pickupDate)}${pickupTime ? ' at ' + pickupTime : ''}</div>
        </div>
        <div class="trip-detail">
          <div class="trip-label"><i class="fas fa-flag-checkered"></i> Return Location</div>
          <div class="trip-value">${formatLocation(dropoffLocation)}</div>
          <div class="trip-date"><i class="fas fa-calendar-alt"></i> ${formatDate(dropoffDate)}${dropoffTime ? ' at ' + dropoffTime : ''}</div>
        </div>
        <div class="trip-detail duration-detail">
          <div class="trip-label"><i class="fas fa-hourglass-half"></i> Duration</div>
          <div class="trip-value">${durationDays} ${durationDays === 1 ? 'day' : 'days'}</div>
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
    try {
      // Fetch car availability from new endpoint
      const response = await fetch('/api/cars/availability/all');
      const data = await response.json();
      if (!data.success) throw new Error('Failed to fetch car availability');
      const cars = data.cars;
      carContainer.innerHTML = getAvailableCarsHTMLWithAvailability(duration, cars, pickupDate, dropoffDate);
      // Add event listeners to the car selection buttons
      const selectButtons = document.querySelectorAll('.select-car-btn');
      selectButtons.forEach(button => {
        if (button.disabled) return;
        button.addEventListener('click', function() {
          const carId = this.getAttribute('data-car-id');
          const carName = this.getAttribute('data-car-name');
          const carPrice = parseFloat(this.getAttribute('data-car-price'));
          // Extract make and model from car name
          const nameParts = carName.split(' ');
          const make = nameParts[0];
          const model = nameParts.slice(1).join(' ');
          // Get duration from URL params
          const urlParams = new URLSearchParams(window.location.search);
          let durationDays = parseInt(urlParams.get('duration') || '1');
          if (isNaN(durationDays) || durationDays < 1) durationDays = 1;
          // Try to get total price from the car card if available
          let totalPrice = 0;
          const card = this.closest('.car-card');
          if (card) {
            const priceElement = card.querySelector('.car-price');
            if (priceElement && priceElement.textContent.includes('€')) {
              const match = priceElement.textContent.match(/€([\d\.]+)/);
              if (match) {
                totalPrice = parseFloat(match[1]);
              }
            }
          }
          // Fallback: calculate total price
          if (!totalPrice && carPrice > 0 && durationDays > 0) {
            totalPrice = carPrice * durationDays;
          }
          // Save selected car data to localStorage for reliable access between pages
          const selectedCar = {
            id: carId,
            name: carName,
            make: make,
            model: model,
            price: carPrice,
            totalPrice: totalPrice,
            durationDays: durationDays
          };
          // Log the data being saved
          console.log('Saving car data to localStorage:', selectedCar);
          // Save to localStorage
          localStorage.setItem('selectedCar', JSON.stringify(selectedCar));
          // Create URL parameters for the personal info page
          const params = new URLSearchParams(window.location.search);
          params.append('car-id', carId);
          params.append('car-name', carName);
          params.append('car-price', carPrice);
          // Redirect to personal info page
          window.location.href = `personal-info.html?${params.toString()}`;
        });
      });
      // Fetch and update prices for each car card after rendering
      if (pickupDate && dropoffDate) {
        document.querySelectorAll('.car-card').forEach(async (card) => {
          const carId = card.dataset.carId;
          const priceElement = card.querySelector('.car-price');
          try {
            // Calculate duration in days (inclusive)
            const pickup = new Date(pickupDate);
            const dropoff = new Date(dropoffDate);
            let days = Math.ceil((dropoff - pickup) / (1000 * 60 * 60 * 24)) + 1;
            if (days < 1) days = 1;
            // Always use the pickup month for price lookup (per admin panel logic)
            const month = pickup.toISOString().slice(0, 7);
            console.log(`[fix-cars] Fetching price for carId=${carId}, month=${month}, days=${days}`);
            const response = await fetch(`/api/get-price?car_id=${carId}&month=${month}&days=${days}`);
            const data = await response.json();
            console.log(`[fix-cars] API response for carId=${carId}:`, data);
            if (!data.success) {
              throw new Error(data.error || 'Failed to get price');
            }
            priceElement.textContent = `Total: €${data.total_price}`;
            console.log(`[fix-cars] Set price for carId=${carId}: Total: €${data.total_price}`);
          } catch (error) {
            console.error('Error calculating price:', error);
            if (priceElement) priceElement.textContent = 'Price unavailable';
          }
        });
      }
    } catch (err) {
      carContainer.innerHTML = '<div class="loading">Failed to load cars.</div>';
      console.error('Error fetching cars:', err);
    }
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
  
  // Function to extract car specs from features array
  function extractSpecsFromFeatures(featuresArr) {
    // Default values
    const specs = {
      engine: '',
      passengers: '',
      doors: '',
      gearbox: '',
      airCondition: false,
      abs: false,
      airbag: false,
      fuel: '',
      entertainment: ''
    };
    if (!Array.isArray(featuresArr)) return specs;
    featuresArr.forEach(f => {
      const val = f.toLowerCase();
      if (val.includes('automatic')) specs.gearbox = 'Automatic';
      if (val.includes('manual')) specs.gearbox = 'Manual';
      if (val.match(/\d+\s*seats?/)) specs.passengers = val.match(/\d+/)[0];
      if (val.match(/\d+\s*doors?/)) specs.doors = val.match(/\d+/)[0];
      if (val.includes('air conditioning') || val.includes('a/c')) specs.airCondition = true;
      if (val.includes('abs')) specs.abs = true;
      if (val.includes('airbag')) specs.airbag = true;
      if (val.includes('petrol')) specs.fuel = 'Petrol';
      if (val.includes('diesel')) specs.fuel = 'Diesel';
      if (val.includes('hybrid')) specs.fuel = 'Hybrid';
      if (val.includes('electric')) specs.fuel = 'Electric';
      if (val.includes('bluetooth')) specs.entertainment = 'Bluetooth';
      if (val.includes('usb')) specs.entertainment = 'USB';
      if (val.includes('radio')) specs.entertainment = 'Radio';
      if (val.includes('cd')) specs.entertainment = 'CD Player';
      if (val.includes('cruise control')) specs.entertainment = 'Cruise Control';
      // Add more as needed
    });
    return specs;
  }
  
  // Helper: Check if two date ranges overlap (inclusive)
  function rangesOverlap(start1, end1, start2, end2) {
    // All params are Date objects (UTC)
    return start1 <= end2 && end1 >= start2;
  }
  
  function parseDateUTC(dateString) {
    // Always parse as UTC midnight
    return new Date(dateString + 'T00:00:00Z');
  }
  
  function isValidDateString(dateString) {
    return typeof dateString === 'string' && dateString.length === 10 && !isNaN(Date.parse(dateString + 'T00:00:00Z'));
  }
  
  function isValidDateObject(date) {
    return date instanceof Date && !isNaN(date.getTime());
  }
  
  function toISODateString(dateStr) {
    // Convert MM/DD/YYYY to YYYY-MM-DD
    if (typeof dateStr !== 'string') return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  
  // Helper: Check if a car is available for the selected range
  function isCarAvailableForRange(car, pickupDate, dropoffDate) {
    // Always convert to ISO format for parsing
    pickupDate = toISODateString(pickupDate);
    dropoffDate = toISODateString(dropoffDate);
    if (!pickupDate || !dropoffDate) return true;
    // Standardize date objects as UTC
    const userStart = parseDateUTC(pickupDate);
    const userEnd = parseDateUTC(dropoffDate);
    // Manual status logic
    if (car.manual_status === 'unavailable') return false;
    if (car.manual_status === 'available') {
      if (Array.isArray(car.manual_blocks)) {
        for (const block of car.manual_blocks) {
          if (!isValidDateString(block.start) || !isValidDateString(block.end)) {
            console.warn(`[AVAILABILITY DEBUG] Skipping invalid manual block:`, block);
            continue;
          }
          const blockStart = parseDateUTC(block.start);
          const blockEnd = parseDateUTC(block.end);
          const overlap = rangesOverlap(userStart, userEnd, blockStart, blockEnd);
          console.log(`[AVAILABILITY DEBUG] Manual block check: ${isValidDateObject(userStart) ? userStart.toISOString() : userStart} to ${isValidDateObject(userEnd) ? userEnd.toISOString() : userEnd} vs ${isValidDateObject(blockStart) ? blockStart.toISOString() : blockStart} to ${isValidDateObject(blockEnd) ? blockEnd.toISOString() : blockEnd} => overlap: ${overlap}`);
          if (overlap) {
            return false;
          }
        }
      }
      return true;
    }
    // Automatic: unavailable if any booking or manual block overlaps
    if (Array.isArray(car.manual_blocks)) {
      for (const block of car.manual_blocks) {
        if (!isValidDateString(block.start) || !isValidDateString(block.end)) {
          console.warn(`[AVAILABILITY DEBUG] Skipping invalid manual block:`, block);
          continue;
        }
        const blockStart = parseDateUTC(block.start);
        const blockEnd = parseDateUTC(block.end);
        const overlap = rangesOverlap(userStart, userEnd, blockStart, blockEnd);
        console.log(`[AVAILABILITY DEBUG] Manual block check: ${isValidDateObject(userStart) ? userStart.toISOString() : userStart} to ${isValidDateObject(userEnd) ? userEnd.toISOString() : userEnd} vs ${isValidDateObject(blockStart) ? blockStart.toISOString() : blockStart} to ${isValidDateObject(blockEnd) ? blockEnd.toISOString() : blockEnd} => overlap: ${overlap}`);
        if (overlap) {
          return false;
        }
      }
    }
    if (Array.isArray(car.booked_ranges)) {
      console.log(`\n[AVAILABILITY DEBUG] Car: ${car.name} (${car.id})`);
      console.log(`Selected range: ${isValidDateObject(userStart) ? userStart.toISOString() : userStart} to ${isValidDateObject(userEnd) ? userEnd.toISOString() : userEnd}`);
      for (const [idx, booking] of car.booked_ranges.entries()) {
        if (!isValidDateString(booking.start) || !isValidDateString(booking.end)) {
          console.warn(`[AVAILABILITY DEBUG] Skipping invalid booking:`, booking);
          continue;
        }
        const bookingStart = parseDateUTC(booking.start);
        const bookingEnd = parseDateUTC(booking.end);
        const overlap = rangesOverlap(userStart, userEnd, bookingStart, bookingEnd);
        console.log(`Booked range ${idx + 1}: ${isValidDateObject(bookingStart) ? bookingStart.toISOString() : bookingStart} to ${isValidDateObject(bookingEnd) ? bookingEnd.toISOString() : bookingEnd} (status: ${booking.status}) => overlap: ${overlap}`);
        if (overlap) {
          console.log('-> Overlap detected! Car is unavailable for this range.');
          return false;
        }
      }
    }
    return true;
  }
  
  // Generate car cards with true availability and correct image
  function getAvailableCarsHTMLWithAvailability(duration, cars, pickupDate, dropoffDate) {
    let html = '<div class="cars-grid">';
    cars.forEach(car => {
      // Prefer specs field if present
      const specs = car.specs && Object.keys(car.specs).length > 0 ? car.specs : extractSpecsFromFeatures(car.features);
      let specsHTML = `
        <div class="car-specs">
          <div class="spec-item"><i class="fas fa-gas-pump"></i><span>Engine: ${specs.engine || '-'}</span></div>
          <div class="spec-item"><i class="fas fa-users"></i><span>Passengers: ${specs.passengers || '-'}</span></div>
          <div class="spec-item"><i class="fas fa-door-open"></i><span>Doors: ${specs.doors || '-'}</span></div>
          <div class="spec-item"><i class="fas fa-cogs"></i><span>Gearbox: ${specs.gearbox || '-'}</span></div>
          <div class="spec-item"><i class="fas fa-snowflake"></i><span>Air Condition: ${specs.airCondition ? 'Yes' : '-'}</span></div>
          <div class="spec-item"><i class="fas fa-car-crash"></i><span>ABS: ${specs.abs ? 'Yes' : '-'}</span></div>
          <div class="spec-item"><i class="fas fa-shield-alt"></i><span>Airbag: ${specs.airbag ? 'Yes' : '-'}</span></div>
          <div class="spec-item"><i class="fas fa-gas-pump"></i><span>Fuel: ${specs.fuel || '-'}</span></div>
          <div class="spec-item"><i class="fas fa-music"></i><span>${specs.entertainment || '-'}</span></div>
        </div>
      `;
      // Check availability
      const isAvailable = isCarAvailableForRange(car, pickupDate, dropoffDate);
      // Image logic
      let imageUrl = 'images/CalmaLogo.jpg';
      if (car.image && typeof car.image === 'string' && car.image.trim() !== '') {
        if (/^https?:\/\//.test(car.image)) {
          imageUrl = car.image;
        } else if (!car.image.includes('/') && !car.image.includes('\\')) {
          imageUrl = `/assets/images/${car.image}`;
        } else {
          imageUrl = 'images/CalmaLogo.jpg';
        }
      }
      html += `
        <div class="car-card" data-car-id="${car.id}">
          <div class="car-image">
            <img src="${imageUrl}" alt="${car.name}" onerror="this.src='images/CalmaLogo.jpg'">
            <div class="car-category">${car.category}</div>
          </div>
          <div class="car-details">
            <div>
              <h3>${car.name}</h3>
              <div class="car-group">Group ${car.group || ''}</div>
              <p>${car.description || ''}</p>
            </div>
            ${specsHTML}
            <div class="mt-auto">
              <div class="car-pricing">
                <div class="car-price">Loading...</div>
                <div class="total-price" style="display:none;"></div>
              </div>
              <button class="select-car-btn${!isAvailable ? ' unavailable-btn' : ''}" 
                      data-car-id="${car.id}" 
                      data-car-name="${car.name}" 
                      data-car-price="0"
                      ${!isAvailable ? 'disabled' : ''}>
                ${isAvailable ? 'Select This Car' : 'Unavailable'}
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }
  
  // Add CSS for unavailable button
  (function addUnavailableBtnStyle() {
    const style = document.createElement('style');
    style.innerHTML = `
      .select-car-btn.unavailable-btn {
        background: #bbb !important;
        color: #fff !important;
        cursor: not-allowed !important;
        pointer-events: none !important;
        border: none !important;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);
  })();
  
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