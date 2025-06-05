/**
 * Utility script to diagnose and fix issues with admin panel cars
 */

// Function to test the API connection
async function testCarsAPI() {
    const output = document.createElement('div');
    output.className = 'mt-3';
    
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            output.innerHTML = `<div class="alert alert-warning">
                <strong>Warning:</strong> No admin token found in localStorage. 
                Attempting to set a default token.
            </div>`;
            
            // Set a default token if none exists
            localStorage.setItem('adminToken', 'calma-admin-token-2023');
            document.cookie = 'adminToken=calma-admin-token-2023; path=/;';
        } else {
            output.innerHTML = `<div class="alert alert-info">
                <strong>Info:</strong> Admin token found in localStorage.
            </div>`;
        }
        
        // Test the cars API endpoint
        const response = await fetch('/api/admin/cars', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            output.innerHTML += `<div class="alert alert-danger">
                <strong>API Error:</strong> ${response.status} ${response.statusText}
            </div>`;
            
            if (response.status === 404) {
                output.innerHTML += `<div class="alert alert-warning">
                    <strong>Suggestion:</strong> The /api/admin/cars endpoint may not be implemented correctly.
                    Check the server.js file.
                </div>`;
            } else if (response.status === 401) {
                output.innerHTML += `<div class="alert alert-warning">
                    <strong>Suggestion:</strong> Authentication failed. The token may be invalid.
                    Try setting a new token: <button id="setNewTokenBtn" class="btn btn-sm btn-primary">Set Default Token</button>
                </div>`;
            }
        } else {
            const data = await response.json();
            output.innerHTML += `<div class="alert alert-success">
                <strong>Success:</strong> API endpoint is working.
                <ul>
                    <li>Success: ${data.success ? 'Yes' : 'No'}</li>
                    <li>Cars found: ${data.cars ? data.cars.length : 0}</li>
                    <li>Source: ${data.source || 'unknown'}</li>
                </ul>
            </div>`;
            
            // Show some car data if available
            if (data.cars && data.cars.length > 0) {
                const sample = data.cars[0];
                output.innerHTML += `<div class="card mt-2">
                    <div class="card-header">Sample Car Data</div>
                    <div class="card-body">
                        <pre>${JSON.stringify(sample, null, 2)}</pre>
                    </div>
                </div>`;
            } else {
                output.innerHTML += `<div class="alert alert-warning">
                    <strong>Warning:</strong> No cars found in the database.
                    <button id="addSampleCarBtn" class="btn btn-sm btn-primary ml-2">Add Sample Car</button>
                </div>`;
            }
        }
    } catch (error) {
        output.innerHTML += `<div class="alert alert-danger">
            <strong>Error:</strong> ${error.message}
        </div>`;
    }
    
    return output;
}

// Function to add this utility to the page
function addCarFixerToPage() {
    const container = document.getElementById('adminErrorContainer') || document.createElement('div');
    container.style.display = 'block';
    
    const fixerDiv = document.createElement('div');
    fixerDiv.className = 'card mb-4';
    fixerDiv.innerHTML = `
        <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Admin Panel Car Fixer</h5>
        </div>
        <div class="card-body">
            <p>This utility helps diagnose issues with car loading in the admin panel.</p>
            <button id="testAPIBtn" class="btn btn-primary">Test Cars API</button>
            <button id="reloadCarsBtn" class="btn btn-secondary ms-2">Reload Cars</button>
            <div id="apiTestOutput"></div>
        </div>
    `;
    
    container.appendChild(fixerDiv);
    
    // If container wasn't in page, add it
    if (!document.getElementById('adminErrorContainer')) {
        document.body.insertBefore(container, document.body.firstChild);
    }
    
    // Add event listeners
    document.getElementById('testAPIBtn').addEventListener('click', async function() {
        const output = await testCarsAPI();
        document.getElementById('apiTestOutput').innerHTML = '';
        document.getElementById('apiTestOutput').appendChild(output);
        
        // Add event listeners to dynamically created buttons
        document.getElementById('setNewTokenBtn')?.addEventListener('click', function() {
            localStorage.setItem('adminToken', 'calma-admin-token-2023');
            document.cookie = 'adminToken=calma-admin-token-2023; path=/;';
            alert('Default token set. Please reload the page.');
            location.reload();
        });
        
        document.getElementById('addSampleCarBtn')?.addEventListener('click', function() {
            if (typeof createSampleCar === 'function') {
                createSampleCar();
            } else {
                alert('createSampleCar function not found. Make sure admin.js is loaded correctly.');
            }
        });
    });
    
    document.getElementById('reloadCarsBtn').addEventListener('click', function() {
        if (typeof loadCars === 'function') {
            loadCars();
        } else {
            alert('loadCars function not found. Make sure admin.js is loaded correctly.');
        }
    });
}

// Add the fixer to the page after it's loaded
window.addEventListener('DOMContentLoaded', addCarFixerToPage);

// Make functions available globally
window.testCarsAPI = testCarsAPI;
window.addCarFixerToPage = addCarFixerToPage; 