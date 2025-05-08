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
        
        if (data.success) {
            console.log(`Successfully loaded ${data.bookings?.length || 0} bookings`);
            
            allBookings = data.bookings || [];
            filteredBookings = [...allBookings];
            
            // Extract car models for filter dropdown
            allBookings.forEach(booking => {
                if (booking.car_make && booking.car_model) {
                    carModels.add(`${booking.car_make} ${booking.car_model}`);
                }
            });
            
            // Populate car filter dropdown
            populateCarFilter();
            
            // Render bookings table
            renderBookings(filteredBookings);
            
            // Update dashboard statistics
            updateDashboardStats();
        } else {
            console.error('API returned error:', data.error);
            
            // Show error in table
            bookingsTableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center py-4">
                        <div class="text-danger">
                            <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                            <p>Failed to load bookings: ${data.error || 'Unknown error'}</p>
                            <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadBookings()">
                                <i class="fas fa-sync-alt me-1"></i> Try Again
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            showErrorMessage('Failed to load bookings: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        
        // Show error in table
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center py-4">
                    <div class="text-danger">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Error: ${error.message}</p>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadBookings()">
                            <i class="fas fa-sync-alt me-1"></i> Try Again
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        showErrorMessage('Failed to load bookings: ' + error.message);
    } finally {
        hideLoader();
    }
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
 * Apply filters to the bookings list
 */
function applyFilters() {
    const status = statusFilter.value;
    const dateRange = dateFilter.value;
    const carModel = carFilter.value;
    
    // Start with all bookings
    let filtered = [...allBookings];
    
    // Filter by status
    if (status) {
        filtered = filtered.filter(booking => booking.status === status);
    }
    
    // Filter by date range
    if (dateRange) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        filtered = filtered.filter(booking => {
            const bookingDate = new Date(booking.date_submitted || booking.created_at);
            
            switch (dateRange) {
                case 'today':
                    return bookingDate >= today;
                case 'week':
                    return bookingDate >= weekStart;
                case 'month':
                    return bookingDate >= monthStart;
                default:
                    return true;
            }
        });
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
        const pickupLocation = booking.pickup_location || booking.pickupLocation || '';
        const dropoffLocation = booking.dropoff_location || booking.dropoffLocation || '';
        
        // Extract date info
        const pickupDate = formatDate(booking.pickup_date || booking.pickupDate);
        const returnDate = formatDate(booking.return_date || booking.returnDate);
        
        // Calculate duration
        const duration = calculateDuration(booking.pickup_date || booking.pickupDate, booking.return_date || booking.returnDate);
        
        // Extract car info
        const carMake = booking.car_make || '';
        const carModel = booking.car_model || '';
        const car = carMake && carModel ? `${carMake} ${carModel}` : (booking.car_name || 'N/A');
        
        // Extract rate
        const dailyRate = booking.daily_rate || booking.dailyRate || 0;
        
        // Create table row with hover effect and pointer cursor
        const row = document.createElement('tr');
        row.className = 'booking-row';
        row.style.cursor = 'pointer';
        row.dataset.bookingId = booking.id || '';
        row.innerHTML = `
            <td>${booking.booking_reference || booking.bookingReference || booking.id || 'N/A'}</td>
            <td>${firstName}</td>
            <td>${lastName}</td>
            <td>${pickupLocation}</td>
            <td>${dropoffLocation}</td>
            <td>${pickupDate}</td>
            <td>${returnDate}</td>
            <td>${duration}</td>
            <td>${car}</td>
            <td>${formatCurrency(dailyRate)}</td>
            <td>
                <span class="booking-status ${getStatusClass(booking.status)}">
                    ${capitalizeFirstLetter(booking.status || 'pending')}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary view-details" data-booking-id="${booking.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        // Make the entire row clickable to view details (for better UX)
        row.addEventListener('click', (event) => {
            // Only trigger if not clicking the button itself (to avoid double click events)
            if (!event.target.closest('.view-details')) {
                showBookingDetails(booking);
            }
        });
        
        // Add specific click handler for the View Details button
        const viewButton = row.querySelector('.view-details');
        viewButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent row click from also firing
            showBookingDetails(booking);
        });
        
        bookingsTableBody.appendChild(row);
    });
    
    // Add hover effect style
    if (!document.getElementById('booking-row-style')) {
        const style = document.createElement('style');
        style.id = 'booking-row-style';
        style.textContent = `
            .booking-row:hover {
                background-color: rgba(52, 152, 219, 0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update total count
    bookingsCount.textContent = bookings.length;
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
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    
    return '€' + parseFloat(amount).toFixed(2);
}

/**
 * Get the CSS class for a booking status
 * @param {string} status - The booking status
 * @returns {string} - CSS class for the status
 */
function getStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'completed':
            return 'status-completed';
        case 'pending':
            return 'status-pending';
        case 'cancelled':
            return 'status-cancelled';
        default:
            return '';
    }
}

/**
 * Capitalize the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} - Capitalized string
 */
function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Show the booking details in a modal
 * @param {Object} booking - The booking to display
 */
function showBookingDetails(booking) {
    // Extract customer info
    const customer = booking.customer || {};
    const firstName = customer.firstName || booking.customer_first_name || '';
    const lastName = customer.lastName || booking.customer_last_name || '';
    const email = customer.email || booking.customer_email || '';
    const phone = customer.phone || booking.customer_phone || '';
    const age = customer.age || booking.customer_age || '';
    const license = customer.driverLicense || booking.driver_license || '';
    const licenseExpiration = formatDate(customer.licenseExpiration || booking.license_expiration);
    const country = customer.country || booking.country || '';
    
    // Extract booking details
    const pickupLocation = booking.pickup_location || booking.pickupLocation || '';
    const dropoffLocation = booking.dropoff_location || booking.dropoffLocation || '';
    const pickupDate = formatDate(booking.pickup_date || booking.pickupDate);
    const returnDate = formatDate(booking.return_date || booking.returnDate);
    const duration = calculateDuration(booking.pickup_date || booking.pickupDate, booking.return_date || booking.returnDate);
    
    // Extract car info
    const carMake = booking.car_make || '';
    const carModel = booking.car_model || '';
    const car = carMake && carModel ? `${carMake} ${carModel}` : (booking.car_name || 'N/A');
    
    // Extract pricing
    const dailyRate = booking.daily_rate || booking.dailyRate || 0;
    const totalPrice = booking.total_price || booking.totalPrice || 0;
    
    // Extract additional options
    const additionalDriver = booking.additional_driver || booking.additionalDriver || false;
    const fullInsurance = booking.full_insurance || booking.fullInsurance || false;
    const gpsNavigation = booking.gps_navigation || booking.gpsNavigation || false;
    const childSeat = booking.child_seat || booking.childSeat || false;
    const specialRequests = booking.special_requests || booking.specialRequests || '';
    
    // Create a status badge with appropriate color
    const statusClass = getStatusClass(booking.status);
    const statusBadgeColor = statusClass === 'status-completed' ? 'success' : 
                            statusClass === 'status-pending' ? 'warning' : 
                            statusClass === 'status-cancelled' ? 'danger' : 'primary';
    
    // Create modal content with improved formatting and layout
    bookingDetailsContent.innerHTML = `
        <div class="booking-details-header">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h4 class="mb-0">Booking #${booking.booking_reference || booking.bookingReference || booking.id}</h4>
                <span class="badge bg-${statusBadgeColor}">${capitalizeFirstLetter(booking.status || 'pending')}</span>
            </div>
            <div class="text-white-50">Created: ${formatDate(booking.date_submitted || booking.created_at || booking.timestamp)}</div>
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
                        <strong>Age:</strong> ${age}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Driver's License:</strong> ${license}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>License Expiration:</strong> ${licenseExpiration}
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Country:</strong> ${country}
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
            
            <!-- Add-ons and Extras -->
            <div class="detail-section">
                <h5 class="mb-3"><i class="fas fa-plus-circle me-2"></i>Add-ons and Extras</h5>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <strong>Additional Driver:</strong> 
                        <span class="badge bg-${additionalDriver ? 'success' : 'secondary'}">
                            ${additionalDriver ? '<i class="fas fa-check me-1"></i>Yes' : 'No'}
                        </span>
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Full Insurance:</strong> 
                        <span class="badge bg-${fullInsurance ? 'success' : 'secondary'}">
                            ${fullInsurance ? '<i class="fas fa-check me-1"></i>Yes' : 'No'}
                        </span>
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>GPS Navigation:</strong> 
                        <span class="badge bg-${gpsNavigation ? 'success' : 'secondary'}">
                            ${gpsNavigation ? '<i class="fas fa-check me-1"></i>Yes' : 'No'}
                        </span>
                    </div>
                    <div class="col-md-6 mb-2">
                        <strong>Child Seat:</strong> 
                        <span class="badge bg-${childSeat ? 'success' : 'secondary'}">
                            ${childSeat ? '<i class="fas fa-check me-1"></i>Yes' : 'No'}
                        </span>
                    </div>
                </div>
                
                <div class="mt-3">
                    <strong>Special Requests:</strong>
                    <p class="mb-0 mt-2 p-2 ${specialRequests ? 'bg-light rounded border' : ''}">${specialRequests || 'None'}</p>
                </div>
            </div>
            
            <!-- Booking Actions -->
            <div class="mt-3 text-end">
                <button class="btn btn-outline-secondary me-2" id="printBookingBtn">
                    <i class="fas fa-print me-1"></i> Print
                </button>
            </div>
        </div>
    `;
    
    // Store booking ID in the update button for later use
    updateStatusBtn.dataset.bookingId = booking.id;
    
    // Add click handler for the print button
    document.getElementById('printBookingBtn')?.addEventListener('click', () => {
        printBookingDetails(booking);
    });
    
    // Show the modal
    bookingDetailsModal.show();
}

/**
 * Print booking details
 * @param {Object} booking - The booking to print
 */
function printBookingDetails(booking) {
    // Create a print-friendly version of the booking details
    const printWindow = window.open('', '_blank');
    
    // Extract customer info
    const customer = booking.customer || {};
    const firstName = customer.firstName || booking.customer_first_name || '';
    const lastName = customer.lastName || booking.customer_last_name || '';
    const email = customer.email || booking.customer_email || '';
    const phone = customer.phone || booking.customer_phone || '';
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Booking #${booking.booking_reference || booking.bookingReference || booking.id} - Print</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #ddd;
                }
                .booking-id {
                    font-size: 18px;
                    font-weight: bold;
                }
                .logo {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .section {
                    margin-bottom: 25px;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid #eee;
                }
                .row {
                    display: flex;
                    flex-wrap: wrap;
                    margin-bottom: 15px;
                }
                .col {
                    flex: 0 0 50%;
                    margin-bottom: 5px;
                }
                .label {
                    font-weight: bold;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">Calma Car Rental</div>
                <div class="booking-id">Booking #${booking.booking_reference || booking.bookingReference || booking.id}</div>
                <div>Status: ${capitalizeFirstLetter(booking.status || 'pending')}</div>
                <div>Date: ${formatDate(booking.date_submitted || booking.created_at || booking.timestamp)}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Customer Information</div>
                <div class="row">
                    <div class="col">
                        <span class="label">Name:</span> ${firstName} ${lastName}
                    </div>
                    <div class="col">
                        <span class="label">Email:</span> ${email}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">Phone:</span> ${phone}
                    </div>
                    <div class="col">
                        <span class="label">Age:</span> ${customer.age || booking.customer_age || ''}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">Driver's License:</span> ${customer.driverLicense || booking.driver_license || ''}
                    </div>
                    <div class="col">
                        <span class="label">License Expiration:</span> ${formatDate(customer.licenseExpiration || booking.license_expiration)}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">Country:</span> ${customer.country || booking.country || ''}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Rental Details</div>
                <div class="row">
                    <div class="col">
                        <span class="label">Pickup Location:</span> ${booking.pickup_location || booking.pickupLocation || ''}
                    </div>
                    <div class="col">
                        <span class="label">Drop-off Location:</span> ${booking.dropoff_location || booking.dropoffLocation || ''}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">Pickup Date:</span> ${formatDate(booking.pickup_date || booking.pickupDate)}
                    </div>
                    <div class="col">
                        <span class="label">Return Date:</span> ${formatDate(booking.return_date || booking.returnDate)}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">Duration:</span> ${calculateDuration(booking.pickup_date || booking.pickupDate, booking.return_date || booking.returnDate)}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Car Details</div>
                <div class="row">
                    <div class="col">
                        <span class="label">Car:</span> ${booking.car_make || ''} ${booking.car_model || ''} ${booking.car_name || ''}
                    </div>
                    <div class="col">
                        <span class="label">Daily Rate:</span> €${parseFloat(booking.daily_rate || booking.dailyRate || 0).toFixed(2)}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">Total Price:</span> €${parseFloat(booking.total_price || booking.totalPrice || 0).toFixed(2)}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Add-ons and Extras</div>
                <div class="row">
                    <div class="col">
                        <span class="label">Additional Driver:</span> ${(booking.additional_driver || booking.additionalDriver) ? 'Yes' : 'No'}
                    </div>
                    <div class="col">
                        <span class="label">Full Insurance:</span> ${(booking.full_insurance || booking.fullInsurance) ? 'Yes' : 'No'}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">GPS Navigation:</span> ${(booking.gps_navigation || booking.gpsNavigation) ? 'Yes' : 'No'}
                    </div>
                    <div class="col">
                        <span class="label">Child Seat:</span> ${(booking.child_seat || booking.childSeat) ? 'Yes' : 'No'}
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <span class="label">Special Requests:</span>
                    <div style="margin-top: 5px;">${booking.special_requests || booking.specialRequests || 'None'}</div>
                </div>
            </div>
            
            <div class="footer" style="margin-top: 50px; text-align: center; font-size: 12px;">
                <p>This is an automatically generated booking confirmation from Calma Car Rental.</p>
                <p>If you have any questions, please contact us at support@calmacarrental.com</p>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Print this page</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    // Print after the content is loaded
    printWindow.addEventListener('load', () => {
        setTimeout(() => {
            printWindow.print();
        }, 500);
    });
}

/**
 * Update the status of a booking
 */
function updateBookingStatus() {
    const bookingId = updateStatusBtn.dataset.bookingId;
    
    // This would typically open another modal to select the new status
    // For simplicity, we'll just use a prompt
    const newStatus = prompt('Enter new status (pending, confirmed, completed, cancelled):');
    
    if (!newStatus) return;
    
    showLoader();
    
    // Update the booking status via API
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
            // Redirect to login page if authentication fails
            localStorage.removeItem('adminToken');
            window.location.href = 'admin-login.html';
            throw new Error('Authentication failed. Please log in again.');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Close the modal
            bookingDetailsModal.hide();
            
            // Reload bookings to get updated data
            loadBookings();
            
            alert('Booking status updated successfully!');
        } else {
            alert('Failed to update booking status: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error updating booking status:', error);
        alert(error.message || 'Failed to update booking status. Check console for details.');
    })
    .finally(() => {
        hideLoader();
    });
}

/**
 * Update the dashboard statistics
 */
function updateDashboardStats() {
    // Total bookings count
    totalBookings.textContent = allBookings.length;
    
    // Calculate total revenue
    const revenue = allBookings.reduce((total, booking) => {
        const price = parseFloat(booking.total_price || booking.totalPrice || 0);
        return total + price;
    }, 0);
    
    totalRevenue.textContent = formatCurrency(revenue);
    
    // Count bookings made today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.date_submitted || booking.created_at || booking.timestamp);
        return bookingDate >= today;
    });
    
    carsBookedToday.textContent = todayBookings.length;
}

/**
 * Show an error message to the user
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
    alert(message);
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