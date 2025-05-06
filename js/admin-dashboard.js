/**
 * Calma Car Rental Admin Dashboard
 * Main JavaScript file for handling the admin interface,
 * loading bookings from localStorage, and managing the UI
 */

// Main AdminDashboard object
const AdminDashboard = {
    // Store bookings data
    bookings: [],
    
    // Store filtered bookings
    filteredBookings: [],
    
    // Filter settings
    filters: {
        search: '',
        status: 'all',
        dateRange: 'all'
    },
    
    // Admin credentials - would be better in a backend system
    credentials: {
        username: 'admin',
        password: 'admin123'
    },
    
    // Auto refresh interval in milliseconds (30 seconds)
    autoRefreshInterval: 30000,
    
    // Session timeout in milliseconds (10 minutes)
    sessionTimeout: 10 * 60 * 1000,
    
    // Initialize the dashboard
    init: function() {
        console.log('Initializing Admin Dashboard...');
        
        // Check if user is logged in
        this.checkLoginStatus();
        
        // Add event listeners
        this.addEventListeners();
        
        // Setup auto-refresh
        this.setupAutoRefresh();
        
        // Setup session timeout
        this.setupSessionTimeout();
        
        console.log('Admin Dashboard initialized');
    },
    
    // Check if user is logged in
    checkLoginStatus: function() {
        const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        const loginContainer = document.getElementById('login-container');
        const dashboardContainer = document.getElementById('dashboard-container');
        
        if (isLoggedIn) {
            // Show dashboard
            if (loginContainer) loginContainer.style.display = 'none';
            if (dashboardContainer) dashboardContainer.style.display = 'block';
            
            // Load data
            this.loadBookings();
            this.updateDashboardStats();
            this.renderBookings();
        } else {
            // Show login form
            if (loginContainer) loginContainer.style.display = 'block';
            if (dashboardContainer) dashboardContainer.style.display = 'none';
        }
    },
    
    // Add event listeners
    addEventListeners: function() {
        // Login button
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', this.handleLogin.bind(this));
        }
        
        // Login inputs - add enter key support
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput) {
            usernameInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
        
        // Logout button
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', this.handleLogout.bind(this));
        }
        
        // Refresh button
        const refreshButton = document.getElementById('refresh-btn');
        if (refreshButton) {
            refreshButton.addEventListener('click', this.refreshData.bind(this));
        }
        
        // Search input and button
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
            
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.applyFilters();
            });
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', this.applyFilters.bind(this));
        }
        
        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }
        
        // Date filter
        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value;
                this.applyFilters();
            });
        }
        
        // Modal close buttons
        const modalCloseButtons = document.querySelectorAll('.modal-close, #modal-close-btn');
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', this.closeModal.bind(this));
        });
        
        // Modal status update button
        const statusUpdateButton = document.getElementById('modal-status-btn');
        if (statusUpdateButton) {
            statusUpdateButton.addEventListener('click', this.showStatusUpdateDialog.bind(this));
        }
        
        // Modal delete button
        const deleteButton = document.getElementById('modal-delete-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', this.showDeleteConfirmation.bind(this));
        }
        
        // Close modal when clicking outside
        const modal = document.getElementById('booking-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
        
        // Reset session timeout on user activity
        const events = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, this.resetSessionTimeout.bind(this));
        });
    },
    
    // Handle login
    handleLogin: function() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('login-error');
        
        if (username === this.credentials.username && password === this.credentials.password) {
            // Set login status
            localStorage.setItem('adminLoggedIn', 'true');
            
            // Show dashboard
            this.checkLoginStatus();
            
            // Reset form
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            if (loginError) loginError.textContent = '';
            
            // Show success notification
            this.showNotification('Login successful. Welcome to the admin dashboard!', 'success');
        } else {
            // Show error
            if (loginError) loginError.textContent = 'Invalid username or password. Please try again.';
        }
    },
    
    // Handle logout
    handleLogout: function() {
        // Clear login status
        localStorage.removeItem('adminLoggedIn');
        
        // Clear any existing session timeout
        if (this.sessionTimeoutId) {
            clearTimeout(this.sessionTimeoutId);
        }
        
        // Clear auto-refresh
        if (this.autoRefreshId) {
            clearInterval(this.autoRefreshId);
        }
        
        // Show login form
        this.checkLoginStatus();
        
        // Show notification
        this.showNotification('You have been logged out successfully.', 'info');
    },
    
    // Setup session timeout
    setupSessionTimeout: function() {
        this.resetSessionTimeout();
    },
    
    // Reset session timeout
    resetSessionTimeout: function() {
        // Clear existing timeout
        if (this.sessionTimeoutId) {
            clearTimeout(this.sessionTimeoutId);
        }
        
        // Set new timeout
        this.sessionTimeoutId = setTimeout(() => {
            if (localStorage.getItem('adminLoggedIn') === 'true') {
                this.handleLogout();
                this.showNotification('Your session has expired. Please log in again.', 'info');
            }
        }, this.sessionTimeout);
    },
    
    // Setup auto-refresh
    setupAutoRefresh: function() {
        // Clear existing interval
        if (this.autoRefreshId) {
            clearInterval(this.autoRefreshId);
        }
        
        // Set new interval
        this.autoRefreshId = setInterval(() => {
            if (localStorage.getItem('adminLoggedIn') === 'true') {
                console.log('Auto-refreshing data...');
                this.loadBookings();
                this.updateDashboardStats();
                this.renderBookings();
            }
        }, this.autoRefreshInterval);
        
        console.log(`Auto-refresh set to ${this.autoRefreshInterval / 1000} seconds`);
    },
    
    // Load bookings from API
    loadBookings: function() {
        try {
            console.log('Loading bookings from API...');
            
            // Determine the API URL based on environment
            const apiUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/api/bookings' 
                : '/api/bookings';
            
            // Fetch bookings from API
            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`API error: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(apiBookings => {
                    console.log(`Loaded ${apiBookings.length} bookings from API`);
                    
                    // Process bookings data from API
                    const bookings = apiBookings.map(apiBooking => {
                        // If the booking came with a complete booking_data object, use that
                        if (apiBooking.booking_data) {
                            return apiBooking.booking_data;
                        }
                        
                        // Otherwise, construct a booking object from the database fields
                        return {
                            bookingReference: apiBooking.booking_reference,
                            customer: {
                                firstName: apiBooking.customer_first_name,
                                lastName: apiBooking.customer_last_name,
                                email: apiBooking.customer_email,
                                phone: apiBooking.customer_phone
                            },
                            selectedCar: {
                                make: apiBooking.car_make,
                                model: apiBooking.car_model
                            },
                            pickupDate: apiBooking.pickup_date,
                            returnDate: apiBooking.return_date,
                            pickupLocation: apiBooking.pickup_location,
                            dropoffLocation: apiBooking.dropoff_location,
                            status: apiBooking.status,
                            totalPrice: apiBooking.total_price,
                            paymentDate: apiBooking.payment_date,
                            dateSubmitted: apiBooking.date_submitted
                        };
                    });
                    
                    // Set bookings array
                    this.bookings = bookings;
                    
                    // Update filtered bookings
                    this.applyFilters();
                    
                    // Update dashboard stats
                    this.updateDashboardStats();
                })
                .catch(error => {
                    console.error('Error loading bookings from API:', error);
                    
                    // Fallback to localStorage if API fails
                    this.loadBookingsFromLocalStorage();
                    
                    // Show notification
                    this.showNotification('Error loading bookings from server. Using local data instead.', 'error');
                });
        } catch (error) {
            console.error('Error in loadBookings function:', error);
            
            // Fallback to localStorage
            this.loadBookingsFromLocalStorage();
            
            // Show notification
            this.showNotification('Error loading bookings. Using local data as fallback.', 'error');
        }
    },
    
    // Fallback function to load bookings from localStorage
    loadBookingsFromLocalStorage: function() {
        try {
            console.log('Loading bookings from localStorage (fallback)...');
            
            // Get bookings from localStorage
            const bookingsData = localStorage.getItem('adminBookings');
            let bookings = [];
            
            if (bookingsData) {
                // Parse bookings data
                bookings = JSON.parse(bookingsData);
                console.log(`Loaded ${bookings.length} bookings from localStorage`);
            } else {
                console.log('No adminBookings found in localStorage');
            }
            
            // Also check for individual booking_* entries and add them
            const backupBookings = this.loadBackupBookings();
            if (backupBookings.length > 0) {
                console.log(`Found ${backupBookings.length} individual booking entries`);
                
                // Merge with main bookings, avoiding duplicates
                backupBookings.forEach(backup => {
                    const exists = bookings.some(b => b.bookingReference === backup.bookingReference);
                    if (!exists) {
                        bookings.push(backup);
                        console.log(`Added booking ${backup.bookingReference} from individual storage`);
                    }
                });
            }
            
            if (bookings.length === 0) {
                console.log('No bookings found in any storage location');
                this.bookings = [];
                this.filteredBookings = [];
                return;
            }
            
            // Sort bookings by date (newest first)
            bookings.sort((a, b) => {
                const dateA = new Date(a.dateSubmitted || a.timestamp || 0);
                const dateB = new Date(b.dateSubmitted || b.timestamp || 0);
                return dateB - dateA;
            });
            
            // Update bookings array
            this.bookings = bookings;
            console.log(`Total bookings from localStorage: ${this.bookings.length}`);
            
            // Update filtered bookings
            this.applyFilters();
            
            // Update dashboard stats
            this.updateDashboardStats();
        } catch (error) {
            console.error('Error loading bookings from localStorage:', error);
            this.showNotification('Error loading bookings. Please try refreshing.', 'error');
            this.bookings = [];
            this.filteredBookings = [];
        }
    },
    
    // Load backup bookings from individual localStorage entries
    loadBackupBookings: function() {
        const backupBookings = [];
        
        try {
            // Get all localStorage keys
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                keys.push(localStorage.key(i));
            }
            
            // Filter booking_* keys
            const bookingKeys = keys.filter(key => key.startsWith('booking_'));
            
            // Process each booking
            bookingKeys.forEach(key => {
                try {
                    const bookingData = JSON.parse(localStorage.getItem(key));
                    if (bookingData && bookingData.bookingReference) {
                        backupBookings.push(bookingData);
                    }
                } catch (e) {
                    console.error(`Error parsing backup booking ${key}:`, e);
                }
            });
        } catch (e) {
            console.error('Error loading backup bookings:', e);
        }
        
        return backupBookings;
    },
    
    // Apply filters to bookings
    applyFilters: function() {
        console.log('Applying filters...');
        console.log('Filters:', this.filters);
        
        // Start with all bookings
        let filtered = [...this.bookings];
        
        // Apply search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(booking => {
                const customer = booking.customer || {};
                const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
                const customerEmail = (customer.email || '').toLowerCase();
                const bookingId = (booking.bookingReference || '').toLowerCase();
                const carDetails = booking.selectedCar ? 
                    `${booking.selectedCar.make || ''} ${booking.selectedCar.model || ''}`.toLowerCase() : '';
                
                return customerName.includes(searchTerm) ||
                       customerEmail.includes(searchTerm) ||
                       bookingId.includes(searchTerm) ||
                       carDetails.includes(searchTerm);
            });
        }
        
        // Apply status filter
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(booking => 
                (booking.status || '').toLowerCase() === this.filters.status.toLowerCase()
            );
        }
        
        // Apply date filter
        if (this.filters.dateRange !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(booking => {
                const bookingDate = new Date(booking.dateSubmitted || booking.timestamp || 0);
                
                switch (this.filters.dateRange) {
                    case 'today':
                        return bookingDate >= today;
                    case 'yesterday':
                        const yesterday = new Date(today);
                        yesterday.setDate(today.getDate() - 1);
                        return bookingDate >= yesterday && bookingDate < today;
                    case 'week':
                        const lastWeek = new Date(today);
                        lastWeek.setDate(today.getDate() - 7);
                        return bookingDate >= lastWeek;
                    case 'month':
                        const lastMonth = new Date(today);
                        lastMonth.setMonth(today.getMonth() - 1);
                        return bookingDate >= lastMonth;
                    default:
                        return true;
                }
            });
        }
        
        // Update filtered bookings
        this.filteredBookings = filtered;
        console.log(`Filtered to ${this.filteredBookings.length} bookings`);
        
        // Render bookings
        this.renderBookings();
    },
    
    // Update dashboard statistics
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
    
    // Render bookings
    renderBookings: function() {
        const tableBody = document.getElementById('bookings-table-body');
        const emptyState = document.getElementById('empty-state');
        const bookingsCount = document.getElementById('bookings-count');
        
        // Update bookings count
        if (bookingsCount) {
            bookingsCount.textContent = `${this.filteredBookings.length} bookings found`;
        }
        
        // Check if table body exists
        if (!tableBody) return;
        
        // Clear table body
        tableBody.innerHTML = '';
        
        // Show/hide empty state
        if (this.filteredBookings.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            tableBody.innerHTML = '';
            return;
        } else {
            if (emptyState) emptyState.style.display = 'none';
        }
        
        // Render each booking
        this.filteredBookings.forEach(booking => {
            const row = document.createElement('tr');
            
            // Extract customer data
            const customer = booking.customer || {};
            const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`;
            const customerEmail = customer.email || '';
            
            // Extract car data
            const car = booking.selectedCar || {};
            const carName = `${car.make || ''} ${car.model || ''}`;
            
            // Extract dates
            const pickupDate = booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString() : 'N/A';
            const returnDate = booking.returnDate ? new Date(booking.returnDate).toLocaleDateString() : 'N/A';
            
            // Format status badge
            const status = booking.status || 'pending';
            const statusBadge = `<span class="status-badge ${status.toLowerCase()}">${this.formatStatus(status)}</span>`;
            
            // Format price
            const price = booking.totalPrice ? `€${booking.totalPrice.toFixed(2)}` : 'N/A';
            
            // Set row HTML
            row.innerHTML = `
                <td>${booking.bookingReference || 'N/A'}</td>
                <td>
                    <div>${customerName}</div>
                    <div style="font-size: 0.8rem; color: #666;">${customerEmail}</div>
                </td>
                <td>${carName || 'N/A'}</td>
                <td>
                    <div>From: ${pickupDate}</div>
                    <div>To: ${returnDate}</div>
                </td>
                <td>${price}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-button view" data-id="${booking.bookingReference}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-button edit" data-id="${booking.bookingReference}" title="Edit Status">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-button delete" data-id="${booking.bookingReference}" title="Delete Booking">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add event listeners to action buttons
            const viewButton = row.querySelector('.action-button.view');
            if (viewButton) {
                viewButton.addEventListener('click', () => this.showBookingDetails(booking));
            }
            
            const editButton = row.querySelector('.action-button.edit');
            if (editButton) {
                editButton.addEventListener('click', () => this.showStatusUpdateDialog(booking));
            }
            
            const deleteButton = row.querySelector('.action-button.delete');
            if (deleteButton) {
                deleteButton.addEventListener('click', () => this.showDeleteConfirmation(booking));
            }
            
            // Add row to table
            tableBody.appendChild(row);
        });
    },
    
    // Show booking details modal
    showBookingDetails: function(booking) {
        console.log('Showing booking details:', booking);
        
        const modal = document.getElementById('booking-modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalBody) return;
        
        // Extract customer and car data
        const customer = booking.customer || {};
        const car = booking.selectedCar || {};
        
        // Prepare dates
        const bookingDate = booking.dateSubmitted || booking.timestamp ? 
            new Date(booking.dateSubmitted || booking.timestamp).toLocaleString() : 'N/A';
        const pickupDate = booking.pickupDate ? 
            new Date(booking.pickupDate).toLocaleString() : 'N/A';
        const returnDate = booking.returnDate ? 
            new Date(booking.returnDate).toLocaleString() : 'N/A';
        
        // Format duration
        const duration = booking.durationDays ? 
            `${booking.durationDays} day${booking.durationDays !== 1 ? 's' : ''}` : 'N/A';
        
        // Format additional options
        let additionalOptions = '<div>None</div>';
        if (customer.additionalOptions) {
            const options = [];
            if (customer.additionalOptions.additionalDriver) options.push('Additional Driver (+€15/day)');
            if (customer.additionalOptions.fullInsurance) options.push('Full Insurance (+€25/day)');
            if (customer.additionalOptions.gpsNavigation) options.push('GPS Navigation (+€8/day)');
            if (customer.additionalOptions.childSeat) options.push('Child Seat (+€5/day)');
            
            if (options.length > 0) {
                additionalOptions = options.map(opt => `<div>${opt}</div>`).join('');
            }
        }
        
        // Format price
        const price = booking.totalPrice ? `€${booking.totalPrice.toFixed(2)}` : 'N/A';
        
        // Set modal content
        modalBody.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 5px;">Booking #${booking.bookingReference || 'N/A'}</div>
                    <div style="color: #666;">Made on ${bookingDate}</div>
                </div>
                <div>
                    <span class="status-badge ${(booking.status || 'pending').toLowerCase()}" style="font-size: 1rem; padding: 8px 15px;">
                        ${this.formatStatus(booking.status || 'pending')}
                    </span>
                </div>
            </div>
            
            <div class="booking-details">
                <div>
                    <div class="detail-section">
                        <h3>Customer Information</h3>
                        <div class="detail-row">
                            <div class="detail-label">Name:</div>
                            <div class="detail-value">${customer.firstName || ''} ${customer.lastName || ''}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Email:</div>
                            <div class="detail-value">${customer.email || 'N/A'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Phone:</div>
                            <div class="detail-value">${customer.phone || 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Rental Details</h3>
                        <div class="detail-row">
                            <div class="detail-label">Pickup:</div>
                            <div class="detail-value">${this.formatLocation(booking.pickupLocation)} - ${pickupDate}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Return:</div>
                            <div class="detail-value">${this.formatLocation(booking.dropoffLocation || booking.pickupLocation)} - ${returnDate}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Duration:</div>
                            <div class="detail-value">${duration}</div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <div class="detail-section">
                        <h3>Vehicle Information</h3>
                        <div class="car-details">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 5px;">${carName || 'N/A'}</div>
                                <div style="color: #666;">${car.category || ''} ${car.group ? '- Group ' + car.group : ''}</div>
                                <div style="margin-top: 10px;">Daily Rate: <strong>€${car.price || 0}</strong></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Additional Services</h3>
                        ${additionalOptions}
                    </div>
                    
                    <div class="detail-section">
                        <h3>Payment Information</h3>
                        <div class="detail-row">
                            <div class="detail-label">Total Amount:</div>
                            <div class="detail-value" style="font-weight: 600; font-size: 1.1rem;">${price}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Payment Status:</div>
                            <div class="detail-value">Paid on ${booking.paymentDate ? new Date(booking.paymentDate).toLocaleString() : 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Store current booking reference for use in buttons
        modal.dataset.bookingRef = booking.bookingReference;
        
        // Show modal
        modal.style.display = 'block';
    },
    
    // Show status update dialog
    showStatusUpdateDialog: function(booking) {
        // If booking is not passed, get it from the modal dataset
        if (!booking) {
            const modal = document.getElementById('booking-modal');
            if (!modal || !modal.dataset.bookingRef) return;
            
            // Find booking by reference
            const bookingRef = modal.dataset.bookingRef;
            booking = this.bookings.find(b => b.bookingReference === bookingRef);
            
            if (!booking) {
                this.showNotification('Booking not found.', 'error');
                return;
            }
        }
        
        // Prompt for new status
        const currentStatus = booking.status || 'pending';
        const newStatus = prompt(
            `Current status: ${this.formatStatus(currentStatus)}\n\nEnter new status (new, pending, confirmed, completed, cancelled):`,
            currentStatus
        );
        
        // Validate and update status
        if (newStatus && ['new', 'pending', 'confirmed', 'completed', 'cancelled'].includes(newStatus.toLowerCase())) {
            this.updateBookingStatus(booking.bookingReference, newStatus.toLowerCase());
            this.closeModal();
        } else if (newStatus) {
            this.showNotification('Invalid status. Please use one of: new, pending, confirmed, completed, cancelled.', 'error');
        }
    },
    
    // Show delete confirmation dialog
    showDeleteConfirmation: function(booking) {
        // If booking is not passed, get it from the modal dataset
        if (!booking) {
            const modal = document.getElementById('booking-modal');
            if (!modal || !modal.dataset.bookingRef) return;
            
            // Find booking by reference
            const bookingRef = modal.dataset.bookingRef;
            booking = this.bookings.find(b => b.bookingReference === bookingRef);
            
            if (!booking) {
                this.showNotification('Booking not found.', 'error');
                return;
            }
        }
        
        // Confirm deletion
        if (confirm(`Are you sure you want to delete booking #${booking.bookingReference}? This action cannot be undone.`)) {
            this.deleteBooking(booking.bookingReference);
            this.closeModal();
        }
    },
    
    // Update booking status
    updateBookingStatus: function(bookingRef, newStatus) {
        try {
            // Find booking 
            const index = this.bookings.findIndex(b => b.bookingReference === bookingRef);
            
            if (index === -1) {
                this.showNotification('Booking not found.', 'error');
                return;
            }
            
            // Get booking object
            const booking = {...this.bookings[index]};
            booking.status = newStatus;
            
            // Determine API URL
            const apiUrl = window.location.hostname === 'localhost'
                ? `http://localhost:3000/api/bookings/${bookingRef}`
                : `/api/bookings/${bookingRef}`;
            
            // Update booking via API
            fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(booking)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(updatedBooking => {
                console.log(`Booking ${bookingRef} updated successfully via API`);
                
                // Update local booking in the array
                this.bookings[index] = booking;
                
                // Update UI
                this.applyFilters();
                this.updateDashboardStats();
                
                // Show notification
                this.showNotification(`Booking #${bookingRef} status updated to ${this.formatStatus(newStatus)}.`, 'success');
            })
            .catch(error => {
                console.error('Error updating booking via API:', error);
                
                // Fallback to localStorage
                this.updateBookingInLocalStorage(booking);
                
                // Show notification
                this.showNotification(`Booking #${bookingRef} status updated to ${this.formatStatus(newStatus)} (local only).`, 'success');
            });
        } catch (error) {
            console.error('Error updating booking status:', error);
            this.showNotification('Error updating booking status. Please try again.', 'error');
        }
    },
    
    // Fallback: Update booking in localStorage
    updateBookingInLocalStorage: function(booking) {
        try {
            // Find booking index
            const index = this.bookings.findIndex(b => b.bookingReference === booking.bookingReference);
            
            if (index === -1) {
                console.error('Booking not found in local data');
                return;
            }
            
            // Update local array
            this.bookings[index] = booking;
            
            // Save to localStorage
            localStorage.setItem('adminBookings', JSON.stringify(this.bookings));
            
            // Update UI
            this.applyFilters();
            this.updateDashboardStats();
            
            console.log(`Updated booking ${booking.bookingReference} in localStorage`);
        } catch (error) {
            console.error('Error updating booking in localStorage:', error);
        }
    },
    
    // Delete booking
    deleteBooking: function(bookingRef) {
        try {
            // Find booking index
            const index = this.bookings.findIndex(b => b.bookingReference === bookingRef);
            
            if (index === -1) {
                this.showNotification('Booking not found.', 'error');
                return;
            }
            
            // Determine API URL
            const apiUrl = window.location.hostname === 'localhost'
                ? `http://localhost:3000/api/bookings/${bookingRef}`
                : `/api/bookings/${bookingRef}`;
            
            // Delete booking via API
            fetch(apiUrl, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(result => {
                console.log(`Booking ${bookingRef} deleted successfully via API`);
                
                // Remove from local array
                this.bookings.splice(index, 1);
                
                // Update UI
                this.applyFilters();
                this.updateDashboardStats();
                
                // Show notification
                this.showNotification(`Booking #${bookingRef} has been deleted.`, 'success');
            })
            .catch(error => {
                console.error('Error deleting booking via API:', error);
                
                // Fallback to localStorage
                this.deleteBookingFromLocalStorage(bookingRef, index);
                
                // Show notification
                this.showNotification(`Booking #${bookingRef} has been deleted (local only).`, 'success');
            });
        } catch (error) {
            console.error('Error deleting booking:', error);
            this.showNotification('Error deleting booking. Please try again.', 'error');
        }
    },
    
    // Fallback: Delete booking from localStorage
    deleteBookingFromLocalStorage: function(bookingRef, index) {
        try {
            // Remove booking from array
            this.bookings.splice(index, 1);
            
            // Save to localStorage
            localStorage.setItem('adminBookings', JSON.stringify(this.bookings));
            
            // Also remove individual booking if it exists
            localStorage.removeItem(`booking_${bookingRef}`);
            
            // Update UI
            this.applyFilters();
            this.updateDashboardStats();
            
            console.log(`Deleted booking ${bookingRef} from localStorage`);
        } catch (error) {
            console.error('Error deleting booking from localStorage:', error);
        }
    },
    
    // Close modal
    closeModal: function() {
        const modal = document.getElementById('booking-modal');
        if (modal) modal.style.display = 'none';
    },
    
    // Format status for display
    formatStatus: function(status) {
        switch (status.toLowerCase()) {
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
    
    // Format location for display
    formatLocation: function(locationCode) {
        switch (locationCode) {
            case 'airport':
                return 'Chania Airport';
            case 'port':
                return 'Chania Port';
            case 'city':
                return 'Chania City Center';
            case 'hotel':
                return 'Hotel/Villa';
            default:
                return locationCode || 'N/A';
        }
    },
    
    // Refresh data
    refreshData: function() {
        console.log('Manual refresh triggered');
        
        // Change refresh button appearance
        const refreshButton = document.getElementById('refresh-btn');
        if (refreshButton) {
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshButton.disabled = true;
        }
        
        // Load bookings and update UI
        this.loadBookings();
        this.updateDashboardStats();
        this.renderBookings();
        
        // Show notification
        this.showNotification('Data refreshed successfully.', 'success');
        
        // Restore refresh button
        setTimeout(() => {
            if (refreshButton) {
                refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshButton.disabled = false;
            }
        }, 500);
    },
    
    // Show notification
    showNotification: function(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         'fa-info-circle'}"></i>
            <div>${message}</div>
        `;
        
        // Add to container
        container.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                container.removeChild(notification);
            }, 300);
        }, 5000);
    }
};

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    AdminDashboard.init();
}); 