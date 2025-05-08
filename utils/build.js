/**
 * Build script to combine and minify JavaScript and CSS files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// Helper function to log with timestamps
function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
}

// Function to combine JS modules into a single file
function combineJsModules() {
    log('Combining JS modules...');
    
    // Use a simple bundler like esbuild (install it first with: npm install esbuild)
    try {
        // Build JS bundle
        execSync('npx esbuild js/main.js --bundle --minify --outfile=dist/script.min.js', { stdio: 'inherit' });
        log('JavaScript modules bundled and minified successfully.');
    } catch (error) {
        console.error('Error bundling JavaScript:', error.message);
        // Fallback method if esbuild fails
        log('Falling back to simple file concatenation...');
        
        // Order of JS files to concatenate
        const jsFiles = [
            'js/config.js',
            'js/ui.js',
            'js/fleet.js',
            'js/booking.js',
            'js/main.js'
        ];
        
        let combinedJs = '';
        jsFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                combinedJs += content + '\n';
            } catch (err) {
                console.error(`Error reading file ${file}:`, err.message);
            }
        });
        
        // Write combined JS to output file
        fs.writeFileSync('dist/script.combined.js', combinedJs);
        
        // Minify using terser
        try {
            execSync('npx terser dist/script.combined.js -o dist/script.min.js', { stdio: 'inherit' });
            log('JavaScript minified successfully using fallback method.');
            // Clean up the temporary combined file
            fs.unlinkSync('dist/script.combined.js');
        } catch (minifyError) {
            console.error('Error minifying JavaScript:', minifyError.message);
            fs.renameSync('dist/script.combined.js', 'dist/script.min.js');
            log('Using combined but not minified JavaScript.');
        }
    }
}

// Function to combine CSS modules into a single file
function combineCssModules() {
    log('Combining CSS modules...');
    
    // Read the main CSS file with imports
    try {
        let mainCss = fs.readFileSync('css/main.css', 'utf8');
        
        // Replace @import statements with the actual file contents
        const importRegex = /@import\s+url\(['"]?([^'"()]+)['"]?\);/g;
        let match;
        
        while ((match = importRegex.exec(mainCss)) !== null) {
            const importFile = match[1];
            const importPath = path.join('css', importFile);
            
            try {
                const importedContent = fs.readFileSync(importPath, 'utf8');
                mainCss = mainCss.replace(match[0], importedContent);
            } catch (err) {
                console.error(`Error reading imported CSS file ${importPath}:`, err.message);
                // Keep the import statement if file can't be read
            }
        }
        
        // Write combined CSS to output file
        fs.writeFileSync('dist/styles.combined.css', mainCss);
        
        // Minify using clean-css
        try {
            execSync('npx cleancss -o dist/styles.min.css dist/styles.combined.css', { stdio: 'inherit' });
            log('CSS minified successfully.');
            // Clean up the temporary combined file
            fs.unlinkSync('dist/styles.combined.css');
        } catch (minifyError) {
            console.error('Error minifying CSS:', minifyError.message);
            fs.renameSync('dist/styles.combined.css', 'dist/styles.min.css');
            log('Using combined but not minified CSS.');
        }
    } catch (error) {
        console.error('Error processing CSS:', error.message);
    }
}

// Main build function
function build() {
    log('Starting build process...');
    
    // Combine and minify JS
    combineJsModules();
    
    // Combine and minify CSS
    combineCssModules();
    
    log('Build completed successfully!');
}

// Run the build
build(); 