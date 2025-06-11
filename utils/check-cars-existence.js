/**
 * Simple utility to check if cars table exists and add sample cars
 */
const { v4: uuidv4 } = require('uuid');

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
  try {
    console.log('🔍 Checking cars table and adding sample data if needed...');
    
    // Make a GET request to the cars API
    const response = await fetch('/api/admin/cars', {
      headers: {
        'Authorization': 'Bearer ' + (process.env.ADMIN_API_TOKEN || 'calma-admin-token-2023')
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ API call successful. Source: ${data.source || 'unknown'}`);
    
    // Check if cars exist
    if (!data.cars || data.cars.length === 0) {
      console.log('⚠️ No cars found. Adding sample cars...');
      
      // Add sample cars
      for (const car of sampleCars) {
        console.log(`Adding car: ${car.name}`);
        
        // Generate unique car_id
        const carId = `${car.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 8)}`;
        
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
            'Authorization': 'Bearer ' + (process.env.ADMIN_API_TOKEN || 'calma-admin-token-2023')
          },
          body: JSON.stringify(carData)
        });
        
        if (!addResponse.ok) {
          console.error(`❌ Error adding car ${car.name}: ${addResponse.status} ${addResponse.statusText}`);
          const errorData = await addResponse.json();
          console.error(errorData);
          continue;
        }
        
        const addResult = await addResponse.json();
        console.log(`✅ Added car successfully: ${addResult.success ? 'Yes' : 'No'}`);
      }
      
      // Check if cars were added
      const verifyResponse = await fetch('/api/admin/cars', {
        headers: {
          'Authorization': 'Bearer ' + (process.env.ADMIN_API_TOKEN || 'calma-admin-token-2023')
        }
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log(`✅ After adding sample cars: ${verifyData.cars?.length || 0} cars now available`);
      }
    } else {
      console.log(`✅ Found ${data.cars.length} cars in the database`);
      
      // Display first two cars for verification
      if (data.cars.length > 0) {
        console.log('\nSample car data:');
        const sampleCars = data.cars.slice(0, 2);
        
        sampleCars.forEach(car => {
          console.log(`\nCar: ${car.name}`);
          console.log(`ID: ${car.car_id}`);
          console.log(`Description: ${car.description}`);
          
          // Check monthly_pricing format
          if (typeof car.monthly_pricing === 'string') {
            console.log('⚠️ monthly_pricing is stored as string instead of object');
          }
          
          // Check features format
          if (typeof car.features === 'string') {
            console.log('⚠️ features is stored as string instead of array');
          }
        });
      }
    }
    
    console.log('\n✅ Car check completed');
    return true;
  } catch (error) {
    console.error('❌ Error checking cars:', error);
    return false;
  }
}

// Run the check
checkCarsAndAddSamples()
  .then(success => {
    console.log(`Check completed ${success ? 'successfully' : 'with errors'}`);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
  }); 