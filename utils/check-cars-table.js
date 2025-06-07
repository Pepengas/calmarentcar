/**
 * Car Table Schema Checker and Seeder
 * This utility checks the cars table structure and adds sample cars if needed
 */

const { pool } = require('../database');
const { v4: uuidv4 } = require('uuid');

async function checkCarTable() {
  console.log('🔍 Checking cars table structure...');
  
  try {
    // Check if the table exists first
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cars'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Cars table does not exist');
      return false;
    }
    
    // Get the table columns
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cars' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Cars Table Structure:');
    console.table(tableInfo.rows);
    
    // Check required columns exist
    const requiredColumns = ['car_id', 'name', 'description', 'image', 'monthly_pricing', 'features', 'available'];
    const missingColumns = [];
    const existingColumns = tableInfo.rows.map(row => row.column_name);
    
    requiredColumns.forEach(col => {
      if (!existingColumns.includes(col)) {
        missingColumns.push(col);
      }
    });
    
    if (missingColumns.length > 0) {
      console.error(`\n⚠️ Missing required columns: ${missingColumns.join(', ')}`);
      console.log('This may cause issues in the application. Consider recreating the table.');
    } else {
      console.log('✅ All required columns exist');
    }
    
    // Check car count
    const countResult = await pool.query('SELECT COUNT(*) FROM cars');
    const carCount = parseInt(countResult.rows[0].count);
    console.log(`\n🚗 Total cars in database: ${carCount}`);
    
    if (carCount === 0) {
      console.log('\n⚠️ No cars found in database. Adding sample cars...');
      await addSampleCars();
    } else {
      // Show sample car data
      const carSample = await pool.query('SELECT * FROM cars LIMIT 2');
      console.log('\n📊 Sample car data:');
      console.log(JSON.stringify(carSample.rows, null, 2));
      
      // Check if monthly_pricing or features is stored as string instead of JSONB
      const samples = carSample.rows;
      for (const car of samples) {
        if (typeof car.monthly_pricing === 'string') {
          console.warn(`\n⚠️ Car ${car.name} has monthly_pricing stored as string instead of JSONB`);
        }
        if (typeof car.features === 'string') {
          console.warn(`\n⚠️ Car ${car.name} has features stored as string instead of JSONB`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking cars table:', error);
    return false;
  }
}

async function addSampleCars() {
  try {
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
    
    console.log(`Adding ${sampleCars.length} sample cars to database...`);
    
    for (const car of sampleCars) {
      try {
        // Generate unique car_id
        const carId = `${car.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 8)}`;
        
        // Default image URL
        const image = `https://calmarental.com/images/cars/${car.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
        
        // Insert car
        await pool.query(`
          INSERT INTO cars (
            car_id, name, description, image, category, features, monthly_pricing, available
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (car_id) DO NOTHING
        `, [
          carId,
          car.name,
          car.description,
          image,
          car.category,
          JSON.stringify(car.features),
          JSON.stringify(car.monthly_pricing),
          true
        ]);
        
        console.log(`✅ Added car: ${car.name}`);
      } catch (error) {
        console.error(`❌ Error adding car ${car.name}:`, error);
      }
    }
    
    console.log('✅ Sample cars added successfully');
    
    // Verify cars were added
    const countResult = await pool.query('SELECT COUNT(*) FROM cars');
    const carCount = parseInt(countResult.rows[0].count);
    console.log(`🚗 Total cars in database after seeding: ${carCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error adding sample cars:', error);
    return false;
  }
}

// Run the check directly if this file is executed
if (require.main === module) {
  checkCarTable()
    .then(() => {
      console.log('✅ Cars table check complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Cars table check failed:', err);
      process.exit(1);
    });
} else {
  // Export the functions if this file is required as a module
  module.exports = {
    checkCarTable,
    addSampleCars
  };
} 