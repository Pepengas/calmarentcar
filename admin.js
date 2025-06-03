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

// Tab content elements
const dashboardContent = document.getElementById('dashboardContent');
const carsContent = document.getElementById('carsContent');
const customersContent = document.getElementById('customersContent');
const settingsContent = document.getElementById('settingsContent');
const editCarContent = document.getElementById('editCarContent');
const addonsContent = document.getElementById('addonsContent');

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
    
    // Setup tab switching
    setupTabSwitching();
    
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

/**
 * Setup tab switching functionality
 */
function setupTabSwitching() {
    // Get all tab links
    const tabLinks = document.querySelectorAll('.nav-link');
    
    // Add click event listener to each tab
    tabLinks.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(tab.getAttribute('data-section'));
        });
    });
    
    // Setup mobile navigation
    const mobileNavButtons = document.querySelectorAll('.mobile-nav .btn');
    mobileNavButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const section = button.getAttribute('onclick').match(/'([^']+)'/)[1];
            showSection(section);
        });
    });
    
    // Activate the dashboard tab by default
    showSection('dashboard');
}

/**
 * Show the specified section and hide others
 */
function showSection(sectionName) {
    // Hide all content sections
    const contentSections = [
        'dashboardContent',
        'carsContent',
        'customersContent',
        'settingsContent',
        'editCarContent',
        'addonsContent'
    ];
    
    contentSections.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('d-none');
        }
    });
    
    // Show the selected section
    const selectedSection = document.getElementById(`${sectionName}Content`);
    if (selectedSection) {
        selectedSection.classList.remove('d-none');
    }
    
    // Update active states in navigation
    const allNavLinks = document.querySelectorAll('.nav-link, .mobile-nav .btn');
    allNavLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionName || 
            (link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionName))) {
            link.classList.add('active');
        }
    });
    
    // Load section-specific content
    switch(sectionName) {
        case 'dashboard':
            loadBookings();
            break;
        case 'cars':
            loadCarsForPricing();
            break;
        case 'customers':
            loadCarAvailability();
            break;
        case 'addons':
            loadAddons();
            break;
    }
}

/**
 * Load car pricing data
 */
async function loadCarsForPricing() {
    try {
        const response = await fetch('/api/admin/cars', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        const tableBody = document.querySelector('#priceEditorTable tbody');
        if (!tableBody) return;
        if (!response.ok) {
            let msg = 'Failed to load car pricing data.';
            if (response.status === 404) {
                msg = 'API endpoint /api/admin/cars not found (404). Please check your backend deployment.';
            }
            tableBody.innerHTML = `<tr><td colspan="2" class="text-danger">${msg}</td></tr>`;
            throw new Error(msg);
        }
        const data = await response.json();
        if (!data.cars || !Array.isArray(data.cars) || data.cars.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="2" class="text-warning">No car data returned from API.</td></tr>';
            return;
        }
        tableBody.innerHTML = data.cars.map(car => `
            <tr>
                <td>${car.make} ${car.model}</td>
                <td>
                    <input type="number" class="form-control" value="${car.daily_rate || 0}" 
                           onchange="updateCarPrice('${car.car_id}', this.value)">
                </td>
            </tr>
        `).join('');
    } catch (error) {
        const tableBody = document.querySelector('#priceEditorTable tbody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="2" class="text-danger">Error: ${error.message}</td></tr>`;
        }
        console.error('Error loading car pricing:', error);
        showError('Failed to load car pricing data');
    }
}

/**
 * Load car availability data
 */
async function loadCarAvailability() {
    try {
        const response = await fetch('/api/admin/cars/availability', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load car availability data');
        }
        
        const data = await response.json();
        const tableBody = document.querySelector('#carAvailabilityTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = data.cars.map(car => `
            <tr>
                <td>${car.make} ${car.model}</td>
                <td>
                    <span class="badge ${car.is_available ? 'bg-success' : 'bg-danger'}">
                        ${car.is_available ? 'Available' : 'Not Available'}
                    </span>
                </td>
                <td>
                    <select class="form-select" onchange="updateCarStatus('${car.car_id}', this.value)">
                        <option value="available" ${car.is_available ? 'selected' : ''}>Available</option>
                        <option value="unavailable" ${!car.is_available ? 'selected' : ''}>Not Available</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showCarCalendar('${car.car_id}')">
                        View Calendar
                    </button>
                </td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="showManualBlocks('${car.car_id}')">
                        Manage Blocks
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading car availability:', error);
        showError('Failed to load car availability data');
    }
}

/**
 * Load addons data
 */
async function loadAddons() {
    try {
        const response = await fetch('/api/admin/addons', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load addons data');
        }
        
        const data = await response.json();
        const addonsList = document.getElementById('addonsList');
        if (!addonsList) return;
        
        addonsList.innerHTML = data.addons.map(addon => `
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${addon.name}</h5>
                        <p class="card-text">Price: €${addon.price}</p>
                        <button class="btn btn-primary btn-sm" onclick="editAddon('${addon.id}')">
                            Edit
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading addons:', error);
        showError('Failed to load addons data');
    }
}

/**
 * Show error message
 */
function showError(message) {
    const errorContainer = document.getElementById('adminErrorContainer');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('d-none');
        setTimeout(() => {
            errorContainer.classList.add('d-none');
        }, 5000);
    }
}

/**
 * Load bookings data for dashboard
 */
async function loadBookings() {
    try {
        const response = await fetch('/api/admin/bookings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load bookings data');
        }
        
        const data = await response.json();
        const tableBody = document.getElementById('bookingsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = data.bookings.map(booking => `
            <tr>
                <td data-label="Booking Ref">${booking.booking_reference}</td>
                <td data-label="Customer">${booking.customer_first_name} ${booking.customer_last_name}</td>
                <td data-label="Car">${booking.car_make} ${booking.car_model}</td>
                <td data-label="Status">
                    <span class="badge ${getStatusClass(booking.status)}">${booking.status}</span>
                </td>
                <td data-label="Submitted">${new Date(booking.date_submitted).toLocaleDateString()}</td>
                <td data-label="Actions">
                    <button class="btn btn-sm btn-primary" onclick="showBookingDetails('${booking.booking_reference}')">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Update stats
        updateDashboardStats(data);
    } catch (error) {
        console.error('Error loading bookings:', error);
        showError('Failed to load bookings data');
    }
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats(data) {
    const totalBookingsElement = document.getElementById('totalBookings');
    const totalRevenueElement = document.getElementById('totalRevenue');
    const carsBookedTodayElement = document.getElementById('carsBookedToday');
    
    if (totalBookingsElement) {
        totalBookingsElement.textContent = data.bookings.length;
    }
    
    if (totalRevenueElement) {
        const totalRevenue = data.bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
        totalRevenueElement.textContent = `€${totalRevenue.toFixed(2)}`;
    }
    
    if (carsBookedTodayElement) {
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = data.bookings.filter(booking => 
            booking.pickup_date === today || booking.return_date === today
        );
        carsBookedTodayElement.textContent = todayBookings.length;
    }
}

/**
 * Get status badge class
 */
function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'completed':
            return 'bg-success';
        case 'pending':
            return 'bg-warning';
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
} 