/**
 * Import pricing data from Excel file to PostgreSQL database
 * This script reads car pricing data from an Excel file and populates the pricing table
 */

require('dotenv').config(); // Load environment variables from .env file
const { Pool } = require('pg');
const xlsx = require('xlsx');
const path = require('path');

// Car IDs mapping - Add all your cars here
const CAR_IDS = {
    'Hyundai i10': 'hyundai-i10-001',
    'Toyota Aygo': 'toyota-aygo-123',
    'Suzuki Celerio': 'suzuki-celerio-003',
    'Volkswagen Tiguan R-Line': 'volkswagen-tiguan-r-line-789',
    'Volkswagen Golf': 'vw-golf-456',
    'Citroen C3': 'citroen-c3'
};

// Create a mapping with lowercase keys for case-insensitive matching
const CAR_IDS_LOWERCASE = {};
Object.keys(CAR_IDS).forEach(carName => {
    CAR_IDS_LOWERCASE[carName.toLowerCase()] = CAR_IDS[carName];
});

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.Postgres_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Import pricing data from Excel file
 */
async function importPricingData() {
    try {
        console.log('📊 Importing car pricing data from Excel file...');
        
        // Read Excel file
        const excelFile = path.join(__dirname, '../Pricing  per car.xlsx');
        console.log(`📄 Reading Excel file: ${excelFile}`);
        
        const workbook = xlsx.readFile(excelFile);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No data found in Excel file');
            return 0;
        }
        
        console.log(`📋 Found ${data.length} rows in Excel file`);
        
        // Get all cars from the database to verify they exist
        const carsResult = await pool.query('SELECT car_id, name FROM cars');
        const dbCars = carsResult.rows;
        
        if (!dbCars || dbCars.length === 0) {
            console.warn('⚠️ No cars found in database. Creating temporary mapping based on provided car IDs.');
        }
        
        // Map car names to car_ids for easier lookup
        const carMap = {};
        
        // First populate with database cars
        dbCars.forEach(car => {
            carMap[car.name.toLowerCase()] = car.car_id;
        });
        
        // Override/add with our explicit mapping
        Object.keys(CAR_IDS_LOWERCASE).forEach(carName => {
            carMap[carName] = CAR_IDS_LOWERCASE[carName];
        });
        
        console.log('🚗 Car mapping for import:');
        Object.keys(carMap).forEach(carName => {
            console.log(`   - ${carName} => ${carMap[carName]}`);
        });
        
        // Process each row in the Excel file
        let importedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        for (const row of data) {
            // Skip rows without car name
            if (!row.Car) {
                skippedCount++;
                continue;
            }
            
            const carName = row.Car.trim();
            const carNameLower = carName.toLowerCase();
            const carId = carMap[carNameLower];
            
            if (!carId) {
                console.warn(`⚠️ Car not found in mapping: "${carName}"`);
                skippedCount++;
                continue;
            }
            
            console.log(`🚙 Processing car: ${carName} (ID: ${carId})`);
            
            // Process each month's pricing
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
            
            let carMonthsCount = 0;
            
            for (const month of months) {
                if (row[month] === undefined) {
                    continue;
                }
                
                // Get the base price for this car and month
                const basePrice = parseFloat(row[month]);
                
                if (isNaN(basePrice)) {
                    console.warn(`⚠️ Invalid price for ${carName} in ${month}: ${row[month]}`);
                    continue;
                }
                
                console.log(`   💰 ${month}: €${basePrice}/day`);
                carMonthsCount++;
                
                // Insert pricing for different durations
                const pricingEntries = [
                    { days: 1, price: basePrice },
                    { days: 2, price: basePrice },
                    { days: 3, price: basePrice },
                    { days: 4, price: basePrice * 0.95 },
                    { days: 5, price: basePrice * 0.95 },
                    { days: 6, price: basePrice * 0.95 },
                    { days: 7, price: basePrice * 0.85 }
                ];
                
                for (const entry of pricingEntries) {
                    try {
                        // Use ON CONFLICT to handle duplicates
                        const result = await pool.query(`
                            INSERT INTO pricing (car_id, month, days, price, created_at, updated_at)
                            VALUES ($1, $2, $3, $4, NOW(), NOW())
                            ON CONFLICT (car_id, month, days) 
                            DO UPDATE SET price = $4, updated_at = NOW()
                            RETURNING id
                        `, [carId, month, entry.days, entry.price]);
                        
                        if (result.rows.length > 0) {
                            importedCount++;
                        }
                    } catch (insertError) {
                        console.error(`❌ Error inserting pricing for ${carName}, ${month}, ${entry.days} days:`, insertError.message);
                        errorCount++;
                    }
                }
            }
            
            console.log(`   ✅ Added/updated pricing for ${carMonthsCount} months`);
        }
        
        console.log(`
✅ Import Summary:
   - Total entries imported/updated: ${importedCount}
   - Errors: ${errorCount}
   - Skipped rows: ${skippedCount}
        `);
        
        return importedCount;
    } catch (error) {
        console.error('❌ Error importing pricing data:', error);
        throw error;
    }
}

/**
 * Main function to run the import
 */
async function main() {
    console.log('🚀 Starting pricing data import...');
    
    try {
        // Test database connection
        console.log('🔌 Testing database connection...');
        const testResult = await pool.query('SELECT NOW()');
        console.log(`✅ Connected to database. Server time: ${testResult.rows[0].now}`);
        
        // Check if the pricing table exists
        console.log('🔍 Checking pricing table...');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'pricing'
            );
        `);
        
        const tableExists = tableCheck.rows[0].exists;
        
        if (!tableExists) {
            console.log('⚠️ Pricing table does not exist. Creating it...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS pricing (
                    id SERIAL PRIMARY KEY,
                    car_id TEXT NOT NULL,
                    month TEXT NOT NULL,
                    days INT NOT NULL,
                    price NUMERIC NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE (car_id, month, days)
                )
            `);
            console.log('✅ Pricing table created successfully.');
        } else {
            console.log('✅ Pricing table exists.');
        }
        
        // Run the import function
        const importedCount = await importPricingData();
        console.log(`🎉 Import completed. ${importedCount} pricing entries imported/updated.`);
    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        // Close the database connection
        await pool.end();
        console.log('👋 Database connection closed.');
    }
}

// Run the script if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unhandled error:', error);
        process.exit(1);
    });
}

// Export the function for use in other modules
module.exports = {
    importPricingData
};
