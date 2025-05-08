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
        const headers = {};
        if (API_TOKEN) {
            headers['Authorization'] = `Bearer ${API_TOKEN}`;
        } else {
            console.warn('[Admin] loadBookings: API_TOKEN is missing. User might not be authenticated.');
            // Optionally redirect or show an error immediately
            // window.location.href = 'admin-login.html';
            // return;
        }

        console.log('[Admin] loadBookings: Fetching from /api/admin/bookings with headers:', headers);
        const response = await fetch('/api/admin/bookings', {
            headers: headers
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

    if (!bookingsTableBody) {
        console.error("[Admin] renderBookings: bookingsTableBody element not found in DOM. Cannot render.");
        return;
    }

    if (!bookings || bookings.length === 0) {
        console.info('[Admin] renderBookings: No bookings to display or bookings array is empty.');
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center py-5">
                    <div class="my-4">
                        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                        <p class="mb-2">No bookings found</p>
                        <p class="text-muted small">Try changing your filter criteria or add new bookings. If you just added a booking, it might take a moment to appear.</p>
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
        console.log(`[Admin] renderBookings: Processing booking ${index + 1}:`, JSON.parse(JSON.stringify(booking))); // Log a deep copy

        const customer = booking.customer || {};
        // Fallback for customer names if not nested
        const firstName = customer.firstName || booking.customer_first_name || 'N/A';
        const lastName = customer.lastName || booking.customer_last_name || '';
        const customerName = `${firstName} ${lastName}`.trim();

        const carName = (booking.car_make && booking.car_model) ? `${booking.car_make} ${booking.car_model}` : 'N/A';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.booking_reference || booking.id || 'N/A'}</td>
            <td>
                <div>${customerName}</div>
                <small class="text-muted">${customer.email || booking.customer_email || 'N/A'}</small>
            </td>
            <td>${carName}</td>
            <td>${formatDate(booking.pickup_date)}</td>
            <td>${formatDate(booking.return_date)}</td>
            <td>${formatCurrency(booking.total_price)}</td>
            <td><span class="booking-status ${getStatusClass(booking.status)}">${booking.status || 'N/A'}</span></td>
            <td>${formatDate(booking.date_submitted)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1 view-details-btn" title="View Details" data-booking-id="${booking.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary edit-status-btn" title="Edit Status" data-booking-id="${booking.id}" data-current-status="${booking.status}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        bookingsTableBody.appendChild(row);
    });
    console.log('[Admin] renderBookings: Finished rendering all bookings.');

    if (bookingsCount) bookingsCount.textContent = bookings.length;

    // Re-attach event listeners for view/edit buttons if necessary, or use event delegation
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
    console.log('[Admin] attachActionListeners: Event listeners for action buttons re-attached.');
}

function handleViewDetailsClick(event) {
    const bookingId = event.currentTarget.dataset.bookingId;
    console.log(`[Admin] handleViewDetailsClick: View details for booking ID: ${bookingId}`);
    const booking = allBookings.find(b => b.id.toString() === bookingId.toString());
    if (booking) {
        showBookingDetails(booking);
    } else {
        console.error(`[Admin] handleViewDetailsClick: Booking with ID ${bookingId} not found in allBookings.`);
        showErrorMessage('Could not find booking details.');
    }
}

function handleEditStatusClick(event) {
    const bookingId = event.currentTarget.dataset.bookingId;
    const currentStatus = event.currentTarget.dataset.currentStatus;
    console.log(`[Admin] handleEditStatusClick: Edit status for booking ID: ${bookingId}, current status: ${currentStatus}`);
    // Store booking ID for the modal
    updateStatusBtn.dataset.bookingId = bookingId; 
    // Pre-select current status in a dropdown (assuming you add a status dropdown to your modal)
    // For now, we'll just open the modal. You'll need to implement the status update UI in the modal.
    // Example: document.getElementById('modalStatusSelect').value = currentStatus;
    
    // This part needs to be tied to your booking details modal, specifically if you want to edit status there.
    // For simplicity, let's assume `bookingDetailsModal` is also used for status updates for now,
    // or you might have a separate modal.
    // If using the same modal, you might want to show/hide parts of it.
    const booking = allBookings.find(b => b.id.toString() === bookingId.toString());
     if (booking) {
        // Populate some identifier in the modal or a title
        const modalTitle = document.getElementById('bookingDetailsModalLabel'); // Assuming your modal has a title with this ID
        if(modalTitle) modalTitle.textContent = `Update Status for Booking: ${booking.booking_reference || booking.id}`;
        
        // You'd typically have a form in your modal for status update.
        // For this example, we're just setting the bookingId on the update button
        // and showing the modal.
        bookingDetailsModal.show();
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

       