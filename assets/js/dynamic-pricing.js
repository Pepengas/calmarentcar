/**
 * Dynamic Pricing for Calma Car Rental
 * Handles price calculations based on rental month, duration, and selected extras
 */

let pricingData = null;

// Function to load pricing data from API
async function loadPricingData() {
  try {
    // First attempt to fetch from API
    const response = await fetch('/api/pricing');
    
    if (!response.ok) {
      console.warn('API pricing not available, falling back to local file');
      // Fall back to local file
      const fallbackResponse = await fetch('/assets/js/pricing.json');
      if (!fallbackResponse.ok) {
        throw new Error('Failed to load pricing data from any source');
      }
      pricingData = await fallbackResponse.json();
    } else {
      pricingData = await response.json();
    }
    
    console.log('Pricing data loaded successfully');
    return pricingData;
  } catch (error) {
    console.error('Error loading pricing data:', error);
    // Create a minimal default pricing structure
    pricingData = {
      cars: {},
      extras: {
        additionalDriver: 5,
        fullInsurance: 10,
        gpsNavigation: 7,
        childSeat: 5
      },
      durationPricing: {
        "1": 1,
        "2": 1,
        "3": 1,
        "4": 0.95,
        "5": 0.95, 
        "6": 0.95,
        "7": 0.85
      },
      prepaymentPercentage: 45
    };
    return pricingData;
  }
}

// Get month name from date
function getMonthName(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateObj = new Date(date);
  return months[dateObj.getMonth()];
}

// Calculate rental duration in days
function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1; // Ensure at least 1 day
}

// Fetch car pricing directly from API for specific car, month and duration
async function fetchCarPricing(carName, carId, month, days) {
  try {
    console.log(`🔍 fetchCarPricing: Looking for ${carName} (${carId || 'unknown'}) in ${month} for ${days} days`);
    
    // Add a cache buster to ensure we always get fresh data
    const cacheBuster = new Date().getTime();
    let url = `/api/car-pricing?month=${encodeURIComponent(month)}&days=${days}&_=${cacheBuster}&exact_only=true`;
    
    // If we have carId, use it as the primary identifier
    if (carId) {
      url += `&car_id=${encodeURIComponent(carId)}`;
    } else if (carName) {
      url += `&car=${encodeURIComponent(carName)}`;
    } else {
      throw new Error('Either car_id or car name must be provided');
    }
    
    console.log(`🔍 fetchCarPricing: API URL: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch pricing: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`📊 fetchCarPricing: API Response:`, data);
    
    if (data.success && data.price !== undefined) {
      console.log(`✅ fetchCarPricing: Found exact price: €${data.price}`);
      return {
        price: data.price,
        source: data.source || 'api',
        price_id: data.price_id
      };
    } else {
      throw new Error(data.error || 'Failed to fetch pricing');
    }
  } catch (error) {
    console.error(`❌ fetchCarPricing: Error for ${carName} in ${month} for ${days} days:`, error);
    throw error; // Re-throw to handle in the calling function
  }
}

// Get the daily rate for a car based on month
function getDailyRate(carName, month) {
  if (!pricingData || !pricingData.cars[carName]) {
    console.warn('Pricing data not available for', carName);
    return 45; // Default price if data not found
  }
  
  const carData = pricingData.cars[carName];
  if (carData[month]) {
    return carData[month];
  } else {
    console.warn(`Price not found for ${carName} in ${month}, using default price`);
    return 45; // Default price if month not found
  }
}

// Calculate total price based on car, dates, and extras
async function calculateTotalPrice(carName, startDate, endDate, extras = {}) {
  if (!pricingData) {
    await loadPricingData();
  }
  
  const month = getMonthName(startDate);
  const duration = calculateDuration(startDate, endDate);
  
  let dailyRate;
  let basePrice;
  let extrasTotal = 0;
  let totalPrice = 0;
  
  try {
    // Try to get pricing from API first (for cross-month calculations)
    const response = await fetch(`/api/calculate-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        car_name: carName,
        pickup_date: startDate,
        return_date: endDate,
        additional_driver: extras.additionalDriver || false,
        full_insurance: extras.fullInsurance || false,
        gps_navigation: extras.gpsNavigation || false,
        child_seat: extras.childSeat || false
      })
    });
    
    if (response.ok) {
      const apiPricing = await response.json();
      if (apiPricing.success) {
        // Use the API provided pricing
        dailyRate = apiPricing.dailyRate || 0;
        basePrice = apiPricing.basePrice || 0;
        extrasTotal = apiPricing.extrasTotal || 0;
        totalPrice = apiPricing.totalPrice || 0;
        
        // Calculate prepayment
        const prepaymentPercentage = pricingData.prepaymentPercentage || 45;
        const prepaymentAmount = (totalPrice * prepaymentPercentage / 100);
        const remainingAmount = totalPrice - prepaymentAmount;
        
        return {
          dailyRate,
          duration,
          month,
          basePrice,
          extrasTotal,
          totalPrice,
          prepaymentPercentage,
          prepaymentAmount,
          remainingAmount,
          extras
        };
      }
    }
  } catch (error) {
    console.warn('Error getting price from API, falling back to local calculation:', error);
  }
  
  // If API pricing failed, fall back to local calculation
  // Check if rental spans multiple months
  const startMonth = getMonthName(startDate);
  const endMonth = getMonthName(endDate);
  const isMultiMonth = startMonth !== endMonth;
  
  if (isMultiMonth) {
    console.log(`Cross-month rental detected: ${startMonth} to ${endMonth}`);
    
    // Calculate days in each month
    const startDate_obj = new Date(startDate);
    const endDate_obj = new Date(endDate);
    
    const daysInStartMonth = new Date(
      startDate_obj.getFullYear(),
      startDate_obj.getMonth() + 1,
      0
    ).getDate() - startDate_obj.getDate() + 1;
    
    const daysInEndMonth = endDate_obj.getDate();
    
    console.log(`Days in ${startMonth}: ${daysInStartMonth}, Days in ${endMonth}: ${daysInEndMonth}`);
    
    // Calculate price for each segment
    let startMonthPrice = 0;
    let endMonthPrice = 0;
    
    try {
      // Try to get pricing for start month from API
      const startMonthResponse = await fetchCarPricing(carName, null, startMonth, Math.min(daysInStartMonth, 7));
      startMonthPrice = startMonthResponse.price * daysInStartMonth;
      
      // Try to get pricing for end month from API
      const endMonthResponse = await fetchCarPricing(carName, null, endMonth, Math.min(daysInEndMonth, 7));
      endMonthPrice = endMonthResponse.price * daysInEndMonth;
      
      basePrice = startMonthPrice + endMonthPrice;
      dailyRate = basePrice / duration; // Average daily rate
    } catch (error) {
      console.warn('Error calculating cross-month pricing, using fallback:', error);
      dailyRate = getDailyRate(carName, startMonth);
      basePrice = dailyRate * duration;
    }
  } else {
    // Single month rental
    try {
      // Try to get pricing for the specified days first
      const pricingResponse = await fetchCarPricing(carName, null, month, Math.min(duration, 7));
      dailyRate = pricingResponse.price;
      basePrice = dailyRate * duration;
    } catch (error) {
      console.warn('Error fetching car pricing, using fallback:', error);
      dailyRate = getDailyRate(carName, month);
      
      // Apply duration discount from local pricing data
      const durationMultiplier = pricingData.durationPricing[Math.min(duration, 7)] || 1;
      basePrice = dailyRate * duration * durationMultiplier;
    }
  }
  
  // Calculate extras cost
  extrasTotal = 0;
  
  // Only add cost if the extra has a price greater than 0
  if (extras.additionalDriver && pricingData.extras.additionalDriver > 0) {
    extrasTotal += pricingData.extras.additionalDriver * duration;
  }
  
  if (extras.fullInsurance && pricingData.extras.fullInsurance > 0) {
    extrasTotal += pricingData.extras.fullInsurance * duration;
  }
  
  if (extras.gpsNavigation && pricingData.extras.gpsNavigation > 0) {
    extrasTotal += pricingData.extras.gpsNavigation * duration;
  }
  
  if (extras.childSeat && pricingData.extras.childSeat > 0) {
    // Child seat is charged once per rental, not per day
    extrasTotal += pricingData.extras.childSeat;
  }
  
  // Calculate total price
  totalPrice = basePrice + extrasTotal;
  
  // Calculate prepayment amount (default 45% if not specified)
  const prepaymentPercentage = pricingData.prepaymentPercentage || 45;
  const prepaymentAmount = (totalPrice * prepaymentPercentage / 100);
  const remainingAmount = totalPrice - prepaymentAmount;
  
  return {
    dailyRate,
    duration,
    month,
    basePrice,
    extrasTotal,
    totalPrice,
    prepaymentPercentage,
    prepaymentAmount,
    remainingAmount,
    extras
  };
}

// Format price to display as currency
function formatPrice(price) {
  return `€${price.toFixed(2)}`;
}

// Generate prepayment breakdown HTML
function generatePrepaymentBreakdown(totalPrice) {
  if (!pricingData) return '';
  
  const prepaymentPercentage = pricingData.prepaymentPercentage || 45;
  const remainingPercentage = 100 - prepaymentPercentage;
  const prepaymentAmount = (totalPrice * prepaymentPercentage / 100);
  const remainingAmount = totalPrice - prepaymentAmount;
  
  return `
    <div class="prepayment-breakdown">
      <div class="prepayment-item">
        <span class="prepayment-label">Pay now (${prepaymentPercentage}%):</span>
        <span class="prepayment-value">${formatPrice(prepaymentAmount)}</span>
      </div>
      <div class="prepayment-item">
        <span class="prepayment-label">Pay at pickup (${remainingPercentage}%):</span>
        <span class="prepayment-value">${formatPrice(remainingAmount)}</span>
      </div>
    </div>
  `;
}

// Get extra item description with price
function getExtraDescription(extraType) {
  if (!pricingData) return '';
  
  const price = pricingData.extras[extraType];
  if (extraType === 'additionalDriver' && price === 0) {
    return 'Free';
  } else if (price > 0) {
    return `${formatPrice(price)}/day`;
  }
  return '';
}

// Function to update prices based on selected dates
async function updatePrices(pickupDate, dropoffDate) {
  if (!pickupDate || !dropoffDate) return;
  
  if (!pricingData) {
    await loadPricingData();
  }
  
  const month = getMonthName(pickupDate);
  const duration = calculateDuration(pickupDate, dropoffDate);
  
  console.log(`🔄 updatePrices: Updating all car prices for ${month}, ${duration} days`);
  
  // Update all car prices
  document.querySelectorAll('.car-card').forEach(async (card) => {
    const carNameElement = card.querySelector('.car-details h3');
    if (!carNameElement) return;
    
    const carName = carNameElement.textContent.trim();
    const carId = card.dataset.carId;
    const priceElement = card.querySelector('.price');
    const totalPriceElement = card.querySelector('.total-price');
    
    console.log(`🔍 updatePrices: Processing car ${carName} (${carId || 'unknown id'})`);
    
    if (priceElement) {
      // Always try to get the exact price from the pricing table first
      try {
        console.log(`🔍 updatePrices: Fetching exact price for ${carName} (${carId || 'unknown'}) in ${month} for ${duration} days`);
        
        // Cache buster to ensure we get fresh data
        const cacheBuster = new Date().getTime();
        const url = `/api/car-pricing?month=${encodeURIComponent(month)}&days=${duration}&_=${cacheBuster}&exact_only=true${carId ? `&car_id=${encodeURIComponent(carId)}` : `&car=${encodeURIComponent(carName)}`}`;
        const response = await fetch(url);
        
        console.log(`📡 updatePrices: API response status for ${carName}: ${response.status}`);
        
        if (response.ok) {
          const pricingData = await response.json();
          console.log(`📊 updatePrices: Received price data for ${carName}:`, pricingData);
          
          if (pricingData.success && pricingData.price !== undefined) {
            // Found an exact price match in the database
            const totalPrice = parseFloat(pricingData.price);
            const dailyRate = totalPrice / duration; // Only used for display
            
            console.log(`✅ updatePrices: EXACT PRICE MATCH for ${carName}: Total €${totalPrice}, Daily €${dailyRate.toFixed(2)}`);
            
            // Update UI with the exact price
            priceElement.textContent = `From ${formatPrice(dailyRate)}/day`;
            priceElement.dataset.priceSource = pricingData.source || 'exact';
            
            // Store data attributes for later use
            card.dataset.dailyRate = dailyRate;
            card.dataset.carName = carName;
            card.dataset.priceSource = pricingData.source || 'exact';
            
            // Update total price if element exists
            if (totalPriceElement) {
              // Calculate prepayment
              const prepaymentPercentage = 45; // Default
              const prepaymentAmount = (totalPrice * prepaymentPercentage / 100);
              const remainingAmount = totalPrice - prepaymentAmount;
              
              // Update total price display with prepayment breakdown
              totalPriceElement.textContent = `Total: ${formatPrice(totalPrice)}`;
              totalPriceElement.dataset.priceSource = pricingData.source || 'exact';
              
              // Add payment breakdown as a new element if it doesn't exist
              const paymentBreakdown = card.querySelector('.payment-breakdown');
              if (paymentBreakdown) {
                paymentBreakdown.innerHTML = `
                  <div class="payment-item">
                    <span class="payment-label">Pay online (${prepaymentPercentage}%):</span>
                    <span class="payment-value">${formatPrice(prepaymentAmount)}</span>
                  </div>
                  <div class="payment-item">
                    <span class="payment-label">Pay on delivery (${100 - prepaymentPercentage}%):</span>
                    <span class="payment-value">${formatPrice(remainingAmount)}</span>
                  </div>
                `;
              }
              
              // Store data for later use
              card.dataset.totalPrice = totalPrice;
              card.dataset.prepaymentAmount = prepaymentAmount;
              card.dataset.remainingAmount = remainingAmount;
            }
            
            console.log(`💰 PRICE DISPLAY UPDATED: Car=${carName}, ID=${carId}, Total=${totalPrice}, Daily=${dailyRate.toFixed(2)}, Source=${pricingData.source || 'exact'}`);
            return; // Skip the fallback calculation - we have the exact price
          } else {
            console.warn(`⚠️ updatePrices: No exact price found for ${carName} in ${month} for ${duration} days`);
          }
        } else {
          console.warn(`⚠️ updatePrices: API error for ${carName}: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ updatePrices: Error getting exact price for ${carName}:`, error);
      }
      
      // Only reach here if the above exact price lookup failed
      
      // Try to get pricing from calculate-price API as a fallback (includes extras/discounts)
      try {
        console.log(`🔍 updatePrices: Trying calculate-price API for ${carName}`);
        const response = await fetch(`/api/calculate-price`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            car_name: carName,
            car_id: carId,
            pickup_date: pickupDate,
            return_date: dropoffDate
          })
        });
        
        if (response.ok) {
          const pricingData = await response.json();
          if (pricingData.success) {
            // Update price display with API data
            const dailyRate = pricingData.dailyRate;
            const totalPrice = pricingData.totalPrice;
            
            console.log(`⚠️ updatePrices: Using calculated price for ${carName}: Total €${totalPrice}, Daily €${dailyRate}`);
            
            priceElement.textContent = `${formatPrice(dailyRate)}/day`;
            priceElement.dataset.priceSource = 'calculated';
            
            // Store data attributes for later use
            card.dataset.dailyRate = dailyRate;
            card.dataset.carName = carName;
            card.dataset.priceSource = 'calculated';
            
            // Update total price if element exists
            if (totalPriceElement) {
              // Calculate prepayment
              const prepaymentPercentage = 45; // Default
              const prepaymentAmount = (totalPrice * prepaymentPercentage / 100);
              const remainingAmount = totalPrice - prepaymentAmount;
              
              // Update total price display
              totalPriceElement.textContent = `Total: ${formatPrice(totalPrice)}`;
              totalPriceElement.dataset.priceSource = 'calculated';
              
              // Store data for later use
              card.dataset.totalPrice = totalPrice;
              card.dataset.prepaymentAmount = prepaymentAmount;
              card.dataset.remainingAmount = remainingAmount;
            }
            
            console.log(`💰 PRICE DISPLAY UPDATED (Calculated): Car=${carName}, Total=${totalPrice}, Daily=${dailyRate}, Source=calculated`);
            return; // Skip the local fallback calculation
          }
        }
      } catch (error) {
        console.error(`❌ updatePrices: Error using calculate-price API for ${carName}:`, error);
      }
      
      // Local fallback calculation as a last resort (should rarely happen)
      console.warn(`⚠️ updatePrices: All API methods failed, using local fallback for ${carName}`);
      const dailyRate = getDailyRate(carName, month);
      priceElement.textContent = `${formatPrice(dailyRate)}/day`;
      priceElement.dataset.priceSource = 'local_fallback';
      
      // Store data attributes for later use
      card.dataset.dailyRate = dailyRate;
      card.dataset.carName = carName;
      card.dataset.priceSource = 'local_fallback';
      
      // Update total price if element exists
      if (totalPriceElement) {
        const durationMultiplier = pricingData.durationPricing[Math.min(duration, 7)] || 1;
        const basePrice = dailyRate * duration * durationMultiplier;
        const totalPrice = basePrice; // No extras at this stage
        
        // Calculate prepayment
        const prepaymentPercentage = pricingData.prepaymentPercentage || 45;
        const prepaymentAmount = (totalPrice * prepaymentPercentage / 100);
        const remainingAmount = totalPrice - prepaymentAmount;
        
        // Update total price display
        totalPriceElement.textContent = `Total: ${formatPrice(totalPrice)}`;
        totalPriceElement.dataset.priceSource = 'local_fallback';
        
        // Store data for later use
        card.dataset.totalPrice = totalPrice;
        card.dataset.prepaymentAmount = prepaymentAmount;
        card.dataset.remainingAmount = remainingAmount;
        
        console.log(`💰 PRICE DISPLAY UPDATED (Fallback): Car=${carName}, Total=${totalPrice}, Daily=${dailyRate}, Source=local_fallback`);
      }
    }
  });
  
  // Update extras labels with dynamic pricing
  updateExtrasLabels();
}

// Function to update extras labels with dynamic pricing
function updateExtrasLabels() {
  if (!pricingData) return;
  
  // Update additional driver label
  const additionalDriverLabel = document.querySelector('label[for="additionalDriver"]');
  if (additionalDriverLabel) {
    const price = pricingData.extras.additionalDriver;
    if (price === 0) {
      additionalDriverLabel.textContent = 'Additional Driver (Free)';
    } else {
      additionalDriverLabel.textContent = `Additional Driver (+${formatPrice(price)}/day)`;
    }
  }
  
  // Update full insurance label
  const fullInsuranceLabel = document.querySelector('label[for="fullInsurance"]');
  if (fullInsuranceLabel) {
    const price = pricingData.extras.fullInsurance;
    fullInsuranceLabel.textContent = `Full Insurance (+${formatPrice(price)}/day)`;
  }
  
  // Update GPS navigation label
  const gpsNavigationLabel = document.querySelector('label[for="gpsNavigation"]');
  if (gpsNavigationLabel) {
    const price = pricingData.extras.gpsNavigation;
    gpsNavigationLabel.textContent = `GPS Navigation (+${formatPrice(price)}/day)`;
  }
  
  // Update child seat label
  const childSeatLabel = document.querySelector('label[for="childSeat"]');
  if (childSeatLabel) {
    const price = pricingData.extras.childSeat;
    childSeatLabel.textContent = `Child Seat (+${formatPrice(price)}/rental)`;
  }
}

// Initialize the pricing functionality
async function initDynamicPricing() {
  // Load pricing data
  await loadPricingData();
  
  // Check if we're on car-selection page
  const bookingSummary = document.getElementById('booking-summary');
  if (bookingSummary) {
    // Get dates from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const pickupDate = urlParams.get('pickup-date');
    const dropoffDate = urlParams.get('dropoff-date');
    
    if (pickupDate && dropoffDate) {
      // Update all car prices based on dates
      await updatePrices(pickupDate, dropoffDate);
      
      // Store dates in localStorage for other pages
      localStorage.setItem('pickupDate', pickupDate);
      localStorage.setItem('dropoffDate', dropoffDate);
    }
  } else {
    // If not on car selection page, still update extras labels
    updateExtrasLabels();
  }
  
  // Initialize car selection handling
  document.addEventListener('click', function(e) {
    // Check if clicked element is a select car button
    if (e.target.classList.contains('select-car-btn')) {
      const carCard = e.target.closest('.car-card');
      if (carCard) {
        const carName = carCard.dataset.carName;
        const dailyRate = parseFloat(carCard.dataset.dailyRate);
        const totalPrice = parseFloat(carCard.dataset.totalPrice);
        const prepaymentAmount = parseFloat(carCard.dataset.prepaymentAmount);
        const remainingAmount = parseFloat(carCard.dataset.remainingAmount);
        
        // Store selected car info in localStorage
        const selectedCar = {
          name: carName,
          dailyRate: dailyRate,
          totalPrice: totalPrice,
          prepaymentAmount: prepaymentAmount,
          remainingAmount: remainingAmount
        };
        
        localStorage.setItem('selectedCar', JSON.stringify(selectedCar));
      }
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDynamicPricing);

// Export functions for use in other scripts
window.dynamicPricing = {
  calculateTotalPrice,
  getDailyRate,
  getMonthName,
  calculateDuration,
  formatPrice,
  updatePrices,
  getExtraDescription,
  generatePrepaymentBreakdown,
  updateExtrasLabels,
  fetchCarPricing
}; 