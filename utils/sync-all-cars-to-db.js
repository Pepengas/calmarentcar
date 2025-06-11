/**
 * Comprehensive Car Data Synchronization Utility
 * 
 * This script collects car data from all sources and ensures it's properly stored in PostgreSQL:
 * - Imports cars from cars.json
 * - Ensures consistent formats for features, monthly_pricing, and other fields
 * - Updates existing cars in the database if they already exist
 * - Adds missing cars to the database
 * 
 * Run this script once to ensure all car data is in the database, then
 * frontend code can fetch from the API rather than using hardcoded data.
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../database');
const { v4: uuidv4 } = require('uuid');

// Log environment variables
console.log('🔄 Attempting to connect to PostgreSQL database...');
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  console.log('🔑 Database URL is set');
} else {
  console.log('🔑 Database URL is NOT set');
  console.warn('⚠️ DATABASE_URL environment variable is not set.');
  console.warn('⚠️ If you are running locally, please create a .env file with your database connection string.');
}

// Import required cars that must be included
const REQUIRED_CARS = [
  'Toyota Aygo',
  'Volkswagen Golf',
  'Volkswagen Tiguan',
  'Hyundai i10',
  'Citroen C3',
  'Suzuki Swift'
];

// Default monthly pricing (if not specified)
function getDefaultMonthlyPricing(basePrice) {
  // Create seasonal pricing with base price for winter, higher for summer
  return {
    January: basePrice,
    February: basePrice,
    March: basePrice,
    April: basePrice,
    May: Math.round(basePrice * 1.1),
    June: Math.round(basePrice * 1.2),
    July: Math.round(basePrice * 1.3),
    August: Math.round(basePrice * 1.4),
    September: Math.round(basePrice * 1.2),
    October: basePrice,
    November: basePrice,
    December: basePrice
  };
}

// Default images for cars - using consistent public directory paths
const DEFAULT_IMAGES = {
  'Toyota Aygo': '/images/CalmaAygo.jpg',
  'Volkswagen Golf': '/images/CalmaGolf.jpg',
  'Volkswagen Tiguan': '/images/CalmaTiguan.jpg',
  'Hyundai i10': '/images/Calmai10.jpg',
  'Citroen C3': '/images/CalmaCitroen.jpg',
  'Suzuki Swift': '/images/CalmaSuzuki.jpg'
};

// Fix image path - ensure it's a proper relative path
function fixImagePath(imagePath) {
  if (!imagePath) return '';
  
  // If it's a full URL but pointing to our domain, make it relative
  if (imagePath.includes('calmarental.com/images/')) {
    return '/images/' + imagePath.split('/images/')[1];
  }
  
  // If it's already a relative path starting with /images, use it
  if (imagePath.startsWith('/images/')) {
    return imagePath;
  }
  
  // If it's just a filename, add the proper path
  if (!imagePath.includes('/')) {
    return '/images/' + imagePath;
  }
  
  return imagePath;
}

// Standard categories
const CATEGORIES = {
  'Toyota Aygo': 'Economy',
  'Volkswagen Golf': 'Mid-Size',
  'Volkswagen Tiguan': 'SUV/Premium',
  'Hyundai i10': 'Economy',
  'Citroen C3': 'Compact',
  'Suzuki Swift': 'Compact'
};

// Get default features from car name
function getDefaultFeatures(carName) {
  // Base features all cars should have
  const baseFeatures = ['Air Conditioning'];
  
  // Add car-specific features
  if (carName.includes('Toyota Aygo')) {
    return [...baseFeatures, 'Manual', '4 Seats', 'Fuel Efficient', 'Compact'];
  } else if (carName.includes('Volkswagen Golf')) {
    return [...baseFeatures, 'Automatic', '5 Seats', 'Cruise Control', 'Bluetooth'];
  } else if (carName.includes('Volkswagen Tiguan')) {
    return [...baseFeatures, 'Automatic', '5 Seats', 'SUV', 'Bluetooth', 'Cruise Control'];
  } else if (carName.includes('Hyundai i10')) {
    return [...baseFeatures, 'Manual', '4 Seats', 'Compact', 'Fuel Efficient'];
  } else if (carName.includes('Citroen C3')) {
    return [...baseFeatures, 'Manual', '5 Seats', 'Bluetooth', 'Compact'];
  } else if (carName.includes('Suzuki Swift')) {
    return [...baseFeatures, 'Manual', '5 Seats', 'Sporty', 'Fuel Efficient'];
  } else {
    return [...baseFeatures, 'Manual', '5 Seats'];
  }
}

// Default descriptions for cars
const DEFAULT_DESCRIPTIONS = {
  'Toyota Aygo': 'Compact and fuel-efficient, perfect for city driving.',
  'Volkswagen Golf': 'Versatile hatchback with excellent handling.',
  'Volkswagen Tiguan': 'Spacious SUV with advanced features for comfort.',
  'Hyundai i10': 'Economical and easy to drive mini car.',
  'Citroen C3': 'Stylish compact car with excellent comfort.',
  'Suzuki Swift': 'Sporty and nimble, ideal for exploring Crete.'
};

// Base prices for cars (daily rate for January)
const BASE_PRICES = {
  'Toyota Aygo': 35,
  'Volkswagen Golf': 55,
  'Volkswagen Tiguan': 75,
  'Hyundai i10': 32,
  'Citroen C3': 40,
  'Suzuki Swift': 38
};

// Function to generate a consistent car_id from car name
function generateCarId(carName) {
  // Remove any existing UUIDs from name (in case of re-generation)
  let cleanName = carName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  cleanName = cleanName.replace(/-[0-9a-f]{8}$/, '');
  
  // Use a consistent ID format
  return `${cleanName}-${uuidv4().substring(0, 8)}`;
}

// Parse car data from cars.json
async function parseCarsJsonFile() {
  try {
    const filePath = path.join(__dirname, '..', 'cars.json');
    if (fs.existsSync(filePath)) {
      const jsonData = fs.readFileSync(filePath, 'utf8');
      // Remove any comments
      const cleanJsonData = jsonData.replace(/\/\/.*$/gm, '').trim();
      const cars = JSON.parse(cleanJsonData);
      console.log(`✅ Found ${cars.length} cars in cars.json`);
      return cars;
    } else {
      console.log('⚠️ cars.json not found, skipping this source');
      return [];
    }
  } catch (error) {
    console.error('❌ Error parsing cars.json:', error);
    return [];
  }
}

// Convert car data from different sources to a standardized format
function standardizeCar(car) {
  const name = car.name || '';
  if (!name) {
    console.warn('⚠️ Skipping car with missing name:', car);
    return null;
  }
  
  // Generate a consistent ID for this car
  let car_id = car.car_id || car.id;
  if (!car_id || typeof car_id !== 'string' || car_id.length < 3) {
    // Use the standardized format: name-uuid
    car_id = generateCarId(name);
  }
  
  // Use provided values or defaults
  const description = car.description || DEFAULT_DESCRIPTIONS[name] || `A great ${name} for exploring Crete.`;
  const category = car.category || CATEGORIES[name] || 'Standard';
  
  // Fix image path to ensure it exists and is properly formatted
  let image = fixImagePath(car.image || DEFAULT_IMAGES[name] || '');
  
  // Ensure it has a proper image
  if (!image && DEFAULT_IMAGES[name]) {
    image = DEFAULT_IMAGES[name];
  }
  
  // Handle features - convert from string if needed
  let features = car.features || [];
  if (typeof features === 'string') {
    try {
      features = JSON.parse(features);
    } catch (e) {
      features = getDefaultFeatures(name);
    }
  }
  if (!features.length) {
    features = getDefaultFeatures(name);
  }
  
  // Handle monthly pricing - convert from string if needed
  let monthly_pricing = car.monthly_pricing || car.monthlyPricing || {};
  if (typeof monthly_pricing === 'string') {
    try {
      monthly_pricing = JSON.parse(monthly_pricing);
    } catch (e) {
      const basePrice = car.pricePerDay || BASE_PRICES[name] || 45;
      monthly_pricing = getDefaultMonthlyPricing(basePrice);
    }
  }
  
  // Check if monthly_pricing has all required months
  const requiredMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Find missing months and add them
  let hasMissingMonths = false;
  for (const month of requiredMonths) {
    if (!monthly_pricing[month]) {
      hasMissingMonths = true;
      break;
    }
  }
  
  // If any months are missing or monthly_pricing is empty, generate complete pricing
  if (hasMissingMonths || Object.keys(monthly_pricing).length === 0) {
    const basePrice = car.pricePerDay || BASE_PRICES[name] || 45;
    monthly_pricing = getDefaultMonthlyPricing(basePrice);
  }
  
  // Return standardized car object
  return {
    car_id,
    name,
    description,
    image,
    category,
    features,
    monthly_pricing,
    available: car.available !== false, // Default to true unless explicitly false
  };
}

// Function to check if a car already exists in the database by car_id
async function carExistsInDatabase(carId) {
  const result = await pool.query(
    'SELECT * FROM cars WHERE car_id = $1',
    [carId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Main function to collect cars from all sources and push to DB
async function syncAllCarsToDatabase() {
  try {
    console.log('🔄 Starting car data synchronization process...');
    
    // Connect to database
    console.log('🔌 Connecting to database...');
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Database connected');
    } catch (dbErr) {
      console.error('❌ Database connection error:', dbErr.message);
      return false;
    }
    
    // Gather all car data
    console.log('📋 Gathering car data from all sources...');
    const carsFromJson = await parseCarsJsonFile();
    
    // Verify cars table exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cars (
          id SERIAL PRIMARY KEY,
          car_id TEXT UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          image TEXT,
          category TEXT,
          features JSONB,
          monthly_pricing JSONB,
          available BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Cars table verified/created');
    } catch (tableErr) {
      console.error('❌ Error creating cars table:', tableErr);
      return false;
    }
    
    // Check which cars are already in the database
    const existingCarsResult = await pool.query('SELECT * FROM cars');
    const existingCars = existingCarsResult.rows;
    console.log(`✅ Found ${existingCars.length} cars already in database`);
    
    
    // Combine all sources into a master list, standardizing as we go
    let masterCarList = carsFromJson.map(car => standardizeCar(car)).filter(car => car !== null);
    
    // Check for required cars and add them if missing
    for (const requiredCarName of REQUIRED_CARS) {
      const hasRequiredCar = masterCarList.some(car => 
        car.name.toLowerCase() === requiredCarName.toLowerCase()
      );
      
      if (!hasRequiredCar) {
        console.log(`⚠️ Adding missing required car: ${requiredCarName}`);
        
        // Create a car record with default values
        const defaultCar = {
          name: requiredCarName,
          description: DEFAULT_DESCRIPTIONS[requiredCarName] || `A great ${requiredCarName} for exploring Crete.`,
          image: DEFAULT_IMAGES[requiredCarName] || '',
          category: CATEGORIES[requiredCarName] || 'Standard',
          features: getDefaultFeatures(requiredCarName),
          pricePerDay: BASE_PRICES[requiredCarName] || 45 // Will be converted to monthly_pricing
        };
        
        const standardizedCar = standardizeCar(defaultCar);
        if (standardizedCar) {
          masterCarList.push(standardizedCar);
        }
      }
    }
    
    // Deduplicate cars by car_id to avoid duplicate entries
    const carsById = {};
    for (const car of masterCarList) {
      const id = car.car_id;
      if (!carsById[id] || car.available) {
        carsById[id] = car;
      }
    }

    // Convert back to array
    masterCarList = Object.values(carsById);
    
    console.log(`✅ Master car list created with ${masterCarList.length} unique cars`);
    
    // Process each car
    console.log('🚗 Updating database with car data...');
    let updatedCount = 0;
    let insertedCount = 0;
    let errorCount = 0;
    
    for (const car of masterCarList) {
      try {
        const existingCar = await carExistsInDatabase(car.car_id);
        
        if (existingCar) {
          // Update existing car
          await pool.query(`
            UPDATE cars
            SET description = $1,
                image = $2,
                category = $3,
                features = $4,
                monthly_pricing = $5,
                available = $6,
                updated_at = NOW()
            WHERE car_id = $7
          `, [
            car.description,
            car.image,
            car.category,
            JSON.stringify(car.features),
            JSON.stringify(car.monthly_pricing),
            car.available,
            existingCar.car_id
          ]);
          updatedCount++;
          console.log(`✅ Updated: ${car.name}`);
        } else {
          // Insert new car
          await pool.query(`
            INSERT INTO cars (
              car_id, name, description, image, category, features, monthly_pricing, available
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            car.car_id,
            car.name,
            car.description,
            car.image,
            car.category,
            JSON.stringify(car.features),
            JSON.stringify(car.monthly_pricing),
            car.available
          ]);
          insertedCount++;
          console.log(`✅ Inserted: ${car.name}`);
        }
      } catch (carError) {
        console.error(`❌ Error processing car ${car.name}:`, carError.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Database updated: ${insertedCount} cars inserted, ${updatedCount} cars updated, ${errorCount} errors`);
    
    // Verify all required cars are in the database with a more robust query
    try {
      const finalCheck = await pool.query(`
        SELECT name, image, monthly_pricing FROM cars 
        WHERE LOWER(name) IN (${REQUIRED_CARS.map(name => `LOWER('${name}')`).join(',')})
      `);
      
      console.log(`✅ Verified ${finalCheck.rows.length}/${REQUIRED_CARS.length} required cars in database`);
      
      // Check for missing data in verified cars
      let missingDataCount = 0;
      for (const car of finalCheck.rows) {
        let hasMissingData = false;
        
        // Check for missing or invalid image
        if (!car.image) {
          console.warn(`⚠️ Car ${car.name} is missing an image`);
          hasMissingData = true;
        }
        
        // Check for complete monthly pricing
        if (!car.monthly_pricing || Object.keys(car.monthly_pricing).length < 12) {
          console.warn(`⚠️ Car ${car.name} has incomplete monthly pricing`);
          hasMissingData = true;
        }
        
        if (hasMissingData) {
          missingDataCount++;
        }
      }
      
      if (missingDataCount > 0) {
        console.warn(`⚠️ ${missingDataCount} cars have missing or incomplete data`);
      } else {
        console.log('✅ All verified cars have complete data');
      }
      
      if (finalCheck.rows.length < REQUIRED_CARS.length) {
        const existingNames = finalCheck.rows.map(row => row.name.toLowerCase());
        const missingCars = REQUIRED_CARS.filter(name => 
          !existingNames.includes(name.toLowerCase())
        );
        console.warn('⚠️ Missing required cars:', missingCars.join(', '));
        return false;
      }
    } catch (verificationError) {
      console.error('❌ Error during verification:', verificationError.message);
      return false;
    }
    
    console.log('✅ Car data synchronization complete!');
    return true;
  } catch (error) {
    console.error('❌ Error during car data synchronization:', error.message);
    return false;
  } finally {
    // Don't close the pool if running in Railway or production environment
    if (process.env.NODE_ENV !== 'production' && process.env.RAILWAY_ENVIRONMENT_NAME === undefined) {
      console.log('👋 Closing database connection...');
      await pool.end();
    } else {
      console.log('🔌 Keeping database connection open for other processes...');
    }
  }
}

// Run the sync function if this file is executed directly
if (require.main === module) {
  syncAllCarsToDatabase()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Fatal error during car synchronization:', err);
      process.exit(1);
    });
}

module.exports = { syncAllCarsToDatabase }; 