/**
 * Calma Car Rental - Admin Dashboard JavaScript
 * Version: 1.0.1
 */

// API variables
let API_TOKEN = '';
let API_BASE_URL = '/api/admin';

// Booking data variables
let allBookings = [];
let filteredBookings = [];
let carModels = new Set();

// DOM element references
let bookingsTableBody;
let statusFilter;
let dateFilter;
let carFilter;
let textSearchFilter;
let clearSearchBtn;

// Current booking being viewed/edited
let currentBookingId = null;

// Get admin API token from localStorage (set during login)
API_TOKEN = localStorage.getItem('adminToken');

// Log token presence on load (without revealing the actual token)
console.log('[Admin] Token in localStorage:', API_TOKEN ? 'Present' : 'Missing');

// Set token in cookie if missing from cookies but present in localStorage
// This helps with authentication as the server checks both
if (API_TOKEN && !document.cookie.includes('adminToken=')) {
    console.log('[Admin] Setting adminToken cookie from localStorage');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);
    document.cookie = `adminToken=${API_TOKEN}; expires=${expiryDate.toUTCString()}; path=/`;
}

// DOM Elements
const pageLoader = document.getElementById('pageLoader');
const bookingsCount = document.getElementById('bookingsCount');
const totalBookings = document.getElementById('totalBookings');
const totalRevenue = document.getElementById('totalRevenue');
const carsBookedToday = document.getElementById('carsBookedToday');
const filterForm = document.getElementById('filterForm');
const bookingDetailsContent = document.getElementById('bookingDetailsContent');
const updateStatusBtn = document.getElementById('updateStatusBtn');

// Only initialize bookingDetailsModal if the modal element exists
let bookingDetailsModal = null;
const bookingDetailsModalElem = document.getElementById('bookingDetailsModal');
if (bookingDetailsModalElem) {
    bookingDetailsModal = new bootstrap.Modal(bookingDetailsModalElem);
}

// --- Cars Tab: Monthly Pricing Management ---
const carsContent = document.getElementById('carsContent');
const priceEditorTable = document.getElementById('priceEditorTable');

// Car selection dropdown
let carDropdown = document.getElementById('carPricingDropdown');
if (!carDropdown) {
    carDropdown = document.createElement('select');
    carDropdown.id = 'carPricingDropdown';
    carDropdown.className = 'form-select mb-4';
    carDropdown.style.maxWidth = '350px';
    priceEditorTable.parentElement.insertBefore(carDropdown, priceEditorTable);
}

let allCarsForPricing = [];

function getMonthNameFromKey(key) {
    // key is like '2025-01', '2025-02', ...
    const monthNum = parseInt(key.split('-')[1], 10);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum - 1] || key;
}

function getSortedMonthKeys(pricing) {
    // Sort by month number
    return Object.keys(pricing).sort((a, b) => {
        const ma = parseInt(a.split('-')[1], 10);
        const mb = parseInt(b.split('-')[1], 10);
        return ma - mb;
    });
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if the user is logged in
    API_TOKEN = localStorage.getItem('adminToken');
    if (!API_TOKEN) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Initialize references to DOM elements
    bookingsTableBody = document.getElementById('bookingsTableBody');
    statusFilter = document.getElementById('statusFilter');
    dateFilter = document.getElementById('dateFilter');
    carFilter = document.getElementById('carFilter');
    textSearchFilter = document.getElementById('textSearchFilter');
    clearSearchBtn = document.getElementById('clearSearchBtn');
    
    // Event listeners
    const filterFormElem = document.getElementById('filterForm');
    if (filterFormElem) {
        filterFormElem.addEventListener('submit', function(e) {
            e.preventDefault();
            applyFilters();
        });
        filterFormElem.addEventListener('reset', function(e) {
            setTimeout(resetFilters, 0);
        });
    }
    const dateFilterElem = document.getElementById('dateFilter');
    if (dateFilterElem) {
        dateFilterElem.addEventListener('change', function() {
            const datePickerContainer = document.getElementById('datePickerContainer');
            if (this.value === 'custom') {
                datePickerContainer.style.display = 'block';
            } else {
                datePickerContainer.style.display = 'none';
                document.getElementById('submittedDateFilter').value = '';
            }
        });
    }
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', updateBookingStatus);
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
        });
    }
    
    // Add event listener for text search input
    if (textSearchFilter) {
        textSearchFilter.addEventListener('input', function() {
            applyFilters();
        });
    }
    
    // Add event listener for clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            textSearchFilter.value = '';
            applyFilters();
        });
    }

    // Load bookings data
    loadBookings();

    // Tab elements
    const editCarTab = document.getElementById('editCarTab');
    const editCarContent = document.getElementById('editCarContent');
    const dashboardContent = document.getElementById('dashboardContent');
    const carsContent = document.getElementById('carsContent');

    // Form elements
    const editCarDropdown = document.getElementById('editCarDropdown');
    const editCarForm = document.getElementById('editCarForm');
    const editCarMsg = document.getElementById('editCarMsg');

    // Tab switching
    if (editCarTab) {
        editCarTab.addEventListener('click', function(e) {
            e.preventDefault();
            // Hide other content
            if (dashboardContent) dashboardContent.style.display = 'none';
            if (carsContent) carsContent.style.display = 'none';
            // Show edit car content
            if (editCarContent) editCarContent.style.display = 'block';
            // Remove active from other tabs
            document.querySelectorAll('.sidebar .nav-link').forEach(tab => tab.classList.remove('active'));
            editCarTab.classList.add('active');
            // Load cars into dropdown
            loadEditCarDropdown();
        });
    }

    // Load all cars into dropdown
    async function loadEditCarDropdown() {
        console.log('[DEBUG] loadEditCarDropdown called');
        try {
            const res = await fetch('/api/cars');
            console.log('[DEBUG] /api/cars response:', res);
            const data = await res.json();
            console.log('[DEBUG] /api/cars data:', data);
            if (!data.success) throw new Error('Failed to fetch cars');
            if (!editCarDropdown) {
                console.error('[DEBUG] editCarDropdown element not found!');
                return;
            }
            editCarDropdown.innerHTML = '';
            if (data.cars.length === 0) {
                editCarDropdown.innerHTML = '<option value="">No cars found</option>';
                editCarMsg.textContent = 'No cars found in the database.';
                editCarMsg.className = 'alert alert-warning';
                return;
            }
            data.cars.forEach(car => {
                const opt = document.createElement('option');
                opt.value = car.id;
                opt.textContent = car.name;
                editCarDropdown.appendChild(opt);
            });
            if (data.cars.length > 0) {
                loadCarDetails(data.cars[0].id);
            }
        } catch (err) {
            editCarMsg.textContent = 'Error loading cars: ' + err.message;
            editCarMsg.className = 'alert alert-danger';
            console.error('[DEBUG] Error in loadEditCarDropdown:', err);
        }
    }

    // When car is selected, load its details
    if (editCarDropdown) {
        editCarDropdown.addEventListener('change', function() {
            loadCarDetails(this.value);
        });
    } else {
        console.error('[DEBUG] editCarDropdown not found when trying to add event listener');
    }

    // Load car details into form
    async function loadCarDetails(carId) {
        try {
            editCarMsg.textContent = '';
            const res = await fetch(`/api/admin/car/${carId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to fetch car');
            const car = data.car;
            // Fill form fields
            editCarForm.elements['name'].value = car.name || '';
            editCarForm.elements['category'].value = car.category || '';
            editCarForm.elements['description'].value = car.description || '';
            editCarForm.elements['image'].value = car.image || '';
            // Features: array to comma-separated string
            editCarForm.elements['features'].value = Array.isArray(car.features) ? car.features.join(', ') : (car.features || '');
            // Specs
            const specs = car.specs || {};
            editCarForm.elements['engine'].value = specs.engine || '';
            editCarForm.elements['doors'].value = specs.doors || '';
            editCarForm.elements['passengers'].value = specs.passengers || '';
            editCarForm.elements['gearbox'].value = specs.gearbox || '';
            editCarForm.elements['fuel'].value = specs.fuel || '';
            editCarForm.elements['airCondition'].checked = !!specs.airCondition;
            editCarForm.elements['abs'].checked = !!specs.abs;
            editCarForm.elements['airbag'].checked = !!specs.airbag;
            editCarForm.elements['entertainment'].value = specs.entertainment || '';
        } catch (err) {
            editCarMsg.textContent = 'Error loading car details: ' + err.message;
            editCarMsg.className = 'alert alert-danger';
        }
    }

    // Handle form submit
    if (editCarForm) {
        editCarForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            editCarMsg.textContent = '';
            const carId = editCarDropdown.value;
            // Gather form data
            const name = editCarForm.elements['name'].value.trim();
            const category = editCarForm.elements['category'].value.trim();
            const description = editCarForm.elements['description'].value.trim();
            const image = editCarForm.elements['image'].value.trim();
            // Features: comma-separated string to array
            const features = editCarForm.elements['features'].value.split(',').map(f => f.trim()).filter(f => f);
            // Specs: parse and convert types
            const specs = {
                engine: editCarForm.elements['engine'].value.trim(),
                doors: editCarForm.elements['doors'].value.trim(),
                passengers: editCarForm.elements['passengers'].value.trim(),
                gearbox: editCarForm.elements['gearbox'].value,
                fuel: editCarForm.elements['fuel'].value,
                airCondition: !!editCarForm.elements['airCondition'].checked,
                abs: !!editCarForm.elements['abs'].checked,
                airbag: !!editCarForm.elements['airbag'].checked,
                entertainment: editCarForm.elements['entertainment'].value.trim()
            };
            // Convert numbers
            if (specs.doors) specs.doors = isNaN(Number(specs.doors)) ? specs.doors : Number(specs.doors);
            if (specs.passengers) specs.passengers = isNaN(Number(specs.passengers)) ? specs.passengers : Number(specs.passengers);
            // PATCH to backend
            try {
                const res = await fetch(`/api/admin/car/${carId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify({ name, category, description, image, features, specs })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Failed to update car');
                editCarMsg.textContent = 'Car updated successfully!';
                editCarMsg.className = 'alert alert-success';
            } catch (err) {
                editCarMsg.textContent = 'Error saving car: ' + err.message;
                editCarMsg.className = 'alert alert-danger';
            }
        });
    }

    // --- Ensure Edit Car Dropdown Loads on Page Load and Tab Switch ---
    function ensureEditCarDropdownLoaded() {
        if (editCarContent && window.getComputedStyle(editCarContent).display !== 'none') {
            loadEditCarDropdown();
        }
    }
    // Call on DOMContentLoaded
    ensureEditCarDropdownLoaded();
    // Observe for tab switches (visibility changes)
    if (editCarContent) {
        const observer = new MutationObserver(() => {
            if (window.getComputedStyle(editCarContent).display !== 'none') {
                loadEditCarDropdown();
            }
        });
        observer.observe(editCarContent, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    // --- Modal Error Debugging ---
    try {
        if (!document.getElementById('bookingDetailsModal')) {
            console.warn('[Admin] bookingDetailsModal element is missing from the DOM. Modal features may not work.');
        }
    } catch (e) {
        console.error('[Admin] Error checking for bookingDetailsModal:', e);
    }

    // Load cars for pricing when Cars tab is shown
    if (carsContent && priceEditorTable) {
        document.getElementById('carsTab').addEventListener('click', function() {
            loadCarsForPricing();
        });
    }

    // --- Sidebar Tab Navigation ---
    const tabSectionMap = [
        { tab: 'dashboardTab', content: 'dashboardContent' },
        { tab: 'carsTab', content: 'carsContent' },
        { tab: 'customersTab', content: 'customersContent' },
        { tab: 'reportsTab', content: 'reportsContent' },
        { tab: 'settingsTab', content: 'settingsContent' },
        { tab: 'editCarTab', content: 'editCarContent' }
    ];
    function showSection(section) {
        tabSectionMap.forEach(({ content }) => {
            const el = document.getElementById(content);
            if (el) el.style.display = 'none';
        });
        const target = document.getElementById(section);
        if (target) target.style.display = 'block';
        // Remove active from all tabs, add to current
        tabSectionMap.forEach(({ tab }) => {
            const tabEl = document.getElementById(tab);
            if (tabEl) tabEl.classList.remove('active');
        });
        const activeTab = tabSectionMap.find(({ content }) => content === section);
        if (activeTab) {
            const tabEl = document.getElementById(activeTab.tab);
            if (tabEl) tabEl.classList.add('active');
        }
    }
    // Attach click listeners
    tabSectionMap.forEach(({ tab, content }) => {
        const tabEl = document.getElementById(tab);
        if (tabEl) {
            tabEl.addEventListener('click', function(e) {
                e.preventDefault();
                showSection(content);
                // Load data if needed
                if (content === 'carsContent') loadCarsForPricing();
                if (content === 'editCarContent') loadEditCarDropdown();
                if (content === 'dashboardContent') loadBookings();
            });
        }
    });
    // Show dashboard by default on load
    showSection('dashboardContent');
});

/**
 * Load all bookings from the server
 */
async function loadBookings() {
    showLoader();
    console.log('[Admin] loadBookings: Starting to load bookings...');
    
    bookingsTableBody.innerHTML = `
        <tr>
            <td colspan="12" class="text-center">
                <div class="d-flex justify-content-center my-3">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <p class="mt-2">Loading bookings data...</p>
            </td>
        </tr>
    `;
    
    try {
        // Ensure we have the most up-to-date token
        const currentToken = localStorage.getItem('adminToken');
        
        // Create headers object
        const headers = {
            'Accept': 'application/json'
        };
        
        // Add Authorization header if token exists
        if (currentToken) {
            console.log('[Admin] loadBookings: Using token from localStorage');
            // Properly format with Bearer prefix
            headers['Authorization'] = `Bearer ${currentToken}`;
        } else {
            console.warn('[Admin] loadBookings: No API_TOKEN found in localStorage. Authentication might fail.');
            // Try redirect to login preemptively
            window.location.href = 'admin-login.html';
            return;
        }

        console.log('[Admin] loadBookings: Fetching from /api/admin/bookings with headers:', 
                    {Authorization: headers.Authorization ? 'Bearer [TOKEN HIDDEN]' : 'Missing'});
        
        const response = await fetch('/api/admin/bookings', {
            headers: headers,
            credentials: 'include' // Send cookies as well
        });

        console.log(`[Admin] loadBookings: Response status: ${response.status}`);
        console.log('[Admin] loadBookings: Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.status === 401 || response.status === 403) {
            console.error('[Admin] loadBookings: Authentication failed (401/403). Redirecting to login.');
            localStorage.removeItem('adminToken'); // Ensure token is cleared
            window.location.href = 'admin-login.html';
            return;
        }

        const responseText = await response.text(); // Get raw text first
        if (!response.ok) {
            console.error(`[Admin] loadBookings: Server error ${response.status}. Raw response:`, responseText);
            throw new Error(`Server error: ${response.status} ${response.statusText}. Response: ${responseText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
            console.log('[Admin] loadBookings: Parsed API response data:', data);
        } catch (jsonError) {
            console.error('[Admin] loadBookings: Failed to parse JSON response. Raw text:', responseText, 'Error:', jsonError);
            showErrorMessage('Failed to understand server response. Please check console.');
            hideLoader();
            return;
        }
        
        if (data.success) {
            console.log('[Admin] loadBookings: API call successful. Bookings received:', data.bookings);
            allBookings = data.bookings || [];
            console.log('[DEBUG] allBookings updated:', allBookings);
            if (!data.bookings) {
                console.warn('[Admin] loadBookings: data.bookings is undefined or null, defaulting to empty array.');
            } else if (data.bookings.length === 0) {
                console.info('[Admin] loadBookings: Received 0 bookings from the API.');
            }
            filteredBookings = [...allBookings];
            
            carModels.clear(); // Clear previous models
            allBookings.forEach(booking => {
                if (booking.car_make && booking.car_model) {
                    carModels.add(`${booking.car_make} ${booking.car_model}`);
                }
            });
            
            populateCarFilter();
            renderBookings(filteredBookings);
            updateDashboardStats();
        } else {
            console.error('[Admin] loadBookings: API call returned success:false. Error:', data.error);
            showErrorMessage('Failed to load bookings from server: ' + (data.error || 'Unknown error from server'));
        }
    } catch (error) {
        console.error('[Admin] loadBookings: General error during fetch or processing:', error);
        showErrorMessage('Error loading bookings: ' + error.message + '. Check console for details.');
        // Display error in table as well
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center py-5 text-danger">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                    <p class="mb-2">Error loading bookings.</p>
                    <p class="text-muted small">${error.message}</p>
                </td>
            </tr>
        `;
    } finally {
        hideLoader();
        console.log('[Admin] loadBookings: Finished loading bookings attempt.');
    }
}

/**
 * Show the page loader
 */
function showLoader() {
    pageLoader.style.display = 'block';
}

/**
 * Hide the page loader
 */
function hideLoader() {
    pageLoader.style.display = 'none';
}

/**
 * Populate the car filter dropdown with unique car models
 */
function populateCarFilter() {
    carFilter.innerHTML = '<option value="">All Cars</option>';
    
    // Sort car models alphabetically
    const sortedCarModels = Array.from(carModels).sort();
    
    sortedCarModels.forEach(carModel => {
        const option = document.createElement('option');
        option.value = carModel;
        option.textContent = carModel;
        carFilter.appendChild(option);
    });
}

/**
 * Format a date string to a user-friendly format
 * @param {string} dateString - The date string to format
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        // Handle yyyy-mm-dd as local date
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-');
            const date = new Date(Number(year), Number(month) - 1, Number(day));
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
        // Fallback for other formats
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    
    return '€' + parseFloat(amount).toFixed(2);
}

/**
 * Update the dashboard statistics
 */
function updateDashboardStats() {
    if (totalBookings) totalBookings.textContent = allBookings.length;
    
    const revenue = allBookings.reduce((total, booking) => {
        // Ensure total_price is treated as a number, default to 0 if invalid
        const price = parseFloat(booking.total_price);
        return total + (isNaN(price) ? 0 : price);
    }, 0);
    
    if (totalRevenue) totalRevenue.textContent = formatCurrency(revenue);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = allBookings.filter(booking => {
        try {
            const bookingDate = new Date(booking.date_submitted);
            return bookingDate >= today;
        } catch (e) {
            console.warn('[Admin] updateDashboardStats: Invalid date_submitted for booking:', booking, e);
            return false;
        }
    });
    
    if (carsBookedToday) carsBookedToday.textContent = todayBookings.length;
    console.log('[Admin] updateDashboardStats: Dashboard stats updated.');
}

/**
 * Render the bookings table with the provided bookings data
 * @param {Array} bookings - The bookings to display
 */
function renderBookings(bookings) {
    console.log(`[Admin] renderBookings: Called with ${bookings ? bookings.length : 'null/undefined'} bookings.`);

    // Debug table layout mode
    const tableDebugInfo = document.getElementById('tableDebugInfo');
    const tableLayoutMode = document.getElementById('tableLayoutMode');
    if (tableDebugInfo && tableLayoutMode) {
        const isMobile = window.innerWidth < 768;
        tableLayoutMode.textContent = isMobile ? 'Mobile' : 'Desktop';
        tableDebugInfo.style.display = 'block';
    }

    if (!bookingsTableBody) {
        console.error("[Admin] renderBookings: bookingsTableBody element not found in DOM. Cannot render.");
        return;
    }

    if (!bookings || bookings.length === 0) {
        console.info('[Admin] renderBookings: No bookings to display or bookings array is empty.');
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <div class="my-4">
                        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                        <p class="mb-2">No bookings found</p>
                        <p class="text-muted small">Try changing your filter criteria or add new bookings.</p>
                    </div>
                </td>
            </tr>
        `;
        if (bookingsCount) bookingsCount.textContent = 0;
        return;
    }
    
    bookingsTableBody.innerHTML = ''; // Clear table
    
    console.log('[Admin] renderBookings: Starting to render each booking.');
    bookings.forEach((booking, index) => {
        console.log(`[Admin] renderBookings: Processing booking ${index + 1}:`, JSON.parse(JSON.stringify(booking)));

        const customer = booking.customer || {};
        const firstName = customer.firstName || booking.customer_first_name || 'N/A';
        const lastName = customer.lastName || booking.customer_last_name || '';
        const customerName = `${firstName} ${lastName}`.trim();

        let carName = 'N/A';
        if (booking.car_make && booking.car_model) {
            carName = `${booking.car_make} ${booking.car_model}`;
        } else if (booking.car_make) {
            carName = booking.car_make;
        } else if (booking.car_model) {
            carName = booking.car_model;
        }
        
        const price = parseFloat(booking.total_price);
        const formattedPrice = isNaN(price) ? 'N/A' : formatCurrency(price);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="ID/Reference" class="align-middle">${booking.booking_reference || booking.id || 'N/A'}</td>
            <td data-label="Customer" class="align-middle">
                <div>${customerName}</div>
                <small class="text-muted">${customer.email || booking.customer_email || 'N/A'}</small>
            </td>
            <td data-label="Car" class="align-middle">${carName}</td>
            <td data-label="Pickup Date" class="align-middle">${formatDate(booking.pickup_date)}</td>
            <td data-label="Return Date" class="align-middle">${formatDate(booking.return_date)}</td>
            <td data-label="Total Price" class="align-middle">${formattedPrice}</td>
            <td data-label="Status" class="align-middle"><span class="booking-status ${getStatusClass(booking.status)}">${booking.status || 'N/A'}</span></td>
            <td data-label="Submitted" class="align-middle">${formatDate(booking.date_submitted)}</td>
            <td data-label="Actions" class="align-middle">
                <div class="d-flex gap-1 justify-content-start">
                    <button class="btn btn-sm btn-outline-primary view-details-btn" title="View Details" data-booking-id="${booking.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary edit-status-btn" title="Edit Status" data-booking-id="${booking.id}" data-current-status="${booking.status}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-booking-btn" title="Delete Booking" data-booking-id="${booking.id}" data-booking-ref="${booking.booking_reference || booking.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        
        bookingsTableBody.appendChild(row);
    });
    console.log('[Admin] renderBookings: Finished rendering all bookings.');

    if (bookingsCount) bookingsCount.textContent = bookings.length;

    // Re-attach event listeners
    attachActionListeners();
}

function attachActionListeners() {
    // Remove existing listeners to prevent duplicates if called multiple times
    bookingsTableBody.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewDetailsClick); // Avoid adding multiple listeners
        btn.addEventListener('click', handleViewDetailsClick);
    });
    bookingsTableBody.querySelectorAll('.edit-status-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditStatusClick); // Avoid adding multiple listeners
        btn.addEventListener('click', handleEditStatusClick);
    });
    bookingsTableBody.querySelectorAll('.delete-booking-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteBookingClick); // Avoid adding multiple listeners
        btn.addEventListener('click', handleDeleteBookingClick);
    });
    console.log('[Admin] attachActionListeners: Event listeners for action buttons re-attached.');
}

function handleViewDetailsClick(event) {
    if (!event || !event.currentTarget) {
        console.error('[DEBUG] handleViewDetailsClick: event or event.currentTarget is null', event);
        return;
    }
    const bookingId = event.currentTarget.dataset.bookingId;
    console.log(`[DEBUG] handleViewDetailsClick triggered for booking ID: ${bookingId}`);
    const booking = allBookings.find(b => b.id.toString() === bookingId.toString());
    if (booking) {
        showBookingDetails(booking);
    } else {
        console.error(`[Admin] handleViewDetailsClick: Booking with ID ${bookingId} not found in allBookings.`);
        showErrorMessage('Could not find booking details.');
    }
}

function handleEditStatusClick(event) {
    if (!event || !event.currentTarget) {
        console.error('[DEBUG] handleEditStatusClick: event or event.currentTarget is null', event);
        return;
    }
    const bookingId = event.currentTarget.dataset.bookingId;
    const currentStatus = event.currentTarget.dataset.currentStatus;
    console.log(`[DEBUG] handleEditStatusClick triggered for booking ID: ${bookingId}, current status: ${currentStatus}`);
    updateStatusBtn.dataset.bookingId = bookingId; 
    const booking = allBookings.find(b => b.id.toString() === bookingId.toString());
    if (booking) {
        const modalTitle = document.getElementById('bookingDetailsModalLabel');
        if(modalTitle) modalTitle.textContent = `Update Status for Booking: ${booking.booking_reference || booking.id}`;
        if (bookingDetailsModal) {
            bookingDetailsModal.show();
        } else {
            console.warn('[DEBUG] bookingDetailsModal is missing from the DOM.');
        }
    } else {
        showErrorMessage('Could not find booking to update status.');
    }
}

/**
 * Show booking details in the modal
 * @param {Object} booking - The booking to display
 */
function showBookingDetails(booking) {
    // Extract customer info
    const customer = booking.customer || {};
    const firstName = customer.firstName || booking.customer_first_name || '';
    const lastName = customer.lastName || booking.customer_last_name || '';
    const email = customer.email || booking.customer_email || '';
    const phone = customer.phone || booking.customer_phone || '';
    const country = customer.country || booking.country || '';
    const driverLicense = customer.driverLicense || booking.driver_license || '';
    const licenseExpiry = customer.licenseExpiry || booking.license_expiration || '';
    
    // Extract location info
    const pickupLocation = booking.pickup_location || '';
    const dropoffLocation = booking.dropoff_location || '';
    
    // Extract date info
    const pickupDate = formatDate(booking.pickup_date);
    const returnDate = formatDate(booking.return_date);
    const duration = calculateDuration(booking.pickup_date, booking.return_date);
    
    // Extract car info - handle missing data gracefully
    let car = 'N/A';
    if (booking.car_make && booking.car_model) {
        car = `${booking.car_make} ${booking.car_model}`;
    } else if (booking.car_make) {
        car = booking.car_make;
    } else if (booking.car_model) {
        car = booking.car_model;
    }
    
    // Extract pricing - handle missing or zero data
    const dailyRate = parseFloat(booking.daily_rate);
    const totalPrice = parseFloat(booking.total_price);
    const formattedDailyRate = isNaN(dailyRate) ? 'N/A' : formatCurrency(dailyRate);
    const formattedTotalPrice = isNaN(totalPrice) ? 'N/A' : formatCurrency(totalPrice);
    
    // Extra options
    const childSeat = booking.child_seat || false;
    const boosterSeat = booking.booster_seat || false;
    const specialRequests = booking.special_requests || '';
    
    // Create modal content
    bookingDetailsContent.innerHTML = `
        <div class="booking-details-header">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h4 class="mb-0">Booking #${booking.booking_reference || booking.id}</h4>
                <span class="badge bg-${getStatusClass(booking.status)}">
                    ${booking.status || 'pending'}
                </span>
            </div>
            <div class="text-white-50">Created: ${formatDate(booking.date_submitted)}</div>
        </div>
        
        <div class="booking-details-body">
            <!-- Customer Information -->
            <div class="detail-section">
                <h5 class="mb-3"><i class="fas fa-user me-2"></i>Customer Information</h5>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <strong>Name:</strong> ${firstName} ${lastName}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Email:</strong> <a href="mailto:${email}">${email}</a>
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Phone:</strong> <a href="tel:${phone}">${phone}</a>
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Country:</strong> ${country}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Driver's License #:</strong> ${driverLicense}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>License Expiry:</strong> ${licenseExpiry ? formatDate(licenseExpiry) : 'N/A'}
                    </div>
                </div>
            </div>
            
            <!-- Rental Details -->
            <div class="detail-section">
                <h5 class="mb-3"><i class="fas fa-calendar-alt me-2"></i>Rental Details</h5>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <strong>Pickup Location:</strong> ${pickupLocation}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Drop-off Location:</strong> ${dropoffLocation}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Pickup Date:</strong> ${pickupDate}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Return Date:</strong> ${returnDate}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Duration:</strong> ${duration}
                    </div>
                </div>
            </div>
            
            <!-- Car Details -->
            <div class="detail-section">
                <h5 class="mb-3"><i class="fas fa-car me-2"></i>Car Details</h5>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <strong>Car:</strong> ${car}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Daily Rate:</strong> ${formattedDailyRate}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Total Price:</strong> ${formattedTotalPrice}
                    </div>
                </div>
            </div>
            
            <!-- Add-ons -->
            <div class="detail-section">
                <h5 class="mb-3"><i class="fas fa-plus-circle me-2"></i>Add-ons</h5>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <strong>Child Seat:</strong> ${childSeat ? 'Yes' : 'No'}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Booster Seat:</strong> ${boosterSeat ? 'Yes' : 'No'}
                    </div>
                </div>
                <div class="mt-3">
                    <strong>Special Requests:</strong>
                    <p class="mb-0 mt-2">${specialRequests || 'None'}</p>
                </div>
            </div>
        </div>
    `;
    
    // Store booking ID in update button for later use
    updateStatusBtn.dataset.bookingId = booking.id;
    
    // Show the modal
    bookingDetailsModal.show();
}

/**
 * Update booking status
 * Called when the "Update Status" button is clicked in the booking details modal
 */
function updateBookingStatus() {
    const bookingId = updateStatusBtn.dataset.bookingId;
    
    if (!bookingId) {
        alert('No booking selected');
        return;
    }
    
    // Get new status from user
    const newStatus = prompt('Enter new status (pending, confirmed, completed, cancelled):');
    
    if (!newStatus) return; // User cancelled
    
    showLoader();
    
    // Send update request to API
    fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify({ status: newStatus.toLowerCase() })
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            // Auth failed - redirect to login
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
            throw new Error('Authentication failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Close modal
            bookingDetailsModal.hide();
            
            // Reload bookings to get fresh data
            loadBookings();
            
            alert('Booking status updated successfully!');
        } else {
            alert('Failed to update booking status: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error updating booking status:', error);
        alert('Error updating status: ' + error.message);
    })
    .finally(() => {
        hideLoader();
    });
}

/**
 * Display an error message in the bookings table
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
    console.error('[Admin] showErrorMessage:', message); // Log the error
    const errorContainer = document.getElementById('adminErrorContainer'); // Assuming you add an error container div
    if (errorContainer) {
        errorContainer.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
        errorContainer.style.display = 'block';
    } else {
        // Fallback to alert if no dedicated container
        alert('Admin Page Error: ' + message);
    }
}

/**
 * Calculate the duration between two dates in days
 * @param {string} start - Start date string
 * @param {string} end - End date string
 * @returns {string} - Duration as a string (e.g., "3 days")
 */
function calculateDuration(start, end) {
    if (!start || !end) return 'N/A';
    
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays + ` day${diffDays !== 1 ? 's' : ''}`;
    } catch (e) {
        console.error('Error calculating duration:', e);
        return 'N/A';
    }
}

/**
 * Get the CSS class for a booking status
 * @param {string} status - The booking status
 * @returns {string} - CSS class for the status
 */
function getStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'completed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'cancelled':
            return 'danger';
        default:
            return 'secondary';
    }
}

/**
 * Apply filters to the bookings list
 */
function applyFilters() {
    const status = statusFilter.value;
    const dateOption = dateFilter.value;
    const carModel = carFilter.value;
    const submittedDate = document.getElementById('submittedDateFilter').value;
    const searchText = textSearchFilter ? textSearchFilter.value.trim().toLowerCase() : '';
    
    // Handle date picker container visibility
    const datePickerContainer = document.getElementById('datePickerContainer');
    if (dateOption === 'custom') {
        datePickerContainer.style.display = 'block';
    } else {
        datePickerContainer.style.display = 'none';
    }
    
    // Start with all bookings
    let filtered = [...allBookings];
    
    // Filter by search text (new functionality)
    if (searchText) {
        filtered = filtered.filter(booking => {
            // Search across multiple fields
            const reference = (booking.booking_reference || '').toLowerCase();
            const name = (booking.customer_name || '').toLowerCase();
            const email = (booking.customer_email || '').toLowerCase();
            const carMake = (booking.car_make || '').toLowerCase();
            const carModel = (booking.car_model || '').toLowerCase();
            const carInfo = `${carMake} ${carModel}`.toLowerCase();
            
            // Check if any field contains the search text
            return reference.includes(searchText) || 
                   name.includes(searchText) || 
                   email.includes(searchText) || 
                   carInfo.includes(searchText);
        });
    }
    
    // Filter by status
    if (status) {
        filtered = filtered.filter(booking => booking.status === status);
    }
    
    // Filter by date
    if (dateOption === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.date_submitted);
            bookingDate.setHours(0, 0, 0, 0);
            return bookingDate.getTime() === today.getTime();
        });
    } else if (dateOption === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(booking => new Date(booking.date_submitted) >= weekAgo);
    } else if (dateOption === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(booking => new Date(booking.date_submitted) >= monthAgo);
    } else if (submittedDate) {
        // Filter by exact date selected in the datepicker
        // Convert the selected date to start of day in local timezone
        const selectedDate = new Date(submittedDate);
        selectedDate.setHours(0, 0, 0, 0);
        
        // Get the next day to compare with
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.date_submitted);
            return bookingDate >= selectedDate && bookingDate < nextDay;
        });
    }
    
    // Filter by car model
    if (carModel) {
        filtered = filtered.filter(booking => {
            if (!booking.car_make && !booking.car_model) return false;
            return `${booking.car_make} ${booking.car_model}` === carModel;
        });
    }
    
    // Update filtered bookings and render
    filteredBookings = filtered;
    renderBookings(filteredBookings);
}

/**
 * Reset all filters and show all bookings
 */
function resetFilters() {
    document.getElementById('submittedDateFilter').value = '';
    if (textSearchFilter) {
        textSearchFilter.value = '';
    }
    filteredBookings = [...allBookings];
    renderBookings(filteredBookings);
}

/**
 * Handle delete booking button click
 * @param {Event} event - The click event
 */
function handleDeleteBookingClick(event) {
    if (!event || !event.currentTarget) {
        console.error('[DEBUG] handleDeleteBookingClick: event or event.currentTarget is null', event);
        return;
    }
    const bookingId = event.currentTarget.dataset.bookingId;
    const bookingRef = event.currentTarget.dataset.bookingRef;
    
    console.log(`[DEBUG] handleDeleteBookingClick triggered for booking ID: ${bookingId}, Reference: ${bookingRef}`);
    
    // Confirm deletion with the admin
    if (!confirm(`Are you sure you want to delete booking ${bookingRef}? This action cannot be undone.`)) {
        return; // User cancelled
    }
    
    showLoader();
    
    // Send delete request to API
    fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`
        },
        credentials: 'include'
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            // Auth failed - redirect to login
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
            throw new Error('Authentication failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Success - reload bookings
            loadBookings();
            alert(`Booking ${bookingRef} deleted successfully.`);
        } else {
            // API request was successful but operation failed
            alert(`Failed to delete booking: ${data.error || 'Unknown error'}`);
        }
    })
    .catch(error => {
        console.error('[Admin] handleDeleteBookingClick error:', error);
        alert(`Error deleting booking: ${error.message}`);
    })
    .finally(() => {
        hideLoader();
    });
}

// Add window resize handler to update table layout mode
window.addEventListener('resize', function() {
    const tableDebugInfo = document.getElementById('tableDebugInfo');
    const tableLayoutMode = document.getElementById('tableLayoutMode');
    if (tableDebugInfo && tableLayoutMode) {
        const isMobile = window.innerWidth < 768;
        tableLayoutMode.textContent = isMobile ? 'Mobile' : 'Desktop';
    }
});

async function loadCarsForPricing() {
    if (!carsContent || !priceEditorTable) return;
    try {
        const res = await fetch('/api/cars');
        const data = await res.json();
        if (!data.success) throw new Error('Failed to fetch cars');
        allCarsForPricing = data.cars;
        // Populate dropdown
        carDropdown.innerHTML = '';
        allCarsForPricing.forEach(car => {
            const opt = document.createElement('option');
            opt.value = car.id;
            opt.textContent = car.name;
            carDropdown.appendChild(opt);
        });
        // Show first car by default
        if (allCarsForPricing.length > 0) {
            renderCarPricingTable(allCarsForPricing[0].id);
        } else {
            priceEditorTable.querySelector('tbody').innerHTML = '<tr><td colspan="10" class="text-danger">No cars found.</td></tr>';
        }
    } catch (err) {
        const tbody = priceEditorTable.querySelector('tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-danger">Error loading cars: ${err.message}</td></tr>`;
        console.error('[Cars Tab] Error loading cars for pricing:', err);
    }
}

carDropdown.addEventListener('change', function() {
    renderCarPricingTable(this.value);
});

// Function to render car pricing table
function renderCarPricingTable(carId) {
    if (!priceEditorTable) return;
    const car = allCarsForPricing.find(c => c.id === carId);
    if (!car) return;
    const pricing = typeof car.monthly_pricing === 'string' ? JSON.parse(car.monthly_pricing) : car.monthly_pricing || {};
    const months = getSortedMonthKeys(pricing);
    const tbody = priceEditorTable.querySelector('tbody');
    tbody.innerHTML = '';

    // Build thead with two rows: category header and month header
    const thead = priceEditorTable.querySelector('thead');
    thead.innerHTML = '';
    const categoryRow = document.createElement('tr');
    categoryRow.style.background = '#f3f6fa';
    categoryRow.style.fontWeight = 'bold';
    categoryRow.innerHTML = `
        <th rowspan="2" style="vertical-align: middle;">Month</th>
        <th colspan="7" class="text-center">Days 1-7</th>
        <th rowspan="2" class="text-center">Extra Day</th>
        <th rowspan="2" class="text-center">Actions</th>
    `;
    thead.appendChild(categoryRow);
    const daysRow = document.createElement('tr');
    for (let d = 1; d <= 7; d++) {
        daysRow.innerHTML += `<th class="text-center">Day ${d}</th>`;
    }
    thead.appendChild(daysRow);

    // Build table body
    months.forEach((monthKey, idx) => {
        const monthName = getMonthNameFromKey(monthKey);
        const monthPricing = pricing[monthKey] || {};
        const row = document.createElement('tr');
        row.style.background = idx % 2 === 0 ? '#fff' : '#f8fafc';
        row.style.borderBottom = '1px solid #e3e8ee';
        row.innerHTML = `
            <td style="font-weight: bold;">${monthName}</td>
            <td><input type="number" class="form-control form-control-sm" value="${monthPricing.day_1 || ''}" data-carid="${car.id}" data-month="${monthKey}" data-day="day_1"></td>
            <td><input type="number" class="form-control form-control-sm" value="${monthPricing.day_2 || ''}" data-carid="${car.id}" data-month="${monthKey}" data-day="day_2"></td>
            <td><input type="number" class="form-control form-control-sm" value="${monthPricing.day_3 || ''}" data-carid="${car.id}" data-month="${monthKey}" data-day="day_3"></td>
            <td><input type="number" class="form-control form-control-sm" value="${monthPricing.day_4 || ''}" data-carid="${car.id}" data-month="${monthKey}" data-day="day_4"></td>
            <td><input type="number" class="form-control form-control-sm" value="${monthPricing.day_5 || ''}" data-carid="${car.id}" data-month="${monthKey}" data-day="day_5"></td>
            <td><input type="number" class="form-control form-control-sm" value="${monthPricing.day_6 || ''}" data-carid="${car.id}" data-month="${monthKey}" data-day="day_6"></td>
            <td><input type="number" class="form-control form-control-sm" value="${monthPricing.day_7 || ''}" data-carid="${car.id}" data-month="${monthKey}" data-day="day_7"></td>
            <td><input type="number" class="form-control form-control-sm" value="${monthPricing.extra_day || ''}" data-carid="${car.id}" data-month="${monthKey}" data-day="extra_day"></td>
            <td class="text-end"><button class="btn btn-sm btn-primary" onclick="saveMonthlyPricingMonth('${car.id}', '${monthKey}', this)">Save</button></td>
        `;
        tbody.appendChild(row);
    });
}

// Save button for a single month
window.saveMonthlyPricingMonth = async function(carId, monthKey, btn) {
    // Collect all inputs for this car and month
    const tbody = priceEditorTable.querySelector('tbody');
    const inputs = tbody.querySelectorAll(`input[data-carid='${carId}'][data-month='${monthKey}']`);
    const month_pricing = {};
    inputs.forEach(input => {
        const day = input.dataset.day;
        month_pricing[day] = parseFloat(input.value) || 0;
    });
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        // Get the full pricing object for the car
        const car = allCarsForPricing.find(c => c.id === carId);
        let pricing = typeof car.monthly_pricing === 'string' ? JSON.parse(car.monthly_pricing) : car.monthly_pricing || {};
        pricing[monthKey] = month_pricing;
        const res = await fetch(`/api/admin/car/${carId}/pricing`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ monthly_pricing: pricing })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to update pricing');
        btn.textContent = 'Saved!';
        setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 1200);
        alert('Pricing updated successfully!');
    } catch (err) {
        btn.textContent = 'Error';
        setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 2000);
        alert('Failed to save pricing: ' + err.message);
    }
};

       