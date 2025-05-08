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
        
        if (data.success) {
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
        
        // Add click handlers for the row and view button
        row.addEventListener('click', (event) => {
            // Only trigger if not clicking the button itself (to avoid double events)
            if (!event.target.closest('.view-details')) {
                showBookingDetails(booking);
            }
        });
        
        // Add click handler for the View button
        row.querySelector('.view-details').addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent row click from also firing
            showBookingDetails(booking);
        });
        
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
    
    // Extract location info
    const pickupLocation = booking.pickup_location || '';
    const dropoffLocation = booking.dropoff_location || '';
    
    // Extract date info
    const pickupDate = formatDate(booking.pickup_date);
    const returnDate = formatDate(booking.return_date);
    const duration = calculateDuration(booking.pickup_date, booking.return_date);
    
    // Extract car info
    const carMake = booking.car_make || '';
    const carModel = booking.car_model || '';
    const car = carMake && carModel ? `${carMake} ${carModel}` : 'N/A';
    
    // Extract pricing
    const dailyRate = booking.daily_rate || 0;
    const totalPrice = booking.total_price || 0;
    
    // Extra options
    const additionalDriver = booking.additional_driver || false;
    const fullInsurance = booking.full_insurance || false;
    const gpsNavigation = booking.gps_navigation || false;
    const childSeat = booking.child_seat || false;
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
                        <strong>Daily Rate:</strong> ${formatCurrency(dailyRate)}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Total Price:</strong> ${formatCurrency(totalPrice)}
                    </div>
                </div>
            </div>
            
            <!-- Add-ons -->
            <div class="detail-section">
                <h5 class="mb-3"><i class="fas fa-plus-circle me-2"></i>Add-ons</h5>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <strong>Additional Driver:</strong> ${additionalDriver ? 'Yes' : 'No'}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Full Insurance:</strong> ${fullInsurance ? 'Yes' : 'No'}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>GPS Navigation:</strong> ${gpsNavigation ? 'Yes' : 'No'}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Child Seat:</strong> ${childSeat ? 'Yes' : 'No'}
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

       