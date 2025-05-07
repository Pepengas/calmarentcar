/**
 * Calma Car Rental - Admin Panel JavaScript
 * This script handles the functionality for the admin dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    const mainContent = document.querySelector('.main-content');
    
    // Pages content
    const pages = {
        dashboard: {
            title: 'Dashboard',
            content: `
                <div class="page-header">
                    <h1 class="page-title">Dashboard</h1>
                    <button id="refresh-btn" class="btn btn-primary">
                        <i class="fas fa-sync-alt"></i> Refresh Data
                    </button>
                </div>
                
                <!-- Stats Cards -->
                <div class="stats-cards">
                    <div class="stat-card">
                        <div class="stat-card-title">Total Bookings</div>
                        <div id="total-bookings" class="stat-card-value">0</div>
                        <div class="stat-card-info">
                            <i class="fas fa-calendar-alt"></i> All time
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card-title">Revenue</div>
                        <div id="revenue" class="stat-card-value">€0</div>
                        <div class="stat-card-info positive">
                            <i class="fas fa-chart-line"></i> Estimated
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card-title">Fleet Utilization</div>
                        <div id="utilization" class="stat-card-value">0%</div>
                        <div class="stat-card-info">
                            <i class="fas fa-car"></i> Current
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-card-title">Total Cars</div>
                        <div id="total-cars" class="stat-card-value">0</div>
                        <div class="stat-card-info">
                            <i class="fas fa-car-side"></i> In fleet
                        </div>
                    </div>
                </div>
                
                <!-- Overview Panels -->
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Recent Bookings</h2>
                        <a href="#" data-page="bookings" class="btn btn-outline">View All</a>
                    </div>
                    
                    <div class="panel-body">
                        <div id="recent-bookings-container">
                            <div class="loading-state">
                                <i class="fas fa-spinner state-icon"></i>
                                <h3 class="state-title">Loading Recent Bookings</h3>
                                <p class="state-message">Please wait...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },
        bookings: {
            title: 'Bookings',
            content: `
                <div class="page-header">
                    <h1 class="page-title">Bookings</h1>
                    <button id="refresh-btn" class="btn btn-primary">
                        <i class="fas fa-sync-alt"></i> Refresh Data
                    </button>
                </div>
                
                <!-- Stats Cards -->
                <div class="stats-cards">
                    <div class="stat-card">
                        <div class="stat-card-title">Total Bookings</div>
                        <div id="total-bookings" class="stat-card-value">-</div>
                        <div class="stat-card-info">
                            <i class="fas fa-calendar-alt"></i> All time
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card-title">Active Bookings</div>
                        <div id="active-bookings" class="stat-card-value">-</div>
                        <div class="stat-card-info positive">
                            <i class="fas fa-check-circle"></i> Confirmed
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card-title">Recent Bookings</div>
                        <div id="recent-bookings" class="stat-card-value">-</div>
                        <div class="stat-card-info">
                            <i class="fas fa-clock"></i> Last 7 days
                        </div>
                    </div>
                </div>
                
                <!-- Bookings Panel -->
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Booking Management</h2>
                    </div>
                    
                    <div class="panel-body">
                        <!-- Filters -->
                        <div class="bookings-filters">
                            <div class="search-group">
                                <i class="fas fa-search"></i>
                                <input type="text" id="search-input" placeholder="Search by customer name, email, car...">
                            </div>
                            
                            <div class="filter-group">
                                <select id="status-filter">
                                    <option value="all">All Statuses</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="pending">Pending</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            
                            <div class="filter-group">
                                <select id="date-filter">
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Bookings Table Container -->
                        <div id="bookings-container">
                            <div class="loading-state">
                                <i class="fas fa-spinner state-icon"></i>
                                <h3 class="state-title">Loading Bookings</h3>
                                <p class="state-message">Please wait while we fetch the booking data.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },
        cars: {
            title: 'Cars',
            content: `
                <div class="page-header">
                    <h1 class="page-title">Fleet Management</h1>
                    <div>
                        <button id="add-car-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Add New Car
                        </button>
                        <button id="refresh-cars-btn" class="btn btn-outline">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                
                <!-- Stats Cards -->
                <div class="stats-cards">
                    <div class="stat-card">
                        <div class="stat-card-title">Total Cars</div>
                        <div id="total-cars" class="stat-card-value">-</div>
                        <div class="stat-card-info">
                            <i class="fas fa-car-side"></i> Fleet size
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card-title">Available Cars</div>
                        <div id="available-cars" class="stat-card-value">-</div>
                        <div class="stat-card-info positive">
                            <i class="fas fa-check-circle"></i> Ready for rental
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card-title">Reserved Cars</div>
                        <div id="reserved-cars" class="stat-card-value">-</div>
                        <div class="stat-card-info">
                            <i class="fas fa-clock"></i> Currently rented
                        </div>
                    </div>
                </div>
                
                <!-- Cars Panel -->
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Car Management</h2>
                    </div>
                    
                    <div class="panel-body">
                        <!-- Filters -->
                        <div class="bookings-filters">
                            <div class="search-group">
                                <i class="fas fa-search"></i>
                                <input type="text" id="car-search-input" placeholder="Search by car name, model, category...">
                            </div>
                            
                            <div class="filter-group">
                                <select id="car-category-filter">
                                    <option value="all">All Categories</option>
                                    <option value="economy">Economy</option>
                                    <option value="compact">Compact</option>
                                    <option value="midsize">Midsize</option>
                                    <option value="suv">SUV</option>
                                    <option value="luxury">Luxury</option>
                                </select>
                            </div>
                            
                            <div class="filter-group">
                                <select id="car-status-filter">
                                    <option value="all">All Status</option>
                                    <option value="available">Available</option>
                                    <option value="rented">Rented</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Cars Table Container -->
                        <div id="cars-container">
                            <div class="loading-state">
                                <i class="fas fa-spinner state-icon"></i>
                                <h3 class="state-title">Loading Cars</h3>
                                <p class="state-message">Please wait while we fetch your fleet data.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },
        customers: {
            title: 'Customers',
            content: `
                <div class="page-header">
                    <h1 class="page-title">Customer Management</h1>
                    <div>
                        <button id="add-customer-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Add Customer
                        </button>
                        <button id="refresh-customers-btn" class="btn btn-outline">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                
                <!-- Stats Cards -->
                <div class="stats-cards">
                    <div class="stat-card">
                        <div class="stat-card-title">Total Customers</div>
                        <div id="total-customers" class="stat-card-value">-</div>
                        <div class="stat-card-info">
                            <i class="fas fa-users"></i> All time
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card-title">New Customers</div>
                        <div id="new-customers" class="stat-card-value">-</div>
                        <div class="stat-card-info positive">
                            <i class="fas fa-user-plus"></i> Last 30 days
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-card-title">Repeat Customers</div>
                        <div id="repeat-customers" class="stat-card-value">-</div>
                        <div class="stat-card-info positive">
                            <i class="fas fa-redo"></i> Booked more than once
                        </div>
                    </div>
                </div>
                
                <!-- Customers Panel -->
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Customer Database</h2>
                    </div>
                    
                    <div class="panel-body">
                        <!-- Filters -->
                        <div class="bookings-filters">
                            <div class="search-group">
                                <i class="fas fa-search"></i>
                                <input type="text" id="customer-search-input" placeholder="Search by name, email, phone...">
                            </div>
                            
                            <div class="filter-group">
                                <select id="customer-status-filter">
                                    <option value="all">All Customers</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Customers Table Container -->
                        <div id="customers-container">
                            <div class="loading-state">
                                <i class="fas fa-spinner state-icon"></i>
                                <h3 class="state-title">Loading Customers</h3>
                                <p class="state-message">Please wait while we fetch customer data.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },
        general: {
            title: 'General Settings',
            content: `
                <div class="page-header">
                    <h1 class="page-title">General Settings</h1>
                    <button id="save-settings" class="btn btn-primary">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
                
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Site Settings</h2>
                    </div>
                    
                    <div class="panel-body">
                        <form id="general-settings-form">
                            <div class="settings-group">
                                <label for="site-name">Site Name</label>
                                <input type="text" id="site-name" value="Calma Car Rental">
                                <p class="setting-help">This is displayed in the header and browser title.</p>
                            </div>
                            
                            <div class="settings-group">
                                <label for="contact-email">Contact Email</label>
                                <input type="email" id="contact-email" value="calmarental@gmail.com">
                                <p class="setting-help">Primary contact email for customer inquiries.</p>
                            </div>
                            
                            <div class="settings-group">
                                <label for="contact-phone">Contact Phone</label>
                                <input type="tel" id="contact-phone" value="+30 6942 515267">
                                <p class="setting-help">Primary phone number displayed on the site.</p>
                            </div>
                            
                            <div class="settings-group">
                                <label for="working-hours">Working Hours</label>
                                <input type="text" id="working-hours" value="08:00 - 20:00, Monday to Sunday">
                                <p class="setting-help">Business hours displayed on the site.</p>
                            </div>
                            
                            <div class="settings-group">
                                <label for="min-rental-age">Minimum Rental Age</label>
                                <input type="number" id="min-rental-age" value="25" min="18" max="99">
                                <p class="setting-help">Minimum age required to rent a vehicle.</p>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Booking Settings</h2>
                    </div>
                    
                    <div class="panel-body">
                        <form id="booking-settings-form">
                            <div class="settings-group">
                                <label for="min-booking-notice">Minimum Booking Notice (hours)</label>
                                <input type="number" id="min-booking-notice" value="24" min="0">
                                <p class="setting-help">Minimum notice required before pickup time.</p>
                            </div>
                            
                            <div class="settings-group">
                                <label for="max-booking-advance">Maximum Advance Booking (days)</label>
                                <input type="number" id="max-booking-advance" value="365" min="1">
                                <p class="setting-help">How far in advance customers can make bookings.</p>
                            </div>
                            
                            <div class="settings-group">
                                <label for="min-rental-duration">Minimum Rental Duration (days)</label>
                                <input type="number" id="min-rental-duration" value="1" min="1">
                                <p class="setting-help">Minimum number of days for a rental.</p>
                            </div>
                            
                            <div class="settings-group">
                                <label for="tax-rate">Tax Rate (%)</label>
                                <input type="number" id="tax-rate" value="24" min="0" max="100" step="0.1">
                                <p class="setting-help">Tax rate applied to bookings.</p>
                            </div>
                        </form>
                    </div>
                </div>
            `
        },
        account: {
            title: 'Account Settings',
            content: `
                <div class="page-header">
                    <h1 class="page-title">Account Settings</h1>
                    <button id="save-account" class="btn btn-primary">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
                
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Profile Information</h2>
                    </div>
                    
                    <div class="panel-body">
                        <div class="account-info">
                            <div class="account-avatar">
                                <img src="https://ui-avatars.com/api/?name=Admin+User&background=0066cc&color=fff" alt="Admin User">
                                <button id="change-avatar" class="btn btn-outline btn-sm">
                                    <i class="fas fa-camera"></i> Change
                                </button>
                            </div>
                            
                            <div class="account-details">
                                <form id="profile-form">
                                    <div class="form-row">
                                        <div class="settings-group">
                                            <label for="fullname">Full Name</label>
                                            <input type="text" id="fullname" value="Admin User">
                                        </div>
                                        
                                        <div class="settings-group">
                                            <label for="job-title">Job Title</label>
                                            <input type="text" id="job-title" value="System Administrator">
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="settings-group">
                                            <label for="email">Email Address</label>
                                            <input type="email" id="email" value="admin@calmarental.com">
                                        </div>
                                        
                                        <div class="settings-group">
                                            <label for="phone">Phone Number</label>
                                            <input type="tel" id="phone" value="+30 6955 123456">
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Security</h2>
                    </div>
                    
                    <div class="panel-body">
                        <form id="security-form">
                            <div class="settings-group">
                                <label for="current-password">Current Password</label>
                                <input type="password" id="current-password">
                            </div>
                            
                            <div class="form-row">
                                <div class="settings-group">
                                    <label for="new-password">New Password</label>
                                    <input type="password" id="new-password">
                                </div>
                                
                                <div class="settings-group">
                                    <label for="confirm-password">Confirm New Password</label>
                                    <input type="password" id="confirm-password">
                                </div>
                            </div>
                            
                            <div class="password-requirements">
                                <p><i class="fas fa-info-circle"></i> Password must be at least 8 characters long and include:
                                <ul>
                                    <li>At least one uppercase letter</li>
                                    <li>At least one lowercase letter</li>
                                    <li>At least one number</li>
                                    <li>At least one special character</li>
                                </ul>
                                </p>
                            </div>
                            
                            <button type="button" id="update-password" class="btn btn-primary">
                                Update Password
                            </button>
                        </form>
                    </div>
                </div>
            `
        },
        logout: {
            title: 'Logout',
            content: `
                <div class="logout-container">
                    <div class="logout-box">
                        <i class="fas fa-sign-out-alt logout-icon"></i>
                        <h2>Are you sure you want to logout?</h2>
                        <div class="logout-actions">
                            <button id="cancel-logout" class="btn btn-outline">Cancel</button>
                            <button id="confirm-logout" class="btn btn-primary">Yes, Logout</button>
                        </div>
                    </div>
                </div>
            `
        }
    };
    
    // Function to navigate to a page
    function navigate(pageName) {
        // Remove active class from all links
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current link
        document.querySelector(`.nav-link[data-page="${pageName}"]`).classList.add('active');
        
        // Update content
        if (pages[pageName]) {
            document.title = `Calma Admin - ${pages[pageName].title}`;
            mainContent.innerHTML = pages[pageName].content;
            
            // Initialize page specific functionality
            if (pageName === 'bookings') {
                initBookingsPage();
            } else if (pageName === 'cars') {
                initCarsPage();
            } else if (pageName === 'customers') {
                initCustomersPage();
            } else if (pageName === 'dashboard') {
                initDashboardPage();
            } else if (pageName === 'general') {
                initGeneralSettingsPage();
            } else if (pageName === 'account') {
                initAccountPage();
            } else if (pageName === 'logout') {
                initLogoutPage();
            }
        }
    }
    
    // Initialize bookings page functionality
    function initBookingsPage() {
        // This function can be called when the bookings page is loaded
        // Add event handlers for the bookings page elements
        const refreshBtn = document.getElementById('refresh-btn');
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        const dateFilter = document.getElementById('date-filter');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                loadBookings();
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', applyFilters);
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', applyFilters);
        }
        
        // Load bookings data
        loadBookings();
    }
    
    // Function to load bookings data
    function loadBookings() {
        const bookingsContainer = document.getElementById('bookings-container');
        if (!bookingsContainer) return;
        
        bookingsContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner state-icon"></i>
                <h3 class="state-title">Loading Bookings</h3>
                <p class="state-message">Please wait while we fetch the booking data.</p>
            </div>
        `;
        
        // Get bookings from localStorage instead of API
        const storedBookings = localStorage.getItem('calma_bookings');
        
        // Small delay to simulate loading
        setTimeout(() => {
            try {
                const bookings = storedBookings ? JSON.parse(storedBookings) : [];
                
                // Store for filtering
                window.allBookings = bookings;
                
                // Update stats
                updateBookingStats(bookings);
                
                if (bookings.length > 0) {
                    displayBookings(bookings);
                } else {
                    displayEmptyBookingsState();
                }
            } catch (error) {
                console.error('Error parsing bookings from localStorage:', error);
                displayErrorState(bookingsContainer, 'Failed to load booking data. Please try again.');
            }
        }, 500);
    }
    
    // Function to initialize cars page
    function initCarsPage() {
        alert('Cars management functionality coming soon!');
    }
    
    // Function to initialize customers page
    function initCustomersPage() {
        alert('Customer management functionality coming soon!');
    }
    
    // Function to initialize dashboard page
    function initDashboardPage() {
        alert('Dashboard overview functionality coming soon!');
    }
    
    // Function to initialize general settings page
    function initGeneralSettingsPage() {
        const saveButton = document.getElementById('save-settings');
        if (saveButton) {
            saveButton.addEventListener('click', function() {
                alert('Settings saved successfully!');
            });
        }
    }
    
    // Function to initialize account page
    function initAccountPage() {
        const saveAccountButton = document.getElementById('save-account');
        const updatePasswordButton = document.getElementById('update-password');
        
        if (saveAccountButton) {
            saveAccountButton.addEventListener('click', function() {
                alert('Account information updated successfully!');
            });
        }
        
        if (updatePasswordButton) {
            updatePasswordButton.addEventListener('click', function() {
                alert('Password updated successfully!');
            });
        }
    }
    
    // Function to initialize logout page
    function initLogoutPage() {
        const cancelButton = document.getElementById('cancel-logout');
        const confirmButton = document.getElementById('confirm-logout');
        
        if (cancelButton) {
            cancelButton.addEventListener('click', function() {
                // Navigate back to dashboard
                navigate('dashboard');
            });
        }
        
        if (confirmButton) {
            confirmButton.addEventListener('click', function() {
                // Logout action - redirect to login page
                window.location.href = 'index.html';
            });
        }
    }
    
    // Helper functions for displaying data
    function displayBookings(bookings) {
        const bookingsContainer = document.getElementById('bookings-container');
        if (!bookingsContainer) return;
        
        // Update count
        const bookingsCount = document.getElementById('bookings-count');
        if (bookingsCount) {
            bookingsCount.textContent = `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} found`;
        }
        
        let tableHtml = `
            <table class="bookings-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Vehicle</th>
                        <th>Dates</th>
                        <th>Locations</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        bookings.forEach(booking => {
            // Format dates
            const pickupDate = booking.pickup_date ? new Date(booking.pickup_date).toLocaleDateString() : 'N/A';
            const dropoffDate = booking.dropoff_date ? new Date(booking.dropoff_date).toLocaleDateString() : 'N/A';
            const createdAt = booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A';
            
            // Calculate duration if possible
            let duration = '';
            if (booking.pickup_date && booking.dropoff_date) {
                const pickup = new Date(booking.pickup_date);
                const dropoff = new Date(booking.dropoff_date);
                const days = Math.ceil((dropoff - pickup) / (1000 * 60 * 60 * 24));
                duration = `(${days} day${days !== 1 ? 's' : ''})`;
            }
            
            // Format status with appropriate class
            const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : 
                               booking.status === 'pending' ? 'status-pending' : 
                               booking.status === 'completed' ? 'status-completed' :
                               'status-cancelled';
            
            // Format price
            const price = booking.total_price ? `€${booking.total_price}` : 'N/A';
            
            // Get customer name components
            const customerFirstName = booking.customer_first_name || booking.customer_name?.split(' ')[0] || 'N/A';
            const customerLastName = booking.customer_last_name || (booking.customer_name?.split(' ').slice(1).join(' ')) || '';
            const customerFullName = customerFirstName + (customerLastName ? ` ${customerLastName}` : '');
            
            // Get car details
            const carMake = booking.car_make || '';
            const carModel = booking.car_model || '';
            const carName = booking.car_name || (carMake && carModel ? `${carMake} ${carModel}` : 'Unknown Vehicle');
            
            tableHtml += `
                <tr>
                    <td class="booking-id-cell">
                        <div class="booking-id">#${booking.booking_reference || booking.id || 'N/A'}</div>
                        <div class="booking-date" style="font-size: 0.8rem; color: #666;">
                            <i class="fas fa-calendar-alt" style="margin-right: 3px;"></i> ${createdAt.split(',')[0]}
                        </div>
                    </td>
                    
                    <td class="customer-cell">
                        <div class="customer-name" style="font-weight: 500;">${customerFullName}</div>
                        <div class="customer-email" style="font-size: 0.8rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;">
                            <i class="fas fa-envelope" style="margin-right: 3px;"></i> ${booking.customer_email || 'N/A'}
                        </div>
                        <div class="customer-phone" style="font-size: 0.8rem; color: #666;">
                            <i class="fas fa-phone" style="margin-right: 3px;"></i> ${booking.customer_phone || 'N/A'}
                        </div>
                    </td>
                    
                    <td class="vehicle-cell">
                        <div class="car-name" style="font-weight: 500;">${carName}</div>
                        <div class="car-type" style="font-size: 0.8rem; color: #666;">
                            ${booking.car_category || 'Standard Vehicle'}
                        </div>
                    </td>
                    
                    <td class="dates-cell">
                        <div class="pickup-date" style="margin-bottom: 3px;">
                            <span style="color: #0066cc;"><i class="fas fa-arrow-right" style="margin-right: 3px;"></i> Pick-up:</span> 
                            <div>${pickupDate}</div>
                            <div style="font-size: 0.8rem; color: #666;">${booking.pickup_time || ''}</div>
                        </div>
                        <div class="dropoff-date">
                            <span style="color: #e74c3c;"><i class="fas fa-arrow-left" style="margin-right: 3px;"></i> Drop-off:</span>
                            <div>${dropoffDate}</div>
                            <div style="font-size: 0.8rem; color: #666;">${booking.dropoff_time || ''}</div>
                        </div>
                        <div style="font-size: 0.8rem; color: #666; margin-top: 3px; font-style: italic;">
                            ${duration}
                        </div>
                    </td>
                    
                    <td class="locations-cell">
                        <div class="pickup-location" style="margin-bottom: 5px;">
                            <div style="font-size: 0.8rem; color: #0066cc; font-weight: 500;">Pick-up location:</div>
                            <div style="font-size: 0.85rem;">${booking.pickup_location || 'N/A'}</div>
                        </div>
                        <div class="dropoff-location">
                            <div style="font-size: 0.8rem; color: #e74c3c; font-weight: 500;">Drop-off location:</div>
                            <div style="font-size: 0.85rem;">${booking.dropoff_location || booking.pickup_location || 'N/A'}</div>
                        </div>
                    </td>
                    
                    <td class="price-cell">
                        <div class="total-price" style="font-weight: bold; font-size: 1.1rem; color: #2c3e50;">${price}</div>
                        <div class="price-status" style="font-size: 0.8rem; color: ${booking.payment_date ? '#27ae60' : '#f39c12'};">
                            <i class="fas ${booking.payment_date ? 'fa-check-circle' : 'fa-clock'}" style="margin-right: 3px;"></i>
                            ${booking.payment_date ? 'Paid' : 'Pending'}
                        </div>
                    </td>
                    
                    <td class="status-cell">
                        <span class="status-badge ${statusClass}">
                            ${booking.status || 'N/A'}
                        </span>
                    </td>
                    
                    <td class="actions-cell">
                        <button class="btn btn-view" title="View details" onclick="viewBookingDetails(${booking.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-edit" title="Edit booking" onclick="alert('Edit feature coming soon!')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableHtml += `
                </tbody>
            </table>
            <div class="pagination">
                <div class="pagination-info">
                    Showing ${bookings.length} booking${bookings.length !== 1 ? 's' : ''}
                </div>
            </div>
        `;
        
        bookingsContainer.innerHTML = tableHtml;
        
        // Add some enhanced styles for the new table layout
        const style = document.createElement('style');
        style.textContent = `
            .bookings-table th, .bookings-table td {
                padding: 12px 15px;
                text-align: left;
                border-bottom: 1px solid #eee;
                vertical-align: top;
            }
            
            .bookings-table th {
                background-color: #f8f9fa;
                font-weight: 600;
                color: #2c3e50;
            }
            
            .btn-view, .btn-edit {
                background: none;
                border: none;
                cursor: pointer;
                color: #95a5a6;
                transition: color 0.2s;
                padding: 5px;
                margin-right: 5px;
            }
            
            .btn-view:hover {
                color: #0066cc;
            }
            
            .btn-edit:hover {
                color: #f39c12;
            }
            
            .status-badge {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 0.8rem;
                font-weight: 500;
                text-transform: capitalize;
            }
            
            .status-confirmed {
                background-color: #e8f5e9;
                color: #27ae60;
            }
            
            .status-pending {
                background-color: #fff8e1;
                color: #f39c12;
            }
            
            .status-cancelled {
                background-color: #ffebee;
                color: #e74c3c;
            }
            
            .status-completed {
                background-color: #e3f2fd;
                color: #2196f3;
            }
        `;
        document.head.appendChild(style);
    }
    
    function displayEmptyBookingsState() {
        const bookingsContainer = document.getElementById('bookings-container');
        if (!bookingsContainer) return;
        
        bookingsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times state-icon"></i>
                <h3 class="state-title">No Bookings Found</h3>
                <p class="state-message">There are currently no bookings in the system. New bookings will appear here when customers make reservations.</p>
            </div>
        `;
    }
    
    function displayErrorState(container, errorMessage) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle state-icon"></i>
                <h3 class="state-title">Error Loading Data</h3>
                <p class="state-message">${errorMessage}</p>
                <p class="state-message">Please check the console for more details and ensure the backend server is running correctly.</p>
            </div>
        `;
    }
    
    function updateBookingStats(bookings) {
        const totalBookingsEl = document.getElementById('total-bookings');
        const activeBookingsEl = document.getElementById('active-bookings');
        const recentBookingsEl = document.getElementById('recent-bookings');
        
        if (totalBookingsEl) {
            totalBookingsEl.textContent = bookings.length;
        }
        
        if (activeBookingsEl) {
            const activeCount = bookings.filter(b => b.status === 'confirmed').length;
            activeBookingsEl.textContent = activeCount;
        }
        
        if (recentBookingsEl) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const recentCount = bookings.filter(b => {
                const createdDate = new Date(b.created_at);
                return createdDate >= oneWeekAgo;
            }).length;
            
            recentBookingsEl.textContent = recentCount;
        }
    }
    
    function applyFilters() {
        if (!window.allBookings) return;
        
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        const dateFilter = document.getElementById('date-filter');
        
        if (!searchInput || !statusFilter || !dateFilter) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        const dateValue = dateFilter.value;
        
        let filtered = [...window.allBookings];
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(booking => 
                (booking.customer_name && booking.customer_name.toLowerCase().includes(searchTerm)) ||
                (booking.customer_email && booking.customer_email.toLowerCase().includes(searchTerm)) ||
                (booking.car_name && booking.car_name.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply status filter
        if (statusValue !== 'all') {
            filtered = filtered.filter(booking => booking.status === statusValue);
        }
        
        // Apply date filter
        if (dateValue !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            
            filtered = filtered.filter(booking => {
                const createdDate = new Date(booking.created_at);
                
                if (dateValue === 'today') {
                    return createdDate >= today;
                } else if (dateValue === 'week') {
                    return createdDate >= thisWeekStart;
                } else if (dateValue === 'month') {
                    return createdDate >= thisMonthStart;
                }
                return true;
            });
        }
        
        // Display filtered results
        if (filtered.length > 0) {
            displayBookings(filtered);
        } else {
            const bookingsContainer = document.getElementById('bookings-container');
            if (bookingsContainer) {
                bookingsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-filter state-icon"></i>
                        <h3 class="state-title">No Matching Bookings</h3>
                        <p class="state-message">No bookings match your current filters. Try changing your search criteria.</p>
                    </div>
                `;
            }
        }
    }
    
    // Global function to view booking details
    window.viewBookingDetails = function(bookingId) {
        // Find booking by ID
        const booking = window.allBookings.find(b => b.id == bookingId);
        if (!booking) {
            showNotification('Booking not found', 'error');
            return;
        }
        
        // Format dates
        const pickupDate = booking.pickup_date ? new Date(booking.pickup_date).toLocaleDateString() : 'N/A';
        const dropoffDate = booking.dropoff_date ? new Date(booking.dropoff_date).toLocaleDateString() : 'N/A';
        const createdAt = booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A';
        
        // Calculate duration if possible
        let duration = 'N/A';
        if (booking.pickup_date && booking.dropoff_date) {
            const pickup = new Date(booking.pickup_date);
            const dropoff = new Date(booking.dropoff_date);
            const days = Math.ceil((dropoff - pickup) / (1000 * 60 * 60 * 24));
            duration = `${days} day${days !== 1 ? 's' : ''}`;
        }
        
        // Format status with appropriate color
        let statusColor;
        switch (booking.status) {
            case 'confirmed':
                statusColor = '#27ae60'; // Green
                break;
            case 'pending':
                statusColor = '#f39c12'; // Orange
                break;
            case 'cancelled':
                statusColor = '#e74c3c'; // Red
                break;
            default:
                statusColor = '#95a5a6'; // Gray
        }
        
        // Format price if available
        const price = booking.total_price ? `€${booking.total_price}` : 'N/A';
        
        // Build special requests HTML
        let specialRequestsHtml = '<p>None</p>';
        if (booking.additional_requests && booking.additional_requests.trim()) {
            specialRequestsHtml = `<p>${booking.additional_requests}</p>`;
        }
        
        // Additional services
        const additionalServices = [];
        if (booking.gps) additionalServices.push('GPS Navigation System (+€5/day)');
        if (booking.baby_seat) additionalServices.push('Baby/Child Seat (+€3/day)');
        if (booking.additional_driver) additionalServices.push('Additional Driver (+€7/day)');
        if (booking.full_insurance) additionalServices.push('Full Insurance Coverage (+€10/day)');
        
        let additionalServicesHtml = '';
        if (additionalServices.length > 0) {
            additionalServicesHtml = `
                <ul style="padding-left: 20px; margin-top: 10px;">
                    ${additionalServices.map(service => `<li>${service}</li>`).join('')}
                </ul>
            `;
            specialRequestsHtml = additionalServicesHtml + specialRequestsHtml;
        }
        
        // Get modal elements
        const modal = document.getElementById('booking-modal');
        const modalBody = document.getElementById('modal-body');
        const closeBtn = document.querySelector('.modal-close');
        const modalCloseBtn = document.getElementById('modal-close-btn');
        
        // Build the modal content
        modalBody.innerHTML = `
            <div class="booking-details">
                <div class="booking-header">
                    <div class="booking-id">Booking Reference: <strong>${booking.booking_reference || booking.id}</strong></div>
                    <div class="booking-status" style="color: ${statusColor}">Status: <strong>${booking.status || 'N/A'}</strong></div>
                </div>
                
                <div class="details-container">
                    <!-- Two-column layout -->
                    <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <!-- Left column: Personal Information -->
                        <div class="details-section">
                            <h3 style="margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 1px solid #eee;">Personal Information</h3>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">First Name:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.customer_first_name || booking.customer_name?.split(' ')[0] || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Last Name:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.customer_last_name || (booking.customer_name?.split(' ').slice(1).join(' ')) || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Email Address:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.customer_email || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Phone Number:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.customer_phone || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Age:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.customer_age || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Driver's License Number:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.license_number || 'Not provided'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Country:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.country || 'Not provided'}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right column: Trip Information -->
                        <div class="details-section">
                            <h3 style="margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 1px solid #eee;">Trip Information</h3>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Pick-up Location:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.pickup_location || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Pick-up Date & Time:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${pickupDate} ${booking.pickup_time || ''}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Drop-off Location:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.dropoff_location || booking.pickup_location || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Drop-off Date & Time:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${dropoffDate} ${booking.dropoff_time || ''}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Duration:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${duration}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Selected Car:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                    ${booking.car_name || booking.car_model || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="form-row" style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Total Price:</label>
                                <div style="padding: 8px; background: #f9f9f9; border-radius: 4px; font-weight: bold; color: #2c3e50;">
                                    ${price}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Special Requests -->
                    <div class="details-section" style="margin-top: 15px;">
                        <h3 style="margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 1px solid #eee;">Special Requests & Additional Services</h3>
                        ${specialRequestsHtml}
                    </div>
                    
                    <!-- Booking Meta -->
                    <div class="details-section" style="margin-top: 20px; background: #f5f5f5; padding: 15px; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                            <div style="margin-bottom: 8px;"><strong>Booking Created:</strong> ${createdAt}</div>
                            <div style="margin-bottom: 8px;"><strong>Last Updated:</strong> ${booking.updated_at ? new Date(booking.updated_at).toLocaleString() : 'N/A'}</div>
                            ${booking.payment_date ? `<div style="margin-bottom: 8px;"><strong>Payment Date:</strong> ${new Date(booking.payment_date).toLocaleString()}</div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners to close buttons
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modalCloseBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Show the modal
        modal.style.display = 'block';
        
        // Add status update functionality
        const statusBtn = document.getElementById('modal-status-btn');
        statusBtn.textContent = booking.status === 'confirmed' ? 'Mark as Completed' : 'Confirm Booking';
        
        statusBtn.addEventListener('click', function() {
            // Here you would update the booking status in the database
            // For now, we'll just show a notification
            showNotification(`Booking status would be updated. This feature is coming soon!`, 'info');
        });
        
        // Add delete functionality
        const deleteBtn = document.getElementById('modal-delete-btn');
        deleteBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
                // Here you would delete the booking from the database
                // For now, we'll just show a notification
                showNotification(`Booking deletion coming soon!`, 'info');
            }
        });
    };
    
    // Helper function to show notifications
    function showNotification(message, type = 'success') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    // Set up navigation event listeners
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page') || this.querySelector('span').textContent.toLowerCase();
            navigate(page);
        });
    });
    
    // Add data-page attributes to navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        const page = link.querySelector('span').textContent.toLowerCase();
        link.setAttribute('data-page', page);
    });
    
    // Initialize the dashboard page by default
    navigate('dashboard');
}); 