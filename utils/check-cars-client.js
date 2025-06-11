/**
 * Client-side utility to check if cars table exists and add sample cars
 * This script is meant to be included in the admin.html page.
 */

// Sample car data
const sampleCars = [
  {
    name: 'Toyota Aygo',
    description: 'Compact and fuel-efficient, perfect for city driving.',
    category: 'Economy',
    features: ['Automatic', '4 Seats', 'Air Conditioning', 'Fuel Efficient'],
    monthly_pricing: {
      January: 35, February: 35, March: 35, April: 35,
      May: 38, June: 42, July: 45, August: 49,
      September: 42, October: 35, November: 35, December: 35
    }
  },
  {
    name: 'Volkswagen Golf',
    description: 'Versatile hatchback with excellent handling.',
    category: 'Mid-Size',
    features: ['Manual', '5 Seats', 'Air Conditioning', 'Cruise Control'],
    monthly_pricing: {
      January: 45, February: 45, March: 45, April: 45,
      May: 50, June: 54, July: 59, August: 63,
      September: 54, October: 45, November: 45, December: 45
    }
  },
  {
    name: 'Hyundai i10',
    description: 'Economical and easy to drive mini car.',
    category: 'Economy',
    features: ['Manual', '4 Seats', 'Air Conditioning', 'Compact'],
    monthly_pricing: {
      January: 32, February: 32, March: 32, April: 32,
      May: 35, June: 38, July: 42, August: 45,
      September: 38, October: 32, November: 32, December: 32
    }
  }
];

/**
 * Function to check cars table and add sample data if needed
 * This function works directly with server routes instead of trying
 * to access the database directly.
 */
async function checkCarsAndAddSamples() {
  // Show progress in the debug panel if available
  const debugInfoElement = document.getElementById('debugInfo');
  const debugContentElement = document.getElementById('debugContent');
  
  if (debugInfoElement && debugContentElement) {
    debugInfoElement.style.display = 'block';
    debugContentElement.innerHTML = '🔍 Checking cars data...';
  }
  
  // Function to log messages (both to console and debug panel)
  function logMessage(message, isError = false) {
    if (isError) {
      console.error(message);
    } else {
      console.log(message);
    }
    
    if (debugContentElement) {
      debugContentElement.innerHTML += `<br>${isError ? '❌' : '✅'} ${message}`;
    }
  }
  
  try {
    logMessage('Checking cars table and adding sample data if needed...');
    
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('Admin token not found. Please log in again.');
    }
    
    // Make a GET request to the cars API
    const response = await fetch('/api/admin/cars', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    logMessage(`API call successful. Source: ${data.source || 'unknown'}`);
    
    // Check if cars exist
    if (!data.cars || data.cars.length === 0) {
      logMessage('No cars found. Adding sample cars...');
      
      // Add sample cars
      for (const car of sampleCars) {
        logMessage(`Adding car: ${car.name}`);
        
        // Generate unique car_id based on current timestamp
        const timestamp = new Date().getTime();
        const randomId = Math.floor(Math.random() * 10000);
        const carId = `${car.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${randomId}`;
        
        // Default image URL
        const image = `https://calmarental.com/images/cars/${car.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
        
        // Prepare car data
        const carData = {
          name: car.name,
          description: car.description,
          image: image,
          category: car.category,
          features: car.features,
          monthly_pricing: car.monthly_pricing,
          available: true
        };
        
        // Make POST request to add car
        const addResponse = await fetch('/api/admin/cars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify(carData)
        });
        
        if (!addResponse.ok) {
          const errorText = await addResponse.text();
          logMessage(`Error adding car ${car.name}: ${addResponse.status} ${errorText}`, true);
          continue;
        }
        
        const addResult = await addResponse.json();
        logMessage(`Added car ${car.name} successfully: ${addResult.success ? 'Yes' : 'No'}`);
      }
      
      // Check if cars were added
      const verifyResponse = await fetch('/api/admin/cars', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        logMessage(`After adding sample cars: ${verifyData.cars?.length || 0} cars now available`);
        
        // Reload the cars table if it exists
        if (typeof loadCars === 'function') {
          logMessage('Reloading cars display...');
          await loadCars();
        }
      }
    } else {
      logMessage(`Found ${data.cars.length} cars in the database`);
      
      // Display first car for verification
      if (data.cars.length > 0) {
        const car = data.cars[0];
        logMessage(`Sample car: ${car.name} (ID: ${car.car_id})`);
        
        // Check monthly_pricing format
        if (typeof car.monthly_pricing === 'string') {
          logMessage('WARNING: monthly_pricing is stored as string instead of object', true);
        }
        
        // Check features format
        if (typeof car.features === 'string') {
          logMessage('WARNING: features is stored as string instead of array', true);
        }
      }
    }
    
    logMessage('Car check completed');
    return true;
  } catch (error) {
    logMessage(`Error checking cars: ${error.message}`, true);
    return false;
  }
}

// Export the function for browser use
window.checkCarsAndAddSamples = checkCarsAndAddSamples; 