/**
 * Car Inventory Reset Tool
 * 
 * This utility triggers the reset cars endpoint to re-import all cars from Excel.
 * This will clear the existing cars in the database and import fresh data.
 */

const http = require('http');

// Admin token for authentication
const adminToken = process.env.ADMIN_API_TOKEN || 'calma-admin-token-2023';

// Function to reset cars
async function resetCars() {
    console.log('🔄 Sending request to reset cars and import from Excel...');
    
    return new Promise((resolve, reject) => {
        // Create the request options
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/reset-cars',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        };
        
        // Make the HTTP request
        const req = http.request(options, (res) => {
            let data = '';
            
            // Collect response data
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            // Process the complete response
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const response = JSON.parse(data);
                        console.log('✅ Reset complete!');
                        console.log(`📊 ${response.carCount} cars imported successfully`);
                        console.log(`🚗 Message: ${response.message}`);
                        resolve(response);
                    } catch (error) {
                        console.error('❌ Error parsing response:', error);
                        reject(error);
                    }
                } else {
                    console.error(`❌ Request failed with status code ${res.statusCode}`);
                    console.error(`Error: ${data}`);
                    reject(new Error(`Request failed with status code ${res.statusCode}`));
                }
            });
        });
        
        // Handle request errors
        req.on('error', (error) => {
            console.error('❌ Error making request:', error);
            reject(error);
        });
        
        // Send the request
        req.end();
    });
}

// Function to fetch and display all cars
async function fetchCars() {
    console.log('\n📋 Fetching all cars to verify import...');
    
    return new Promise((resolve, reject) => {
        // Create the request options
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/cars',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        };
        
        // Make the HTTP request
        const req = http.request(options, (res) => {
            let data = '';
            
            // Collect response data
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            // Process the complete response
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const response = JSON.parse(data);
                        
                        if (response.success && response.cars && response.cars.length > 0) {
                            console.log(`✅ Found ${response.cars.length} cars in database`);
                            console.log('🚗 Car List:');
                            
                            // Display list of cars with their pricing
                            response.cars.forEach((car, index) => {
                                console.log(`${index + 1}. ${car.name} (${car.category || 'N/A'})`);
                                
                                if (car.monthly_pricing) {
                                    // Calculate average price
                                    const prices = Object.values(car.monthly_pricing);
                                    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
                                    console.log(`   💰 Average Price: €${avgPrice.toFixed(2)}`);
                                }
                            });
                            
                            resolve(response.cars);
                        } else {
                            console.log('⚠️ No cars found or request unsuccessful');
                            if (response.error) {
                                console.error(`Error: ${response.error}`);
                            }
                            resolve([]);
                        }
                    } catch (error) {
                        console.error('❌ Error parsing response:', error);
                        reject(error);
                    }
                } else {
                    console.error(`❌ Request failed with status code ${res.statusCode}`);
                    console.error(`Error: ${data}`);
                    reject(new Error(`Request failed with status code ${res.statusCode}`));
                }
            });
        });
        
        // Handle request errors
        req.on('error', (error) => {
            console.error('❌ Error making request:', error);
            reject(error);
        });
        
        // Send the request
        req.end();
    });
}

// Main function to run the tests
async function main() {
    try {
        console.log('🚀 Starting car inventory reset test...');
        
        // First, reset the cars
        await resetCars();
        
        // Then fetch the cars to verify
        await fetchCars();
        
        console.log('\n✅ Test completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
main(); 