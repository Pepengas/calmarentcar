/**
 * Calma Car Rental - Admin Dashboard JavaScript
 */

// Global variables
let allBookings = [];
let filteredBookings = [];
let carModels = new Set();

// Get admin API token from localStorage (set during login)
const API_TOKEN = localStorage.getItem('adminToken');

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
    console.log('Admin Dashboard Initialized');
    
    // Check if user is authenticated
    if (!API_TOKEN) {
        // Redirect to login page if not authenticated
        window.location.href = 'admin-login.html';
        return;
    }
    
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
});

/**
 * Load all bookings from the server
 */
async function loadBookings() {
    showLoader();
    
    // Show loading indicator in the table
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
        const response = await fetch('/api/admin/bookings', {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            // Redirect to login page if authentication fails
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Add detailed logging of API response
        console.log('===== ADMIN BOOKINGS API RESPONSE =====');
        console.log('Raw response data:', data);
        console.log('Success status:', data.success);
        console.log('Bookings count:', data.bookings?.length || 0);
        console.log('First booking (if exists):', data.bookings?.[0] || 'No bookings');
        console.log('=======================================');
        
        if (data.success) {
            console.log(`Successfully loaded ${data.bookings?.length || 0} bookings`);
            
            // Store all bookings
            allBookings = data.bookings || [];
            filteredBookings = [...allBookings];
            
            // Extract car models for filter dropdown 
            // Server returns car_make and car_model in snake_case
            allBookings.forEach(booking => {
                if (booking.car_make && booking.car_model) {
                    carModels.add(`${booking.car_make} ${booking.car_model}`);
                }
            });
            
            // Check if required functions exist before calling them
            if (typeof populateCarFilter === 'function') {
                populateCarFilter();
            }
            
            if (typeof renderBookings === 'function') {
                renderBookings(filteredBookings);
            }
            
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats();
            } else {
                console.error('Function updateDashboardStats is not defined');
            }
        } else {
            console.error('Failed to load bookings');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    } finally {
        hideLoader();
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
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        console.error('Error formatting date:', e);
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
    // Total bookings count
    totalBookings.textContent = allBookings.length;
    
    // Calculate total revenue
    const revenue = allBookings.reduce((total, booking) => {
        const price = parseFloat(booking.total_price || 0);
        return total + price;
    }, 0);
    
    totalRevenue.textContent = formatCurrency(revenue);
    
    // Count bookings made today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.date_submitted);
        return bookingDate >= today;
    });
    
    carsBookedToday.textContent = todayBookings.length;
}

/**
 * Render the bookings table with the provided bookings data
 * @param {Array} bookings - The bookings to display
 */
function renderBookings(bookings) {
    if (!bookings || bookings.length === 0) {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center py-5">
                    <div class="my-4">
                        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                        <p class="mb-2">No bookings found</p>
                        <p class="text-muted small">Try changing your filter criteria or add new bookings</p>
                    </div>
                </td>
            </tr>
        `;
        bookingsCount.textContent = 0;
        return;
    }
    
    // Clear table
    bookingsTableBody.innerHTML = '';
    
    // Add each booking to the table
    bookings.forEach(booking => {
        // Extract customer info from booking
        const customer = booking.customer || {};
        const firstName = customer.firstName || booking.customer_first_name || '';
        const lastName = customer.lastName || booking.customer_last_name || '';
        
        // Extract location info
        const pickupLocation = booking.pickup_location || '';
        const dropoffLocation = booking.dropoff_location || '';
        
        // Extract date info
        const pickupDate = formatDate(booking.pickup_date);
        const returnDate = formatDate(booking.return_date);
        
        // Calculate duration
        const duration = calculateDuration(booking.pickup_date, booking.return_date);
        
        // Extract car info
        const carMake = booking.car_make || '';
        const carModel = booking.car_model || '';
        const car = carMake && carModel ? `${carMake} ${carModel}` : 'N/A';
        
        // Create table row
        const row = document.createElement('tr');
        row.className = 'booking-row';
        row.style.cursor = 'pointer';
        row.dataset.bookingId = booking.id || '';
        row.innerHTML = `
            <td>${booking.booking_reference || 'N/A'}</td>
            <td>${firstName}</td>
            <td>${lastName}</td>
            <td>${pickupLocation}</td>
            <td>${dropoffLocation}</td>
            <td>${pickupDate}</td>
            <td>${returnDate}</td>
            <td>${duration}</td>
            <td>${car}</td>
            <td>${formatCurrency(booking.daily_rate)}</td>
            <td>
                <span class="badge bg-${getStatusClass(booking.status)}">
                    ${booking.status || 'pending'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary view-details" data-booking-id="${booking.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        bookingsTableBody.appendChild(row);
    });
    
    // Update total count
    bookingsCount.textContent = bookings.length;
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
    const carModel = carFilter.value;
    
    // Start with all bookings
    let filtered = [...allBookings];
    
    // Filter by status
    if (status) {
        filtered = filtered.filter(booking => booking.status === status);
    }
    
    // Filter by car model
    if (carModel) {
        filtered = filtered.filter(booking => {
            const bookingCarModel = `${booking.car_make || ''} ${booking.car_model || ''}`.trim();
            return bookingCarModel === carModel;
        });
    }
    
    filteredBookings = filtered;
    renderBookings(filteredBookings);
}

/**
 * Reset all filters and show all bookings
 */
function resetFilters() {
    filteredBookings = [...allBookings];
    renderBookings(filteredBookings);
}

       