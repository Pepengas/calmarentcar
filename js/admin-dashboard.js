/**
 * Admin Dashboard JavaScript
 * Handles displaying and managing bookings in the admin dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the admin dashboard
    AdminDashboard.init();
});

const AdminDashboard = {
    // Bookings data
    bookings: [],
    
    // Filtered bookings
    filteredBookings: [],
    
    // Current filter/search settings
    filters: {
        status: 'all',
        search: '',
        dateRange: 'all'
    },
    
    // DOM Elements
    elements: {},
    
    /**
     * Initialize the admin dashboard
     */
    init: function() {
        this.loadBookings();
        this.cacheElements();
        this.bindEvents();
        this.updateDashboardStats();
        this.applyFilters();
    },
    
    /**
     * Load bookings from localStorage
     */
    loadBookings: function() {
        try {
            // Get bookings from localStorage
            const storedBookings = localStorage.getItem('adminBookings');
            this.bookings = storedBookings ? JSON.parse(storedBookings) : [];
            this.filteredBookings = [...this.bookings];
            
            console.log(`Loaded ${this.bookings.length} bookings`);
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.bookings = [];
            this.filteredBookings = [];
        }
    },
    
    /**
     * Cache DOM elements
     */
    cacheElements: function() {
        // Stats elements
        this.elements.totalBookingsValue = document.getElementById('total-bookings-value');
        this.elements.newBookingsValue = document.getElementById('new-bookings-value');
        this.elements.pendingBookingsValue = document.getElementById('pending-bookings-value');
        this.elements.confirmedBookingsValue = document.getElementById('confirmed-bookings-value');
        
        // Filters
        this.elements.searchInput = document.getElementById('booking-search');
        this.elements.statusFilter = document.getElementById('status-filter');
        this.elements.dateFilter = document.getElementById('date-filter');
        
        // Bookings table
        this.elements.bookingsTableBody = document.getElementById('bookings-table-body');
        this.elements.noBookingsMessage = document.getElementById('no-bookings-message');
        
        // Booking details modal
        this.elements.bookingModal = document.getElementById('booking-modal');
        this.elements.bookingModalContent = document.getElementById('booking-modal-content');
        this.elements.closeModalBtn = document.querySelector('.close-modal');
        
        // Refresh data button
        this.elements.refreshDataBtn = document.getElementById('refresh-data-btn');
    },
    
    /**
     * Bind event listeners
     */
    bindEvents: function() {
        // Search input
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
        
        // Status filter
        if (this.elements.statusFilter) {
            this.elements.statusFilter.addEventListener('change', this.handleStatusFilter.bind(this));
        }
        
        // Date filter
        if (this.elements.dateFilter) {
            this.elements.dateFilter.addEventListener('change', this.handleDateFilter.bind(this));
        }
        
        // Modal close button
        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener('click', this.closeBookingModal.bind(this));
        }
        
        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.bookingModal) {
                this.closeBookingModal();
            }
        });
        
        // Refresh data button
        if (this.elements.refreshDataBtn) {
            this.elements.refreshDataBtn.addEventListener('click', this.refreshData.bind(this));
        }
        
        // Setup session timeout
        this.setupSessionTimeout();
        
        // Add event listeners to reset the timeout on user activity
        ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, this.resetSessionTimeout.bind(this));
        });
    },
    
    /**
     * Setup session timeout
     */
    setupSessionTimeout: function() {
        this.sessionTimeoutDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.resetSessionTimeout();
    },
    
    /**
     * Reset session timeout
     */
    resetSessionTimeout: function() {
        // Clear any existing timeout
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }
        
        // Set a new timeout
        this.sessionTimeout = setTimeout(() => {
            // Check if user is logged in
            if (localStorage.getItem('adminLoggedIn') === 'true') {
                // Log the user out
                this.logoutUser();
            }
        }, this.sessionTimeoutDuration);
    },
    
    /**
     * Logout user
     */
    logoutUser: function() {
        localStorage.removeItem('adminLoggedIn');
        window.location.href = 'admin-login.html';
    },
    
    /**
     * Refresh data from localStorage
     */
    refreshData: function() {
        // Show loading indicator if available
        if (this.elements.refreshDataBtn) {
            this.elements.refreshDataBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            this.elements.refreshDataBtn.disabled = true;
        }
        
        // Reload bookings from localStorage
        this.loadBookings();
        
        // Update UI
        this.updateDashboardStats();
        this.applyFilters();
        
        // Restore button text after a short delay
        setTimeout(() => {
            if (this.elements.refreshDataBtn) {
                this.elements.refreshDataBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
                this.elements.refreshDataBtn.disabled = false;
            }
        }, 800);
    },
    
    /**
     * Update dashboard statistics
     */
    updateDashboardStats: function() {
        // Count bookings by status
        const totalBookings = this.bookings.length;
        const newBookings = this.bookings.filter(b => b.status === 'new').length;
        const pendingBookings = this.bookings.filter(b => b.status === 'pending').length;
        const confirmedBookings = this.bookings.filter(b => b.status === 'confirmed').length;
        
        // Update stats display
        if (this.elements.totalBookingsValue) {
            this.elements.totalBookingsValue.textContent = totalBookings;
        }
        
        if (this.elements.newBookingsValue) {
            this.elements.newBookingsValue.textContent = newBookings;
        }
        
        if (this.elements.pendingBookingsValue) {
            this.elements.pendingBookingsValue.textContent = pendingBookings;
        }
        
        if (this.elements.confirmedBookingsValue) {
            this.elements.confirmedBookingsValue.textContent = confirmedBookings;
        }
    },
    
    /**
     * Handle search input
     */
    handleSearch: function(e) {
        this.filters.search = e.target.value.toLowerCase().trim();
        this.applyFilters();
    },
    
    /**
     * Handle status filter change
     */
    handleStatusFilter: function(e) {
        this.filters.status = e.target.value;
        this.applyFilters();
    },
    
    /**
     * Handle date filter change
     */
    handleDateFilter: function(e) {
        this.filters.dateRange = e.target.value;
        this.applyFilters();
    },
    
    /**
     * Apply all filters to bookings
     */
    applyFilters: function() {
        // Start with all bookings
        let filtered = [...this.bookings];
        
        // Apply status filter
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(booking => booking.status === this.filters.status);
        }
        
        // Apply search filter (search by name, email, booking reference)
        if (this.filters.search) {
            filtered = filtered.filter(booking => {
                const searchTerm = this.filters.search.toLowerCase();
                const customerName = booking.customer ? 
                    `${booking.customer.firstName} ${booking.customer.lastName}`.toLowerCase() : '';
                const customerEmail = booking.customer ? booking.customer.email.toLowerCase() : '';
                const bookingRef = booking.bookingReference ? booking.bookingReference.toLowerCase() : '';
                const carModel = booking.selectedCar ? 
                    `${booking.selectedCar.make} ${booking.selectedCar.model}`.toLowerCase() : '';
                
                return customerName.includes(searchTerm) || 
                       customerEmail.includes(searchTerm) || 
                       bookingRef.includes(searchTerm) ||
                       carModel.includes(searchTerm);
            });
        }
        
        // Apply date filter
        if (this.filters.dateRange !== 'all') {
            const now = new Date();
            
            filtered = filtered.filter(booking => {
                const bookingDate = new Date(booking.timestamp || booking.dateSubmitted);
                
                switch(this.filters.dateRange) {
                    case 'today':
                        return this.isSameDay(bookingDate, now);
                    case 'yesterday':
                        const yesterday = new Date(now);
                        yesterday.setDate(now.getDate() - 1);
                        return this.isSameDay(bookingDate, yesterday);
                    case 'week':
                        const weekAgo = new Date(now);
                        weekAgo.setDate(now.getDate() - 7);
                        return bookingDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now);
                        monthAgo.setMonth(now.getMonth() - 1);
                        return bookingDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }
        
        // Update filtered bookings
        this.filteredBookings = filtered;
        
        // Render bookings table
        this.renderBookingsTable();
    },
    
    /**
     * Check if two dates are the same day
     */
    isSameDay: function(date1, date2) {
        return date1.getDate() === date2.getDate() && 
               date1.getMonth() === date2.getMonth() && 
               date1.getFullYear() === date2.getFullYear();
    },
    
    /**
     * Render bookings table
     */
    renderBookingsTable: function() {
        if (!this.elements.bookingsTableBody) return;
        
        // Clear table
        this.elements.bookingsTableBody.innerHTML = '';
        
        // Show/hide no bookings message
        if (this.filteredBookings.length === 0) {
            if (this.elements.noBookingsMessage) {
                this.elements.noBookingsMessage.style.display = 'block';
            }
            return;
        } else {
            if (this.elements.noBookingsMessage) {
                this.elements.noBookingsMessage.style.display = 'none';
            }
        }
        
        // Add bookings to table
        this.filteredBookings.forEach(booking => {
            const row = document.createElement('tr');
            
            // Format date
            const bookingDate = new Date(booking.timestamp || booking.dateSubmitted);
            const formattedDate = bookingDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Format customer name
            const customerName = booking.customer ? 
                `${booking.customer.firstName} ${booking.customer.lastName}` : 'N/A';
            
            // Format car
            const carName = booking.selectedCar ? 
                `${booking.selectedCar.make} ${booking.selectedCar.model}` : 'N/A';
            
            // Format rental dates
            const pickupDate = booking.pickupDate ? 
                new Date(booking.pickupDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                }) : 'N/A';
            
            const returnDate = booking.returnDate ? 
                new Date(booking.returnDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                }) : 'N/A';
            
            // Format amount
            const amount = booking.totalPrice ? 
                `€${booking.totalPrice.toFixed(2)}` : 'N/A';
            
            // Create row HTML
            row.innerHTML = `
                <td>${booking.bookingReference || 'N/A'}</td>
                <td>${formattedDate}</td>
                <td>${customerName}</td>
                <td>${carName}</td>
                <td>${pickupDate} - ${returnDate}</td>
                <td>${amount}</td>
                <td>
                    <span class="status-badge ${booking.status}">
                        ${this.formatStatus(booking.status)}
                    </span>
                </td>
                <td>
                    <button class="action-btn view-btn" data-booking-id="${booking.bookingReference}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" data-booking-id="${booking.bookingReference}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            
            // Add event listeners to action buttons
            const viewBtn = row.querySelector('.view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => this.viewBookingDetails(booking));
            }
            
            const editBtn = row.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => this.editBookingStatus(booking));
            }
            
            // Add row to table
            this.elements.bookingsTableBody.appendChild(row);
        });
    },
    
    /**
     * Format booking status for display
     */
    formatStatus: function(status) {
        switch (status) {
            case 'new':
                return 'New';
            case 'pending':
                return 'Pending';
            case 'confirmed':
                return 'Confirmed';
            case 'completed':
                return 'Completed';
            case 'cancelled':
                return 'Cancelled';
            default:
                return 'Unknown';
        }
    },
    
    /**
     * View booking details
     */
    viewBookingDetails: function(booking) {
        if (!this.elements.bookingModal || !this.elements.bookingModalContent) return;
        
        // Get customer and car details
        const customer = booking.customer || {};
        const car = booking.selectedCar || {};
        
        // Format dates
        const pickupDate = booking.pickupDate ? 
            new Date(booking.pickupDate).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';
        
        const returnDate = booking.returnDate ? 
            new Date(booking.returnDate).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';
        
        // Build additional options list with prices
        let additionalOptions = 'None';
        let additionalOptionsHTML = '';
        
        if (customer.additionalOptions) {
            const options = [];
            let hasOptions = false;
            
            if (customer.additionalOptions.additionalDriver) {
                options.push('Additional Driver (+€15/day)');
                additionalOptionsHTML += `
                    <div class="detail-item">
                        <span class="detail-label">Additional Driver:</span>
                        <span class="detail-value">Yes (+€15/day)</span>
                    </div>
                `;
                hasOptions = true;
            }
            
            if (customer.additionalOptions.fullInsurance) {
                options.push('Full Insurance (+€25/day)');
                additionalOptionsHTML += `
                    <div class="detail-item">
                        <span class="detail-label">Full Insurance:</span>
                        <span class="detail-value">Yes (+€25/day)</span>
                    </div>
                `;
                hasOptions = true;
            }
            
            if (customer.additionalOptions.gpsNavigation) {
                options.push('GPS Navigation (+€8/day)');
                additionalOptionsHTML += `
                    <div class="detail-item">
                        <span class="detail-label">GPS Navigation:</span>
                        <span class="detail-value">Yes (+€8/day)</span>
                    </div>
                `;
                hasOptions = true;
            }
            
            if (customer.additionalOptions.childSeat) {
                options.push('Child Seat (+€5/day)');
                additionalOptionsHTML += `
                    <div class="detail-item">
                        <span class="detail-label">Child Seat:</span>
                        <span class="detail-value">Yes (+€5/day)</span>
                    </div>
                `;
                hasOptions = true;
            }
            
            if (options.length > 0) {
                additionalOptions = options.join(', ');
            }
            
            if (!hasOptions) {
                additionalOptionsHTML = `
                    <div class="detail-item">
                        <span class="detail-label">Additional Options:</span>
                        <span class="detail-value">None selected</span>
                    </div>
                `;
            }
        } else {
            additionalOptionsHTML = `
                <div class="detail-item">
                    <span class="detail-label">Additional Options:</span>
                    <span class="detail-value">None selected</span>
                </div>
            `;
        }
        
        // Special requests
        const specialRequests = customer.specialRequests || booking.specialRequests || '';
        const specialRequestsHTML = `
            <div class="detail-item">
                <span class="detail-label">Special Requests:</span>
                <span class="detail-value">${specialRequests ? specialRequests : 'None'}</span>
            </div>
        `;
        
        // Create modal content
        this.elements.bookingModalContent.innerHTML = `
            <h2>Booking Details</h2>
            <div class="booking-detail-header">
                <div>
                    <span class="status-badge large ${booking.status}">
                        ${this.formatStatus(booking.status)}
                    </span>
                    <div class="booking-reference">
                        Reference: ${booking.bookingReference || 'N/A'}
                    </div>
                </div>
                <div class="status-actions">
                    <div class="form-group">
                        <label for="modal-status">Update Status:</label>
                        <select id="modal-status" class="status-select">
                            <option value="new" ${booking.status === 'new' ? 'selected' : ''}>New</option>
                            <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    <button id="update-status-btn" class="btn btn-primary">Update</button>
                </div>
            </div>
            
            <div class="booking-details-grid">
                <div class="booking-detail-section">
                    <h3>Customer Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${customer.firstName || ''} ${customer.lastName || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${customer.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${customer.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Age:</span>
                        <span class="detail-value">${customer.age || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Nationality:</span>
                        <span class="detail-value">${customer.nationality || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Driver's License:</span>
                        <span class="detail-value">${customer.driverLicense || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">License Expiry:</span>
                        <span class="detail-value">${customer.licenseExpiry || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="booking-detail-section">
                    <h3>Rental Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Pickup Location:</span>
                        <span class="detail-value">${this.getLocationName(booking.pickupLocation) || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pickup Date:</span>
                        <span class="detail-value">${pickupDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Return Location:</span>
                        <span class="detail-value">${this.getLocationName(booking.dropoffLocation) || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Return Date:</span>
                        <span class="detail-value">${returnDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">${booking.durationDays || 1} days</span>
                    </div>
                    
                    <h3>Additional Services</h3>
                    ${additionalOptionsHTML}
                    ${specialRequestsHTML}
                </div>
                
                <div class="booking-detail-section">
                    <h3>Vehicle Information</h3>
                    <div class="car-detail">
                        ${car.image ? `<img src="${car.image}" alt="${car.make} ${car.model}" class="car-image">` : ''}
                        <div>
                            <div class="detail-item">
                                <span class="detail-label">Vehicle:</span>
                                <span class="detail-value">${car.make || ''} ${car.model || ''}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Category:</span>
                                <span class="detail-value">${car.category || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Group:</span>
                                <span class="detail-value">${car.group || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <h3>Payment Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Daily Rate:</span>
                        <span class="detail-value">€${car.price ? car.price.toFixed(2) : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Amount:</span>
                        <span class="detail-value">€${booking.totalPrice ? booking.totalPrice.toFixed(2) : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Payment Status:</span>
                        <span class="detail-value">To be paid at pickup</span>
                    </div>
                </div>
            </div>
            
            <div class="modal-actions">
                <button id="print-booking-btn" class="btn btn-secondary">Print Details</button>
                <button id="close-modal-btn" class="btn btn-primary">Close</button>
            </div>
        `;
        
        // Add event listeners to modal buttons
        const updateStatusBtn = document.getElementById('update-status-btn');
        if (updateStatusBtn) {
            updateStatusBtn.addEventListener('click', () => {
                const statusSelect = document.getElementById('modal-status');
                if (statusSelect) {
                    this.updateBookingStatus(booking.bookingReference, statusSelect.value);
                }
            });
        }
        
        const printBookingBtn = document.getElementById('print-booking-btn');
        if (printBookingBtn) {
            printBookingBtn.addEventListener('click', () => {
                window.print();
            });
        }
        
        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', this.closeBookingModal.bind(this));
        }
        
        // Show modal
        this.elements.bookingModal.style.display = 'block';
    },
    
    /**
     * Edit booking status directly from table
     */
    editBookingStatus: function(booking) {
        const newStatus = prompt(
            `Current status: ${this.formatStatus(booking.status)}\n\nEnter new status (new, pending, confirmed, completed, cancelled):`,
            booking.status
        );
        
        if (newStatus && ['new', 'pending', 'confirmed', 'completed', 'cancelled'].includes(newStatus)) {
            this.updateBookingStatus(booking.bookingReference, newStatus);
        }
    },
    
    /**
     * Update booking status in localStorage and UI
     */
    updateBookingStatus: function(bookingRef, newStatus) {
        // Find booking index
        const bookingIndex = this.bookings.findIndex(b => b.bookingReference === bookingRef);
        
        if (bookingIndex >= 0) {
            // Update status
            this.bookings[bookingIndex].status = newStatus;
            
            // Save to localStorage
            localStorage.setItem('adminBookings', JSON.stringify(this.bookings));
            
            // Update UI
            this.updateDashboardStats();
            this.applyFilters();
            
            // Close modal
            this.closeBookingModal();
            
            // Show success message
            alert(`Booking status updated to: ${this.formatStatus(newStatus)}`);
        }
    },
    
    /**
     * Close booking details modal
     */
    closeBookingModal: function() {
        if (this.elements.bookingModal) {
            this.elements.bookingModal.style.display = 'none';
        }
    },
    
    /**
     * Get location name
     */
    getLocationName: function(locationCode) {
        if (!locationCode) return 'Not specified';
        
        const locations = {
            'airport': 'Chania International Airport',
            'port': 'Chania Port',
            'city': 'Chania City Center',
            'hotel': 'Hotel/Villa in Chania'
        };
        return locations[locationCode] || locationCode;
    }
}; 