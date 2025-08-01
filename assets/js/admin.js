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

// Edit booking modal
let editBookingModal = null;
const editBookingModalElem = document.getElementById('editBookingModal');
const editBookingForm = document.getElementById('editBookingForm');
if (editBookingModalElem) {
    editBookingModal = new bootstrap.Modal(editBookingModalElem);
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

// Map of car_id to availability info for quick lookup
let carAvailabilityMap = {};

// Calendar modal references
let calendarModal = null;
const calendarModalElem = document.getElementById('carCalendarModal');
const calendarContainer = document.getElementById('carCalendarContainer');
const calendarModalLabel = document.getElementById('carCalendarModalLabel');
if (calendarModalElem) {
    calendarModal = new bootstrap.Modal(calendarModalElem);
}

// Currently viewed car and month in the calendar modal
let calendarCar = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

function getMonthNameFromKey(key) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Handle keys like '2025-01' or '01'
    const numericMatch = key.match(/(?:^|-)0?(\d{1,2})$/);
    if (numericMatch) {
        const idx = parseInt(numericMatch[1], 10) - 1;
        return months[idx] || key;
    }

    // Handle keys that contain month names, e.g. 'May' or 'May 2025'
    const nameMatch = key.match(/[A-Za-z]+/);
    if (nameMatch) {
        const idx = months.findIndex(m => m.toLowerCase() === nameMatch[0].toLowerCase());
        if (idx !== -1) return months[idx];
    }

    return key;
}

function getSortedMonthKeys(pricing) {
    const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];

    return Object.keys(pricing).sort((a, b) => {
        const getIndex = (key) => {
            const numeric = key.match(/(?:^|-)0?(\d{1,2})$/);
            if (numeric) {
                return parseInt(numeric[1], 10) - 1;
            }
            const name = key.match(/[A-Za-z]+/);
            if (name) {
                return months.indexOf(name[0].toLowerCase());
            }
            return 13; // put unknown months at the end
        };
        return getIndex(a) - getIndex(b);
    });
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener("DOMContentLoaded", async function() {
    try {
        const res = await fetch("/api/admin/session", { credentials: "include" });
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = "admin-login.html";
            return;
        }
    } catch (e) {
        window.location.href = "admin-login.html";
        return;
    }

    // Initialize references to DOM elements
    bookingsTableBody = document.getElementById('bookingsTableBody');
    statusFilter = document.getElementById('statusFilter');
    dateFilter = document.getElementById('dateFilter');
    carFilter = document.getElementById('carFilter');
    textSearchFilter = document.getElementById('textSearchFilter');
    clearSearchBtn = document.getElementById('clearSearchBtn');
    const exportManualBlocksBtn = document.getElementById('exportManualBlocksBtn');
    
    // Tab click handlers
    const tabHandlers = {
        'dashboardTab': 'dashboard',
        'carsTab': 'cars',
        'customersTab': 'customers',
        'reportsTab': 'reports',
        'settingsTab': 'settings',
        'editCarTab': 'editCar',
        'addonsTab': 'addons'
    };

    // Add click handlers for all tabs
    Object.entries(tabHandlers).forEach(([tabId, section]) => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                showSection(section);
                setActive(this);
            });
        }
    });

    // Show dashboard by default
    showSection('dashboard');
    const dashboardTab = document.getElementById('dashboardTab');
    if (dashboardTab) {
        setActive(dashboardTab);
    }

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

    if (editBookingForm) {
        editBookingForm.addEventListener('submit', saveBookingEdits);
    }
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    [logoutBtn, logoutBtnMobile, mobileLogoutBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', async function() {
                try {
                    await fetch('/api/admin/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (e) {
                    console.error('Logout request failed', e);
                } finally {
                    localStorage.removeItem('adminToken');
                    window.location.href = 'admin-login.html';
                }
            });
        }
    });
    
    // Add event listener for text search input
    if (textSearchFilter) {
        textSearchFilter.addEventListener('input', debounce(function() {
            applyFilters();
        }, 300));
    }
    
    // Add event listener for clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            textSearchFilter.value = '';
            applyFilters();
        });
    }

    if (exportManualBlocksBtn) {
        exportManualBlocksBtn.addEventListener('click', exportManualBlocks);
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
        { tab: 'editCarTab', content: 'editCarContent' },
        { tab: 'addonsTab', content: 'addonsContent' }
    ];
    function showSection(section) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(el => el.classList.add('d-none'));
        
        // Show selected section
        const target = document.getElementById(section + 'Content');
        if (target) target.classList.remove('d-none');
        
        // Scroll to top
        window.scrollTo(0, 0);

        // Load section-specific data
        if (section === 'cars' && typeof loadCarsForPricing === 'function') {
            loadCarsForPricing();
        }
        if (section === 'editCar' && typeof loadEditCarDropdown === 'function') {
            loadEditCarDropdown();
        }
        if (section === 'addons' && typeof loadAddons === 'function') {
            loadAddons();
        }
    }
    // Attach click listeners
    tabSectionMap.forEach(({ tab, content }) => {
        const tabEl = document.getElementById(tab);
        if (tabEl) {
            tabEl.addEventListener('click', function(e) {
                console.log(`[DEBUG] Tab clicked: ${tab}, content: ${content}`);
                e.preventDefault();
                showSection(content);
                // Load data if needed
                if (content === 'carsContent') loadCarsForPricing();
                if (content === 'editCarContent') loadEditCarDropdown();
                if (content === 'dashboardContent') loadBookings();
                if (content === 'customersContent') loadCarAvailability();
            });
        }
    });
    // Show dashboard by default on load
    showSection('dashboardContent');

    const addonsTab = document.getElementById('addonsTab');
    if (addonsTab) {
        addonsTab.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('addons');
            setActive(this);
        });
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = e.target.current.value;
            const newPassword = e.target.new.value;
            const confirm = e.target.confirm.value;
            const msg = document.getElementById('changePasswordMsg');
            if (newPassword !== confirm) {
                msg.textContent = 'Passwords do not match.';
                return;
            }
            try {
                const res = await fetch('/api/admin/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const data = await res.json();
                msg.textContent = data.success ? 'Password updated.' : data.error;
            } catch (err) {
                msg.textContent = 'Server error';
            }
        });
    }

    const addAdminForm = document.getElementById('addAdminForm');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            const msg = document.getElementById('addAdminMsg');
            try {
                const res = await fetch('/api/admin/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                msg.textContent = data.success ? 'Admin added.' : data.error;
                if (data.success) {
                    addAdminForm.reset();
                    loadAdmins();
                }
            } catch (err) {
                msg.textContent = 'Server error';
            }
        });
    }

    async function loadAdmins() {
        try {
            const res = await fetch('/api/admin/admins', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            const list = document.getElementById('adminList');
            if (!list) return;
            list.innerHTML = '';
            if (data.admins) {
                data.admins.forEach(a => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.textContent = a.email;
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-sm btn-danger';
                    btn.textContent = 'Delete';
                    btn.addEventListener('click', async () => {
                        if (!confirm('Delete admin?')) return;
                        await fetch(`/api/admin/${a.id}`, { method: 'DELETE', headers:{'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }});
                        loadAdmins();
                    });
                    li.appendChild(btn);
                    list.appendChild(li);
                });
            }
        } catch (err) {
            console.error('Error loading admins:', err);
        }
    }

    loadAdmins();
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
        // Always include credentials so the session cookie is sent
        const headers = {
            'Accept': 'application/json'
        };

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
    if (!carFilter) {
        console.warn('[Admin] carFilter element not found in DOM');
        return;
    }
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
 * Format a date string including time
 * @param {string} dateString - The date string to format
 * @returns {string} - Formatted date and time string
 */
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * Format a date string to YYYY-MM-DD
 * @param {string} dateString
 * @returns {string}
 */
function formatDateISO(dateString) {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d)) return dateString;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateString;
    }
}

/**
 * Format a date string to YYYY-MM-DD
 * @param {string} dateString
 * @returns {string}
 */
function formatDateISO(dateString) {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d)) return dateString;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateString;
    }
}

function diffDays(start, end) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s) || isNaN(e)) return 0;
        return Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
    } catch (e) {
        return 0;
    }
}

function dateRangeSet(ranges) {
    const set = new Set();
    if (!Array.isArray(ranges)) return set;
    ranges.forEach(r => {
        const s = new Date(r.start);
        const e = new Date(r.end);
        if (isNaN(s) || isNaN(e)) return;
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            set.add(formatDateISO(d));
        }
    });
    return set;
}

function generateCalendarHtml(car, year = calendarYear, month = calendarMonth) {
    calendarYear = year;
    calendarMonth = month;

    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
    const firstDay = new Date(year, month, 1).getDay();
    const offset = (firstDay + 6) % 7; // start week on Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blockSet = dateRangeSet(car.manual_blocks);
    const bookedSet = dateRangeSet(car.booked_ranges);

    let html = '<div class="calendar-modal">';
    html += `<div class="calendar-nav">
        <button type="button" class="btn btn-sm btn-outline-secondary calendar-prev">&lt;</button>
        <span class="fw-bold">${monthName} ${year}</span>
        <button type="button" class="btn btn-sm btn-outline-secondary calendar-next">&gt;</button>
    </div>`;
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    html += '<table class="calendar-modal-table table table-bordered">';
    html += '<thead><tr>' + days.map(d=>`<th>${d}</th>`).join('') + '</tr></thead><tbody><tr>';
    for (let i = 0; i < offset; i++) html += '<td></td>';
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const ds = formatDateISO(date);
        let cls = 'available';
        let status = 'Available';
        if (bookedSet.has(ds)) { cls = 'booked'; status = 'Booked'; }
        else if (blockSet.has(ds)) { cls = 'blocked'; status = 'Blocked'; }
        if (ds === formatDateISO(new Date())) cls += ' today';
        html += `<td class="calendar-day ${cls.trim()}" data-bs-toggle="tooltip" data-bs-placement="top" title="${ds} – ${status}">${day}</td>`;
        if ((offset + day) % 7 === 0 && day !== daysInMonth) html += '</tr><tr>';
    }
    html += '</tr></tbody></table>';
    html += '<div class="calendar-legend mt-2">';
    html += '<span class="legend booked"></span> Booked ';
    html += '<span class="legend blocked ms-2"></span> Blocked ';
    html += '<span class="legend available ms-2"></span> Available';
    html += '</div>';
    html += '</div>';
    return html;
}

function renderCalendar() {
    if (!calendarContainer || !calendarCar) return;
    calendarContainer.innerHTML = generateCalendarHtml(calendarCar, calendarYear, calendarMonth);
    if (window.bootstrap) {
        calendarContainer.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
    }
    const prev = calendarContainer.querySelector('.calendar-prev');
    const next = calendarContainer.querySelector('.calendar-next');
    if (prev) prev.addEventListener('click', () => {
        calendarMonth--;
        if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
        renderCalendar();
    });
    if (next) next.addEventListener('click', () => {
        calendarMonth++;
        if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
        renderCalendar();
    });
}

function generateMiniGrid(car) {
    const blockSet = dateRangeSet(car.manual_blocks);
    const bookedSet = dateRangeSet(car.booked_ranges);
    const cells = [];
    const start = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const ds = formatDateISO(d);
        let cls = 'available';
        if (bookedSet.has(ds)) cls = 'booked';
        else if (blockSet.has(ds)) cls = 'blocked';
        cells.push(`<div class="mini-day ${cls}" title="${ds}"></div>`);
    }
    return `<div class="mini-grid">${cells.join('')}</div>`;
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
            <td data-label="Submitted" class="align-middle">${formatDateTime(booking.date_submitted)}</td>
            <td data-label="Actions" class="align-middle">
                <div class="d-flex gap-1 justify-content-start">
                    <button class="btn btn-sm btn-outline-primary view-details-btn" title="View Details" data-booking-id="${booking.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary edit-booking-btn" title="Edit Booking" data-booking-id="${booking.id}">
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
    bookingsTableBody.querySelectorAll('.edit-booking-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditBookingClick); // Avoid adding multiple listeners
        btn.addEventListener('click', handleEditBookingClick);
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

function handleEditBookingClick(event) {
    if (!event || !event.currentTarget) return;
    const bookingId = event.currentTarget.dataset.bookingId;
    const booking = allBookings.find(b => b.id.toString() === bookingId.toString());
    if (!booking || !editBookingForm) return;
    currentBookingId = booking.id;
    editBookingForm.elements['customer_first_name'].value = booking.customer?.firstName || booking.customer_first_name || '';
    editBookingForm.elements['customer_last_name'].value = booking.customer?.lastName || booking.customer_last_name || '';
    editBookingForm.elements['customer_email'].value = booking.customer?.email || booking.customer_email || '';
    editBookingForm.elements['customer_phone'].value = booking.customer?.phone || booking.customer_phone || '';
    editBookingForm.elements['pickup_date'].value = booking.pickup_date ? new Date(booking.pickup_date).toISOString().split('T')[0] : '';
    editBookingForm.elements['return_date'].value = booking.return_date ? new Date(booking.return_date).toISOString().split('T')[0] : '';
    editBookingForm.elements['car_make'].value = booking.car_make || '';
    editBookingForm.elements['car_model'].value = booking.car_model || '';
    editBookingForm.elements['status'].value = booking.status || 'pending';
    editBookingForm.elements['child_seat'].checked = !!booking.child_seat;
    editBookingForm.elements['booster_seat'].checked = !!booking.booster_seat;
    editBookingForm.elements['special_requests'].value = booking.special_requests || '';
    if (editBookingModal) editBookingModal.show();
}

async function saveBookingEdits(e) {
    e.preventDefault();
    if (!currentBookingId) return;
    const payload = {
        customer_first_name: editBookingForm.elements['customer_first_name'].value.trim(),
        customer_last_name: editBookingForm.elements['customer_last_name'].value.trim(),
        customer_email: editBookingForm.elements['customer_email'].value.trim(),
        customer_phone: editBookingForm.elements['customer_phone'].value.trim(),
        pickup_date: editBookingForm.elements['pickup_date'].value,
        return_date: editBookingForm.elements['return_date'].value,
        car_make: editBookingForm.elements['car_make'].value.trim(),
        car_model: editBookingForm.elements['car_model'].value.trim(),
        status: editBookingForm.elements['status'].value,
        child_seat: editBookingForm.elements['child_seat'].checked,
        booster_seat: editBookingForm.elements['booster_seat'].checked,
        special_requests: editBookingForm.elements['special_requests'].value.trim()
    };
    showLoader();
    try {
        const res = await fetch(`/api/admin/bookings/${currentBookingId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            if (editBookingModal) editBookingModal.hide();
            loadBookings();
            loadCarAvailability();
        } else {
            alert('Failed to update booking: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error updating booking:', err);
        alert('Error updating booking: ' + err.message);
    } finally {
        hideLoader();
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
    const totalPrice = parseFloat(booking.total_price || booking.totalPrice);
    const formattedDailyRate = isNaN(dailyRate) ? 'N/A' : formatCurrency(dailyRate);
    const formattedTotalPrice = isNaN(totalPrice) ? 'N/A' : formatCurrency(totalPrice);

    const paidAmount = isNaN(totalPrice) ? null : (totalPrice * 0.45).toFixed(2);
    const dueAmount = isNaN(totalPrice) ? null : (totalPrice * 0.55).toFixed(2);
    const formattedPaid = paidAmount ? `€${paidAmount}` : 'N/A';
    const formattedDue = dueAmount ? `€${dueAmount}` : 'N/A';
    
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
            <div class="text-white-50">Created: ${formatDateTime(booking.date_submitted)}</div>
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
                    <div class="col-md-6 mb-2">
                        <strong style="color: green;">Paid:</strong> ${formattedPaid}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong style="color: red;">Due:</strong> ${formattedDue}
                    </div>
                </div>
            </div>
            
            <!-- Add-ons -->
            <div class="detail-section">
                <h5 class="mb-3"><i class="fas fa-plus-circle me-2"></i>Add-ons</h5>
                <div class="row">
                    ${childSeat ? `<div class='col-md-6 mb-2'><strong>Child Seat:</strong> Yes</div>` : ''}
                    ${boosterSeat ? `<div class='col-md-6 mb-2'><strong>Booster Seat:</strong> Yes</div>` : ''}
                    ${!childSeat && !boosterSeat ? `<div class='col-12 mb-2 text-muted'>No add-ons selected.</div>` : ''}
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

            // Reload bookings and availability
            loadBookings();
            loadCarAvailability();
            
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
    const errorContainer = document.getElementById('adminErrorContainer');
    if (errorContainer) {
        errorContainer.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
        errorContainer.style.display = 'block';
    } else {
        console.warn('[Admin] adminErrorContainer not found in DOM. Error message:', message);
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
            // Success - reload bookings and car availability
            loadBookings();
            loadCarAvailability();
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
        const res = await fetch('/api/update-prices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ car_id: carId, prices: pricing })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to update pricing');
        car.monthly_pricing = pricing;
        btn.textContent = 'Saved!';
        setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 1200);
        alert('Pricing updated successfully!');
    } catch (err) {
        btn.textContent = 'Error';
        setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 2000);
        alert('Failed to save pricing: ' + err.message);
    }
};

// --- Car Availability Management ---
async function loadCarAvailability() {
    console.log('[DEBUG] loadCarAvailability called');
    const tableBody = document.querySelector('#carAvailabilityTable tbody');
    if (!tableBody) {
        console.log('[DEBUG] carAvailabilityTable tbody not found');
        return;
    }
    tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
        const response = await fetch('/api/admin/cars/availability', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include'
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch cars');
        tableBody.innerHTML = '';
        if (!data.cars || data.cars.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No cars found.</td></tr>';
            return;
        }
        carAvailabilityMap = {};
        data.cars.forEach((car, idx) => {
            // Use car.car_id everywhere for data-car-id
            const realCarId = car.car_id || car.id;
            carAvailabilityMap[realCarId] = car;
            // Manual status dropdown
            const statusOptions = ['automatic', 'available', 'unavailable'];
            let statusDropdown = `<select class="form-select form-select-sm manual-status-dropdown" data-car-id="${realCarId}">`;
            statusOptions.forEach(opt => {
                statusDropdown += `<option value="${opt}"${car.manual_status === opt ? ' selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`;
            });
            statusDropdown += '</select>';

            // Manual block date range picker
            const blockInputId = `blockInput-${realCarId}`;
            console.log('[DEBUG] Generated block input ID:', blockInputId, 'for car', realCarId);
            const blockInput = `<input type="text" class="form-control form-control-sm manual-block-input" id="${blockInputId}" placeholder="Add block..." data-car-id="${realCarId}" style="max-width:160px;display:inline-block;" readonly>`;
            const addBlockBtn = `<button class="btn btn-sm btn-outline-primary ms-1 add-block-btn" data-car-id="${realCarId}" data-input-id="${blockInputId}">Add</button>`;

            // Manual blocks displayed in small table with delete icons inside collapsible container
            let manualBlocksBody = '';
            const blockCount = car.manual_blocks ? car.manual_blocks.length : 0;
            if (blockCount > 0) {
                const rows = car.manual_blocks.map((b, i) =>
                    `<tr>
                        <td>${formatDateISO(b.start)}</td>
                        <td>${formatDateISO(b.end)}</td>
                        <td><span class="delete-block" data-car-id="${realCarId}" data-block-idx="${i}" data-block-id="${b.id}" style="cursor:pointer;" title="Remove this manual block">🗑️</span></td>
                    </tr>`
                ).join('');
                manualBlocksBody = `
                    <div class="manual-blocks-scroll">
                        <table class="table table-sm table-bordered manual-blocks-table">
                            <tbody>${rows}</tbody>
                        </table>
                    </div>`;
            } else {
                manualBlocksBody = '<div class="no-blocks-msg">No manual blocks yet</div>';
            }

            const manualBlocksHtml = `
                    <div class="manual-blocks-container">
                    <div class="manual-blocks-header">
                        <span class="manual-blocks-toggle-icon">\u25B6</span>
                        <span class="manual-blocks-title">Manual Blocks (${blockCount} total)</span>
                    </div>
                    <div class="manual-blocks-body">
                        ${manualBlocksBody}
                        <div class="mt-2">${blockInput}${addBlockBtn}</div>
                    </div>
                </div>`;

            // Calendar summary and view button
            const bookedDays = car.booked_ranges ? car.booked_ranges.reduce((s, r) => s + diffDays(r.start, r.end), 0) : 0;
            const blockedDays = car.manual_blocks ? car.manual_blocks.reduce((s, b) => s + diffDays(b.start, b.end), 0) : 0;
            const summary = `Blocked: ${blockedDays} day${blockedDays !== 1 ? 's' : ''} | Booked: ${bookedDays} day${bookedDays !== 1 ? 's' : ''}`;
            let calendarHtml = `<div class="calendar-summary">${summary}</div>`;
            calendarHtml += `<button class="btn btn-sm btn-outline-secondary view-calendar-btn" data-car-id="${realCarId}">🗓 View Calendar</button>`;
            calendarHtml += generateMiniGrid(car);

            // Determine status badge
            let statusBadge = '<span class="badge bg-success">Available</span>';
            if (car.manual_status === 'unavailable' || car.available === false) {
                statusBadge = '<span class="badge bg-danger">Unavailable</span>';
            } else if (car.manual_status === 'available') {
                statusBadge = '<span class="badge bg-success">Available</span>';
            } else if (car.manual_status === 'automatic') {
                statusBadge = '<span class="badge bg-primary">Automatic</span>';
            }

            tableBody.innerHTML += `
                <tr>
                    <td>${car.name}</td>
                    <td>${statusBadge}</td>
                    <td>${statusDropdown}</td>
                    <td>${calendarHtml}</td>
                    <td>${manualBlocksHtml}</td>
                </tr>
            `;
        });

        // Attach event listeners for manual status dropdowns
        document.querySelectorAll('.manual-status-dropdown').forEach(dropdown => {
            dropdown.addEventListener('change', async function() {
                const carId = this.getAttribute('data-car-id');
                const newStatus = this.value;
                await updateManualStatus(carId, newStatus);
                loadCarAvailability();
            });
        });

        // Attach flatpickr to all manual block inputs
        if (window.flatpickr) {
            document.querySelectorAll('.manual-block-input').forEach(input => {
                flatpickr(input, {
                    mode: 'range',
                    dateFormat: 'Y-m-d',
                    allowInput: false
                });
            });
        }

        // Add block button event (replace old logic)
        document.querySelectorAll('.add-block-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                // Always use the real car.id from the cars table for car_id
                const carId = this.getAttribute('data-car-id');
                const inputId = this.getAttribute('data-input-id');
                const selector = `#${inputId}`;
                const input = document.querySelector(selector);

                console.log('[DEBUG] Manual block add clicked');
                console.log('[DEBUG] carId:', carId, '| selector:', selector, '| found:', input !== null);
                if (input && input.offsetParent === null) {
                    console.warn('[DEBUG] Input element is hidden or removed before use');
                }
                console.log('[DEBUG] Input value:', input?.value);
                
                if (!input || !input.value) {
                    console.error('[DEBUG] No input value found');
                    return;
                }
                
                const dates = input.value.split(' to ');
                if (dates.length !== 2) {
                    console.error('[DEBUG] Invalid date format:', input.value);
                    return;
                }
                
                // car_id must be the real car.id, not car.name or car.make
                const payload = { 
                    car_id: carId, 
                    start_date: dates[0], 
                    end_date: dates[1] 
                };
                
                console.log('[DEBUG] Sending manual block request with payload:', payload);
                
                try {
                    const res = await fetch('/api/admin/manual-block', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                        },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                    
                    console.log('[DEBUG] Response status:', res.status);
                    const data = await res.json();
                    console.log('[DEBUG] Response data:', data);
                    
                    if (data.success) {
                        showToast('Manual block added successfully');
                        input.value = '';
                        loadCarAvailability();
                    } else {
                        throw new Error(data.error || 'Failed to add block');
                    }
                } catch (err) {
                    console.error('[DEBUG] Error adding manual block:', err);
                    showToast(err.message, 'danger');
                }
            });
        });

        // Delete block event
        document.querySelectorAll('.delete-block').forEach(icon => {
            icon.addEventListener('click', async function() {
                const blockId = this.getAttribute('data-block-id');
                if (!blockId) return;
                await deleteManualBlock(blockId);
                loadCarAvailability();
            });
        });

      // Toggle manual blocks visibility
        document.querySelectorAll('.manual-blocks-header').forEach(header => {
            header.addEventListener('click', function () {
                const container = this.closest('.manual-blocks-container');
                if (container) {
                    container.classList.toggle('expanded');
                }
            });
        });

        // Delete booking event
        document.querySelectorAll('.delete-booking').forEach(icon => {
            icon.addEventListener('click', async function() {
                const bookingId = this.getAttribute('data-booking-id');
                if (!bookingId) return;
                if (!confirm('Are you sure you want to delete this booking?')) return;
                try {
                    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                        }
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Booking deleted successfully');
                        loadCarAvailability();
                    } else {
                        throw new Error(data.error || 'Failed to delete booking');
                    }
                } catch (err) {
                    showToast(err.message, 'danger');
                }
            });
        });

        // View calendar event
        document.querySelectorAll('.view-calendar-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const carId = this.getAttribute('data-car-id');
                const car = carAvailabilityMap[carId];
                if (car && calendarModal) {
                    calendarCar = car;
                    const today = new Date();
                    calendarYear = today.getFullYear();
                    calendarMonth = today.getMonth();
                    if (calendarModalLabel) {
                        calendarModalLabel.textContent = `${car.name} Availability`;
                    }
                    renderCalendar();
                    calendarModal.show();
                }
            });
        });

    } catch (err) {
        console.log('[DEBUG] Error in loadCarAvailability:', err);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-danger">Error: ${err.message}</td></tr>`;
    }
}

// Add debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add toast notification function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 position-fixed top-0 end-0 m-3`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

// Add loading spinner function
function showLoadingSpinner(element) {
    const spinner = document.createElement('div');
    spinner.className = 'spinner-border spinner-border-sm text-primary me-2';
    spinner.setAttribute('role', 'status');
    spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
    element.prepend(spinner);
    return spinner;
}

// Modify updateManualStatus to show loading and toast
async function updateManualStatus(carId, manualStatus) {
    const dropdown = document.querySelector(`.manual-status-dropdown[data-car-id="${carId}"]`);
    const originalValue = dropdown.value;
    const spinner = showLoadingSpinner(dropdown.parentElement);
    try {
        dropdown.disabled = true;
        dropdown.value = 'Updating...';
        const response = await fetch(`/api/admin/car/${carId}/manual-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include',
            body: JSON.stringify({ manual_status: manualStatus })
        });
        const data = await response.json();
        if (data.success) {
            showToast('Manual status updated successfully');
        } else {
            throw new Error(data.error || 'Failed to update status');
        }
    } catch (err) {
        dropdown.value = originalValue;
        showToast(err.message, 'danger');
    } finally {
        spinner.remove();
        dropdown.disabled = false;
    }
}

// Modify deleteManualBlock to show loading and toast
async function deleteManualBlock(blockId) {
    try {
        const res = await fetch(`/api/admin/manual-block/${blockId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            showToast('Manual block deleted successfully');
        } else {
            throw new Error(data.error || 'Failed to delete block');
        }
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Trigger manual block export and download file
async function exportManualBlocks() {
    try {
        const res = await fetch('/api/manual-blocks/export');
        if (!res.ok) throw new Error('Failed to export manual blocks');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const disposition = res.headers.get('Content-Disposition');
        let filename = `manual_blocks_${new Date().toISOString().slice(0,10)}.xlsx`;
        if (disposition && disposition.includes('filename=')) {
            filename = disposition.split('filename=')[1].replace(/"/g, '');
        }
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        showToast(err.message || 'Export failed', 'danger');
    }
}

// Example: Add existence checks and warnings for key elements
function robustGetElement(id, name) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[Admin] ${name || id} not found in DOM`);
    }
    return el;
}

async function loadAddons() {
    try {
        const res = await fetch('/api/admin/addons', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load addons');

        const container = document.getElementById('addonsList');
        if (!container) {
            console.warn('[Admin] addonsList container not found');
            return;
        }

        container.innerHTML = '';
        data.addons.forEach(addon => {
            const div = document.createElement('div');
            div.className = 'col-md-6';
            div.innerHTML = `
                <div class="border rounded p-3">
                    <label class="form-label fw-bold">Name</label>
                    <input type="text" class="form-control mb-2" value="${addon.name}" data-id="${addon.id}" data-field="name">
                    <label class="form-label fw-bold">Price (€)</label>
                    <input type="number" class="form-control mb-2" value="${addon.price}" step="0.01" data-id="${addon.id}" data-field="price">
                    <button class="btn btn-primary save-addon-btn" data-id="${addon.id}">Save</button>
                </div>
            `;
            container.appendChild(div);
        });

        // Handle save buttons
        document.querySelectorAll('.save-addon-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                const nameInput = document.querySelector(`input[data-id="${id}"][data-field="name"]`);
                const priceInput = document.querySelector(`input[data-id="${id}"][data-field="price"]`);
                
                if (!nameInput || !priceInput) {
                    console.warn(`[Admin] Input fields not found for addon ${id}`);
                    return;
                }

                const name = nameInput.value;
                const price = parseFloat(priceInput.value);

                try {
                    const response = await fetch(`/api/admin/addons/${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                        },
                        body: JSON.stringify({ name, price })
                    });

                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'Failed to save addon');

                    // Show success message
                    showToast('Addon updated successfully', 'success');
                } catch (error) {
                    console.error('[Admin] Error saving addon:', error);
                    showToast(error.message || 'Failed to save addon', 'error');
                }
            });
        });
    } catch (error) {
        console.error('[Admin] Error loading addons:', error);
        showToast(error.message || 'Failed to load addons', 'error');
    }
}

       