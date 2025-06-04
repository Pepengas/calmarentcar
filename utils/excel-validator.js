/**
 * Excel Car Data Validator
 * 
 * This utility script helps validate and test the Excel car data import
 * without affecting the database.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Path to the Excel file
const excelPath = path.join(__dirname, '..', 'ΠΙΝΑΚΑΣ ΤΙΜΩΝ ΤΕΛΙΚΟΣ ΣΕΖΟΝ ΝΙΚΟΣ.xlsx');

/**
 * Validates the Excel file structure and logs the found data
 */
function validateExcelFile() {
    console.log('🔍 Validating Excel file:', excelPath);
    
    if (!fs.existsSync(excelPath)) {
        console.error('❌ Excel file not found:', excelPath);
        return;
    }
    
    try {
        // Read the Excel file
        const workbook = XLSX.readFile(excelPath);
        
        // Log available sheets
        console.log('📑 Available Excel sheets:', workbook.SheetNames);
        
        // Analyze each sheet
        workbook.SheetNames.forEach((sheetName, index) => {
            console.log(`\n📊 Analyzing sheet ${index + 1}: ${sheetName}`);
            
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert the worksheet to JSON
            const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            
            if (!data || data.length === 0) {
                console.log(`  ⚠️ No data found in sheet: ${sheetName}`);
                return;
            }
            
            console.log(`  ✅ Found ${data.length} rows in sheet: ${sheetName}`);
            
            // Check the first row to understand structure
            const firstRow = data[0];
            console.log('  📋 First row columns:', Object.keys(firstRow));
            
            // Look for month columns
            const possibleMonthPatterns = [
                { month: 'January', patterns: ['jan', 'ιαν'] },
                { month: 'February', patterns: ['feb', 'φεβ'] },
                { month: 'March', patterns: ['mar', 'μαρ'] },
                { month: 'April', patterns: ['apr', 'απρ'] },
                { month: 'May', patterns: ['may', 'μαϊ'] },
                { month: 'June', patterns: ['jun', 'ιουν'] },
                { month: 'July', patterns: ['jul', 'ιουλ'] },
                { month: 'August', patterns: ['aug', 'αυγ'] },
                { month: 'September', patterns: ['sep', 'σεπ'] },
                { month: 'October', patterns: ['oct', 'οκτ'] },
                { month: 'November', patterns: ['nov', 'νοε'] },
                { month: 'December', patterns: ['dec', 'δεκ'] }
            ];
            
            // Extract columns for each month
            const columns = Object.keys(firstRow);
            const monthMapping = {};
            
            possibleMonthPatterns.forEach(({ month, patterns }) => {
                // Look for column names that match any of the patterns (case insensitive)
                const matchingColumn = columns.find(column => 
                    patterns.some(pattern => column.toLowerCase().includes(pattern.toLowerCase()))
                );
                
                if (matchingColumn) {
                    monthMapping[month] = matchingColumn;
                    console.log(`  ✅ Found column for ${month}: ${matchingColumn}`);
                } else {
                    console.log(`  ⚠️ Could not find column for ${month}`);
                }
            });
            
            // Look for car name/model column
            const carNameCol = columns.find(col => {
                const lowerCol = col.toLowerCase();
                return lowerCol.includes('car') || 
                       lowerCol.includes('model') || 
                       lowerCol.includes('vehicle') ||
                       lowerCol.includes('οχημα') ||
                       lowerCol.includes('αυτοκινητο') ||
                       lowerCol.includes('μοντελο');
            });
            
            const categoryCol = columns.find(col => {
                const lowerCol = col.toLowerCase();
                return lowerCol.includes('category') || 
                       lowerCol.includes('class') || 
                       lowerCol.includes('type') ||
                       lowerCol.includes('κατηγορια') ||
                       lowerCol.includes('τυπος');
            });
            
            console.log(`  🚗 Car name column found: ${carNameCol || 'NOT FOUND'}`);
            console.log(`  🏷️ Category column found: ${categoryCol || 'NOT FOUND'}`);
            
            // If car name column not found, try to use the first non-month column
            let effectiveCarNameCol = carNameCol;
            if (!effectiveCarNameCol) {
                // Get all the month columns we've identified
                const allMonthCols = Object.values(monthMapping).filter(col => col !== null);
                
                // Find the first column that is not a month column
                effectiveCarNameCol = columns.find(col => !allMonthCols.includes(col));
                
                if (effectiveCarNameCol) {
                    console.log(`  ⚠️ Using fallback car name column: ${effectiveCarNameCol}`);
                } else {
                    console.log(`  ❌ Could not determine a car name column`);
                    return;
                }
            }
            
            // Check sample data for a few rows
            console.log('\n  🚗 Sample car data:');
            
            // Show a few sample rows with their pricing
            const sampleRows = data.slice(0, Math.min(5, data.length));
            
            sampleRows.forEach((row, rowIndex) => {
                const carName = row[effectiveCarNameCol] || 'Unknown Car';
                const category = categoryCol ? row[categoryCol] || 'N/A' : 'N/A';
                
                if (!carName || carName.toString().trim() === '') {
                    console.log(`  ⚠️ Row ${rowIndex + 1}: Empty car name, skipping`);
                    return;
                }
                
                console.log(`  📌 Row ${rowIndex + 1}: ${carName}, Category: ${category}`);
                
                // Show monthly pricing for this car
                possibleMonthPatterns.forEach(({ month }) => {
                    const column = monthMapping[month];
                    if (column && row[column] !== undefined && row[column] !== null && row[column] !== '') {
                        console.log(`     ${month}: ${row[column]}`);
                    } else {
                        console.log(`     ${month}: N/A`);
                    }
                });
                
                console.log(''); // Empty line between cars
            });
            
            // Count how many valid cars we'd import
            let validCars = 0;
            let missingPricing = 0;
            
            for (const row of data) {
                if (!row[effectiveCarNameCol] || row[effectiveCarNameCol].toString().trim() === '') {
                    continue;
                }
                
                // Check if car has any pricing
                let hasPricing = false;
                for (const { month } of possibleMonthPatterns) {
                    const column = monthMapping[month];
                    if (column && row[column] !== undefined && row[column] !== null && row[column] !== '') {
                        const price = parseFloat(row[column]);
                        if (!isNaN(price)) {
                            hasPricing = true;
                            break;
                        }
                    }
                }
                
                if (hasPricing) {
                    validCars++;
                } else {
                    missingPricing++;
                }
            }
            
            console.log(`  🚗 Valid cars with pricing: ${validCars}`);
            console.log(`  ⚠️ Cars missing pricing: ${missingPricing}`);
        });
        
        console.log('\n✅ Excel validation complete!');
        
    } catch (error) {
        console.error('❌ Error validating Excel file:', error);
        console.error(error.stack);
    }
}

// Run the validation
validateExcelFile(); 