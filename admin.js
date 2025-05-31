// DOM Elements
const pageLoader = document.getElementById('pageLoader');
const bookingsTableBody = document.getElementById('bookingsTableBody');
const bookingsCount = document.getElementById('bookingsCount');
const totalBookings = document.getElementById('totalBookings');
const totalRevenue = document.getElementById('totalRevenue');
const carsBookedToday = document.getElementById('carsBookedToday');
const filterForm = document.getElementById('filterForm');
const statusFilter = document.getElementById('statusFilter');
const dateFilter = document.getElementById('dateFilter');
const carFilter = document.getElementById('carFilter');
const bookingDetailsModal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
const bookingDetailsContent = document.getElementById('bookingDetailsContent');
const updateStatusBtn = document.getElementById('updateStatusBtn');

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    if (!API_TOKEN) {
        // Redirect to login page if not authenticated
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Add debug info button for troubleshooting
    setupDebugTools();
    
    loadBookings();
    
    // Setup event listeners
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        applyFilters();
    });
    
    filterForm.addEventListener('reset', () => {
        setTimeout(() => {
            resetFilters();
        }, 10);
    });
    
    updateStatusBtn.addEventListener('click', updateBookingStatus);
    
    // Add logout functionality
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = 'admin-login.html';
    });

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const current = e.target.current.value;
            const newPass = e.target.new.value;
            const confirm = e.target.confirm.value;
            if (newPass !== confirm) {
                document.getElementById('changePasswordMsg').textContent = "Passwords do not match.";
                return;
            }
            const res = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ current, new: newPass })
            });
            const data = await res.json();
            document.getElementById('changePasswordMsg').textContent = data.success ? 'Password updated.' : data.error;
            console.log('[DEBUG] Change password response:', data);
        });
    }

    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            const confirm = e.target.confirm.value;
            if (password !== confirm) {
                document.getElementById('addUserMsg').textContent = "Passwords do not match.";
                return;
            }
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            document.getElementById('addUserMsg').textContent = data.success ? 'User added.' : data.error;
            console.log('[DEBUG] Add user response:', data);
        });
    }
});

/**
 * Setup debug tools for troubleshooting
 */
function setupDebugTools() {
    // Make testApiConnection available globally for browser console access
    window.testApiConnection = testApiConnection;
    window.debugInfo = debugInfo;
    
    // Add debug button if debug info element exists
    const debugInfoElement = document.getElementById('debugInfo');
    const debugContentElement = document.getElementById('debugContent');
    
    if (debugInfoElement && debugContentElement) {
        // Create a debug button
        const testApiButton = document.createElement('button');
        testApiButton.textContent = 'Test API Connection';
        testApiButton.className = 'btn btn-sm btn-warning mt-2';
        testApiButton.onclick = async function() {
            debugInfoElement.style.display = 'block';
            debugContentElement.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"></div> Testing API connection...';
            
            try {
                const result = await testApiConnection();
                debugContentElement.innerHTML = `
                    <pre>${JSON.stringify(result, null, 2)}</pre>
                `;
            } catch (error) {
                debugContentElement.innerHTML = `
                    <div class="alert alert-danger">Error: ${error.message}</div>
                `;
            }
        };
        
        // Add the button after debugContentElement
        debugContentElement.after(testApiButton);
    }
}

/**
 * Test API connection function (can be called from browser console)
 */
async function testApiConnection() {
    console.log('[Admin] testApiConnection: Testing API connection...');
    
    const currentToken = localStorage.getItem('adminToken');
    const results = {
        token: currentToken ? 'Present' : 'Missing',
        cookieToken: document.cookie.includes('adminToken=') ? 'Present' : 'Missing'
    };
    
    try {
        // Test database status API
        console.log('[Admin] testApiConnection: Testing /api/admin/db-status...');
        const statusResponse = await fetch('/api/admin/db-status', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            credentials: 'include'
        });
        
        results.dbStatusCode = statusResponse.status;
        results.dbStatusOk = statusResponse.ok;
        
        if (statusResponse.ok) {
            results.dbStatus = await statusResponse.json();
        }
        
        // Test bookings API
        console.log('[Admin] testApiConnection: Testing /api/admin/bookings...');
        const bookingsResponse = await fetch('/api/admin/bookings', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            credentials: 'include'
        });
        
        results.bookingsStatusCode = bookingsResponse.status;
        results.bookingsOk = bookingsResponse.ok;
        
        if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            results.bookingsSuccess = bookingsData.success;
            results.bookingsCount = bookingsData.bookings ? bookingsData.bookings.length : 0;
            results.dbConnected = bookingsData.dbConnected;
        }
        
        console.log('[Admin] testApiConnection results:', results);
        return results;
    } catch (error) {
        console.error('[Admin] testApiConnection error:', error);
        results.error = error.message;
        return results;
    }
}

/**
 * Function to update the debug info panel
 */
function debugInfo(message) {
    const debugInfoElement = document.getElementById('debugInfo');
    const debugContentElement = document.getElementById('debugContent');
    
    if (debugInfoElement && debugContentElement) {
        debugInfoElement.style.display = 'block';
        debugContentElement.innerHTML = typeof message === 'string' 
            ? message 
            : `<pre>${JSON.stringify(message, null, 2)}</pre>`;
    }
} 