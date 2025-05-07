/**
 * Calma Car Rental - Admin Dashboard
 * This file handles all the admin dashboard functionality
 */

// Global variables
let allBookings = [];
let currentBooking = null;
let dbConnected = false;
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let filteredBookings = [];

// DOM Ready initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    initNavigation();
    initEventListeners();
    
    // Check database connection and load bookings
    checkDatabaseConnection()
        .then(() => {
            loadBookings();
            updateUIState();
        })
        .catch(error => {
            showToast('Database connection error', 'error');
            console.error('Database connection error:', error);
            updateUIState(false);
        });
});

/**
 * Initialize navigation system
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-item');
    const pageTitle = document.getElementById('page-title');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            
            // Update active link
            navLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            
            // Update page title
            pageTitle.textContent = link.querySelector('span').textContent;
            
            // Show corresponding section
            document.querySelectorAll('#content-container > section').forEach(section => {
                section.classList.add('hidden');
            });
            
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.remove('hidden');
            }
            
            // If it's the bookings section, refresh the table
            if (section === 'bookings') {
                displayAllBookings();
            }
            
            // If it's the database diagnostic section, refresh the status
            if (section === 'db-diagnostic') {
                checkDatabaseConnection(true);
            }
        });
    });
    
    // Also handle "View All" buttons that change sections
    document.querySelectorAll('[data-section]').forEach(element => {
        if (element.classList.contains('sidebar-item')) return; // Skip sidebar links (already handled)
        
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const section = element.getAttribute('data-section');
            
            // Find and click the corresponding sidebar link
            const sidebarLink = document.querySelector(`.sidebar-item[data-section="${section}"]`);
            if (sidebarLink) {
                sidebarLink.click();
            }
        });
    });
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadBookings();
        });
    }
    
    // Create booking button
    const createBookingBtn = document.getElementById('create-booking-btn');
    if (createBookingBtn) {
        createBookingBtn.addEventListener('click', () => {
            showToast('Create booking feature coming soon!', 'info');
        });
    }
    
    // Modal close buttons
    const closeModal = document.getElementById('close-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('booking-modal').classList.add('hidden');
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('booking-modal').classList.add('hidden');
        });
    }
    
    // Database diagnostic buttons
    const testConnectionBtn = document.getElementById('test-connection-btn');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', () => {
            checkDatabaseConnection(true);
        });
    }
    
    const migrateLocalBtn = document.getElementById('migrate-local-btn');
    if (migrateLocalBtn) {
        migrateLocalBtn.addEventListener('click', () => {
            migrateLocalStorageToDatabase();
        });
    }
    
    const createSampleBtn = document.getElementById('create-sample-btn');
    if (createSampleBtn) {
        createSampleBtn.addEventListener('click', () => {
            createSampleBooking();
        });
    }
    
    const clearDbBtn = document.getElementById('clear-db-btn');
    if (clearDbBtn) {
        clearDbBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all bookings from the database? This action cannot be undone.')) {
                clearDatabase();
            }
        });
    }
    
    // Pagination buttons
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayAllBookings();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const maxPage = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
            if (currentPage < maxPage) {
                currentPage++;
                displayAllBookings();
            }
        });
    }
    
    // Search and filters
    const bookingSearch = document.getElementById('booking-search');
    const statusFilter = document.getElementById('status-filter');
    const dateFilter = document.getElementById('date-filter');
    const resetFilters = document.getElementById('reset-filters');
    
    if (bookingSearch) {
        bookingSearch.addEventListener('input', () => {
            currentPage = 1;
            filterBookings();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            filterBookings();
        });
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            currentPage = 1;
            filterBookings();
        });
    }
    
    if (resetFilters) {
        resetFilters.addEventListener('click', () => {
            if (bookingSearch) bookingSearch.value = '';
            if (statusFilter) statusFilter.value = 'all';
            if (dateFilter) dateFilter.value = 'all';
            
            currentPage = 1;
            filterBookings();
        });
    }
    
    // Booking actions
    document.addEventListener('click', (e) => {
        // View booking detail
        if (e.target.classList.contains('view-booking-btn') || e.target.closest('.view-booking-btn')) {
            const btn = e.target.classList.contains('view-booking-btn') ? e.target : e.target.closest('.view-booking-btn');
            const bookingId = btn.getAttribute('data-id');
            
            if (bookingId) {
                viewBookingDetails(bookingId);
            }
        }
        
        // Delete booking
        if (e.target.id === 'delete-booking' || e.target.closest('#delete-booking')) {
            if (currentBooking && confirm(`Are you sure you want to delete booking ${currentBooking.booking_reference || currentBooking.bookingReference}?`)) {
                deleteBooking(currentBooking.id);
            }
        }
        
        // Update booking status
        if (e.target.id === 'update-status' || e.target.closest('#update-status')) {
            if (currentBooking) {
                const newStatus = prompt('Enter new status (confirmed, pending, completed, cancelled):', 
                                       currentBooking.status || 'pending');
                                       
                if (newStatus && ['confirmed', 'pending', 'completed', 'cancelled'].includes(newStatus.toLowerCase())) {
                    updateBookingStatus(currentBooking.id, newStatus.toLowerCase());
                } else if (newStatus) {
                    showToast('Invalid status. Please use confirmed, pending, completed, or cancelled.', 'error');
                }
            }
        }
        
        // Print booking
        if (e.target.id === 'print-booking' || e.target.closest('#print-booking')) {
            if (currentBooking) {
                printBooking(currentBooking);
            }
        }
    });
}

/**
 * Check database connection status
 * @param {boolean} showResult - Whether to display result in UI
 */
async function checkDatabaseConnection(showResult = false) {
    try {
        const operationResult = document.getElementById('db-operation-result');
        if (showResult && operationResult) {
            operationResult.innerHTML = '<div class="loading-spinner w-6 h-6 border-2 border-gray-200 rounded-full inline-block mr-2"></div> Testing database connection...';
            operationResult.classList.remove('hidden', 'bg-red-100', 'bg-green-100');
            operationResult.classList.add('bg-blue-100', 'text-blue-800', 'p-3', 'rounded');
        }
        
        const response = await fetch('/api/admin/db-status');
        const data = await response.json();
        
        dbConnected = data.connected;
        updateUIState(dbConnected);
        
        // Update connection details in UI
        const dbConnectionInfo = document.getElementById('db-connection-info');
        if (dbConnectionInfo) {
            if (data.connected) {
                dbConnectionInfo.textContent = `Host: ${data.connection.host || '(not disclosed)'}\nPort: ${data.connection.port || '5432'}\nDatabase: ${data.connection.database || '(not disclosed)'}\nSSL: ${data.connection.ssl ? 'Enabled' : 'Disabled'}`;
            } else {
                dbConnectionInfo.textContent = `Connection failed: ${data.error || 'Unknown error'}`;
            }
        }
        
        // Update bookings count
        const dbBookingsCount = document.getElementById('db-bookings-count');
        if (dbBookingsCount) {
            dbBookingsCount.textContent = data.bookingsCount !== undefined ? data.bookingsCount : '-';
        }
        
        if (showResult && operationResult) {
            if (data.connected) {
                operationResult.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Successfully connected to the database!';
                operationResult.classList.remove('hidden', 'bg-blue-100', 'bg-red-100');
                operationResult.classList.add('bg-green-100', 'text-green-800');
            } else {
                operationResult.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> Failed to connect to the database: ${data.error || 'Unknown error'}`;
                operationResult.classList.remove('hidden', 'bg-blue-100', 'bg-green-100');
                operationResult.classList.add('bg-red-100', 'text-red-800');
            }
        }
        
        return data.connected;
    } catch (error) {
        console.error('Error checking database connection:', error);
        
        dbConnected = false;
        updateUIState(false);
        
        if (showResult) {
            const operationResult = document.getElementById('db-operation-result');
            if (operationResult) {
                operationResult.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> Failed to check database connection: ${error.message}`;
                operationResult.classList.remove('hidden', 'bg-blue-100', 'bg-green-100');
                operationResult.classList.add('bg-red-100', 'text-red-800');
            }
        }
        
        return false;
    }
}

/**
 * Update UI state based on database connection status
 * @param {boolean} connected - Whether database is connected
 */
function updateUIState(connected = true) {
    const dbStatusIndicator = document.getElementById('db-status-indicator');
    const dbStatusIndicatorLarge = document.getElementById('db-status-indicator-large');
    const dbStatusText = document.getElementById('db-status-text');
    
    if (dbStatusIndicator) {
        dbStatusIndicator.className = 'h-3 w-3 rounded-full absolute top-0 right-0';
        dbStatusIndicator.classList.add(connected ? 'bg-green-500' : 'bg-red-500');
    }
    
    if (dbStatusIndicatorLarge) {
        dbStatusIndicatorLarge.className = 'h-4 w-4 rounded-full mr-2';
        dbStatusIndicatorLarge.classList.add(connected ? 'bg-green-500' : 'bg-red-500');
    }
    
    if (dbStatusText) {
        dbStatusText.textContent = connected ? 'Connected to PostgreSQL' : 'Disconnected';
        dbStatusText.className = connected ? 'text-green-700' : 'text-red-700';
    }
    
    const storageType = document.getElementById('storage-type');
    if (storageType) {
        storageType.textContent = connected ? 'PostgreSQL' : 'LocalStorage (Fallback)';
    }
}

/**
 * Load all bookings from the database or localStorage
 */
async function loadBookings() {
    try {
        // Update UI to loading state
        document.getElementById('recent-bookings-body').innerHTML = `
            <tr>
                <td colspan="7" class="py-10 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <div class="loading-spinner w-10 h-10 border-4 border-gray-200 rounded-full"></div>
                        <p class="mt-3 text-gray-500">Loading recent bookings...</p>
                    </div>
                </td>
            </tr>
        `;
        
        // Attempt to fetch bookings from the server
        const response = await fetch('/api/admin/bookings');
        const data = await response.json();
        
        if (data.success) {
            // Store bookings globally
            allBookings = data.bookings;
            
            // Check if we need to also load from localStorage as a fallback
            if (!data.dbConnected && data.bookings.length === 0) {
                const localBookings = loadFromLocalStorage();
                if (localBookings.length > 0) {
                    allBookings = localBookings;
                    showToast('Using bookings from localStorage as database is offline', 'warning');
                }
            }
            
            // Update UI with booking data
            updateDashboardStats();
            displayRecentBookings();
            filterBookings(); // Also displays all bookings
            
            return allBookings;
        } else {
            throw new Error(data.error || 'Unknown error fetching bookings');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        showToast('Failed to load bookings: ' + error.message, 'error');
        
        // Attempt to load from localStorage as fallback
        const localBookings = loadFromLocalStorage();
        if (localBookings.length > 0) {
            allBookings = localBookings;
            showToast('Using bookings from localStorage as API request failed', 'warning');
            
            // Update UI with booking data
            updateDashboardStats();
            displayRecentBookings();
            filterBookings(); // Also displays all bookings
            
            return allBookings;
        }
        
        // Show empty state
        document.getElementById('recent-bookings-body').innerHTML = `
            <tr>
                <td colspan="7" class="py-10 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-2"></i>
                        <p class="text-red-500">Failed to load bookings</p>
                        <p class="text-gray-500 text-sm mt-1">${error.message}</p>
                    </div>
                </td>
            </tr>
        `;
        
        return [];
    }
}

/**
 * Load bookings from localStorage
 */
function loadFromLocalStorage() {
    try {
        // Check both old and new formats for backward compatibility
        let bookings = localStorage.getItem('bookings');
        
        if (bookings) {
            try {
                bookings = JSON.parse(bookings);
                return Array.isArray(bookings) ? bookings : [];
            } catch (e) {
                console.error('Error parsing bookings from localStorage:', e);
                return [];
            }
        }
        
        // Try checking individual bookings stored separately
        bookings = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Skip non-booking keys
            if (!key.startsWith('booking-')) continue;
            
            try {
                const booking = JSON.parse(localStorage.getItem(key));
                if (booking) {
                    bookings.push(booking);
                }
            } catch (e) {
                console.error(`Error parsing booking ${key} from localStorage:`, e);
            }
        }
        
        return bookings;
    } catch (error) {
        console.error('Error loading bookings from localStorage:', error);
        return [];
    }
}

/**
 * Update the dashboard statistics
 */
function updateDashboardStats() {
    // Total bookings
    const totalBookingsElement = document.getElementById('total-bookings');
    if (totalBookingsElement) {
        totalBookingsElement.textContent = allBookings.length;
    }
    
    // Active rentals - cars that are currently rented out
    const activeRentalsElement = document.getElementById('active-rentals');
    if (activeRentalsElement) {
        const now = new Date();
        const activeRentals = allBookings.filter(booking => {
            const pickupDate = new Date(booking.pickup_date || booking.pickupDate);
            const returnDate = new Date(booking.return_date || booking.returnDate);
            return pickupDate <= now && returnDate >= now;
        });
        
        activeRentalsElement.textContent = activeRentals.length;
    }
    
    // Total revenue
    const totalRevenueElement = document.getElementById('total-revenue');
    if (totalRevenueElement) {
        let totalRevenue = 0;
        
        allBookings.forEach(booking => {
            const price = parseFloat(booking.total_price || booking.totalPrice || 0);
            if (!isNaN(price)) {
                totalRevenue += price;
            }
        });
        
        totalRevenueElement.textContent = `€${totalRevenue.toFixed(2)}`;
    }
    
    // New bookings in the last 7 days
    const newBookingsElement = document.getElementById('new-bookings');
    if (newBookingsElement) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const newBookings = allBookings.filter(booking => {
            const bookingDate = new Date(booking.date_submitted || booking.dateSubmitted || booking.created_at);
            return bookingDate >= sevenDaysAgo;
        });
        
        newBookingsElement.textContent = newBookings.length;
    }
}

/**
 * Display recent bookings on the dashboard
 */
function displayRecentBookings() {
    const recentBookingsBody = document.getElementById('recent-bookings-body');
    if (!recentBookingsBody) return;
    
    // Sort bookings by date (newest first)
    const sortedBookings = [...allBookings].sort((a, b) => {
        const dateA = new Date(a.date_submitted || a.dateSubmitted || a.created_at || 0);
        const dateB = new Date(b.date_submitted || b.dateSubmitted || b.created_at || 0);
        return dateB - dateA;
    });
    
    // Take only the 5 most recent bookings
    const recentBookings = sortedBookings.slice(0, 5);
    
    if (recentBookings.length === 0) {
        recentBookingsBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-10 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-info-circle text-blue-500 text-4xl mb-2"></i>
                        <p class="text-gray-500">No bookings found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate HTML for recent bookings
    let html = '';
    
    recentBookings.forEach(booking => {
        const bookingRef = booking.booking_reference || booking.bookingReference || 'N/A';
        const customerName = getCustomerName(booking);
        const carInfo = getCarInfo(booking);
        const dateInfo = getDateInfo(booking);
        const amount = booking.total_price || booking.totalPrice || 'N/A';
        const status = booking.status || 'pending';
        
        html += `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-4">${bookingRef}</td>
                <td class="py-3 px-4">${customerName}</td>
                <td class="py-3 px-4">${carInfo}</td>
                <td class="py-3 px-4">${dateInfo}</td>
                <td class="py-3 px-4">€${typeof amount === 'number' ? amount.toFixed(2) : amount}</td>
                <td class="py-3 px-4">
                    <span class="badge badge-${getStatusBadgeClass(status)}">
                        ${capitalizeFirstLetter(status)}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <button class="view-booking-btn text-blue-600 hover:text-blue-800" data-id="${booking.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    recentBookingsBody.innerHTML = html;
}

/**
 * Filter bookings based on search and filter criteria
 */
function filterBookings() {
    const searchTerm = (document.getElementById('booking-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    const dateFilter = document.getElementById('date-filter')?.value || 'all';
    
    // Apply filters
    filteredBookings = allBookings.filter(booking => {
        // Search term filter
        const bookingRef = (booking.booking_reference || booking.bookingReference || '').toLowerCase();
        const customerName = getCustomerName(booking).toLowerCase();
        const customerEmail = (booking.customer?.email || booking.email || '').toLowerCase();
        const carInfo = getCarInfo(booking).toLowerCase();
        
        const matchesSearch = searchTerm === '' || 
                             bookingRef.includes(searchTerm) || 
                             customerName.includes(searchTerm) || 
                             customerEmail.includes(searchTerm) ||
                             carInfo.includes(searchTerm);
                             
        if (!matchesSearch) return false;
        
        // Status filter
        const status = (booking.status || 'pending').toLowerCase();
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        
        if (!matchesStatus) return false;
        
        // Date filter
        const bookingDate = new Date(booking.date_submitted || booking.dateSubmitted || booking.created_at || 0);
        const now = new Date();
        
        let matchesDate = true;
        
        if (dateFilter === 'today') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            matchesDate = bookingDate >= today;
        } else if (dateFilter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = bookingDate >= weekAgo;
        } else if (dateFilter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = bookingDate >= monthAgo;
        } else if (dateFilter === 'quarter') {
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            matchesDate = bookingDate >= quarterAgo;
        }
        
        return matchesDate;
    });
    
    // Sort by date (newest first)
    filteredBookings.sort((a, b) => {
        const dateA = new Date(a.date_submitted || a.dateSubmitted || a.created_at || 0);
        const dateB = new Date(b.date_submitted || b.dateSubmitted || b.created_at || 0);
        return dateB - dateA;
    });
    
    // Update UI
    displayAllBookings();
}

/**
 * Display all bookings in the bookings section (with pagination)
 */
function displayAllBookings() {
    const allBookingsBody = document.getElementById('all-bookings-body');
    const bookingsCount = document.getElementById('bookings-count');
    const showingStart = document.getElementById('showing-start');
    const showingEnd = document.getElementById('showing-end');
    const totalItems = document.getElementById('total-items');
    const currentPageElement = document.getElementById('current-page');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (!allBookingsBody) return;
    
    if (filteredBookings.length === 0) {
        allBookingsBody.innerHTML = `
            <tr>
                <td colspan="8" class="py-10 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-search text-gray-400 text-4xl mb-2"></i>
                        <p class="text-gray-500">No bookings found matching your criteria</p>
                    </div>
                </td>
            </tr>
        `;
        
        // Update pagination and counts
        if (bookingsCount) bookingsCount.textContent = '0 bookings found';
        if (showingStart) showingStart.textContent = '0';
        if (showingEnd) showingEnd.textContent = '0';
        if (totalItems) totalItems.textContent = '0';
        if (currentPageElement) currentPageElement.textContent = 'Page 1';
        if (prevPageBtn) prevPageBtn.disabled = true;
        if (nextPageBtn) nextPageBtn.disabled = true;
        
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
    
    // Ensure current page is valid
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredBookings.length);
    const pageBookings = filteredBookings.slice(startIndex, endIndex);
    
    // Generate HTML for bookings
    let html = '';
    
    pageBookings.forEach(booking => {
        const bookingRef = booking.booking_reference || booking.bookingReference || 'N/A';
        const customerName = getCustomerName(booking);
        const carInfo = getCarInfo(booking);
        const pickupInfo = formatDate(booking.pickup_date || booking.pickupDate);
        const returnInfo = formatDate(booking.return_date || booking.returnDate);
        const amount = booking.total_price || booking.totalPrice || 'N/A';
        const status = booking.status || 'pending';
        
        html += `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-4">${bookingRef}</td>
                <td class="py-3 px-4">${customerName}</td>
                <td class="py-3 px-4">${carInfo}</td>
                <td class="py-3 px-4">${pickupInfo}</td>
                <td class="py-3 px-4">${returnInfo}</td>
                <td class="py-3 px-4">€${typeof amount === 'number' ? amount.toFixed(2) : amount}</td>
                <td class="py-3 px-4">
                    <span class="badge badge-${getStatusBadgeClass(status)}">
                        ${capitalizeFirstLetter(status)}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <button class="view-booking-btn text-blue-600 hover:text-blue-800" data-id="${booking.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    allBookingsBody.innerHTML = html;
    
    // Update pagination and counts
    if (bookingsCount) bookingsCount.textContent = `${filteredBookings.length} booking${filteredBookings.length !== 1 ? 's' : ''} found`;
    if (showingStart) showingStart.textContent = startIndex + 1;
    if (showingEnd) showingEnd.textContent = endIndex;
    if (totalItems) totalItems.textContent = filteredBookings.length;
    if (currentPageElement) currentPageElement.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
}

/**
 * View booking details in a modal
 */
function viewBookingDetails(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) {
        showToast('Booking not found', 'error');
        return;
    }
    
    // Store the current booking for actions
    currentBooking = booking;
    
    // Prepare modal
    const modal = document.getElementById('booking-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = `Booking: ${booking.booking_reference || booking.bookingReference || 'N/A'}`;
    
    // For debugging, log the booking object
    console.log('Viewing booking details:', booking);
    
    // Format booking details
    const bookingData = standardizeBookingData(booking);
    
    modalContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 class="font-semibold text-gray-700 mb-3 pb-2 border-b">Customer Information</h4>
                <div class="space-y-2">
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Name:</span>
                        <span class="col-span-2 font-medium">${bookingData.customerName}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Email:</span>
                        <span class="col-span-2 font-medium">${bookingData.customerEmail}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Phone:</span>
                        <span class="col-span-2 font-medium">${bookingData.customerPhone}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Age:</span>
                        <span class="col-span-2 font-medium">${bookingData.customerAge}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">License:</span>
                        <span class="col-span-2 font-medium">${bookingData.driverLicense}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Expiration:</span>
                        <span class="col-span-2 font-medium">${bookingData.licenseExpiration}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Country:</span>
                        <span class="col-span-2 font-medium">${bookingData.country}</span>
                    </div>
                </div>
            </div>
            
            <div>
                <h4 class="font-semibold text-gray-700 mb-3 pb-2 border-b">Booking Details</h4>
                <div class="space-y-2">
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Status:</span>
                        <span class="col-span-2">
                            <span class="badge badge-${getStatusBadgeClass(bookingData.status)}">
                                ${capitalizeFirstLetter(bookingData.status)}
                            </span>
                        </span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Car:</span>
                        <span class="col-span-2 font-medium">${bookingData.carInfo}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Daily Rate:</span>
                        <span class="col-span-2 font-medium">€${bookingData.dailyRate}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Total Price:</span>
                        <span class="col-span-2 font-medium">€${bookingData.totalPrice}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Payment Date:</span>
                        <span class="col-span-2 font-medium">${bookingData.paymentDate}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Booking Date:</span>
                        <span class="col-span-2 font-medium">${bookingData.dateSubmitted}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-semibold text-gray-700 mb-3 pb-2 border-b">Rental Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Pickup Date:</span>
                        <span class="col-span-2 font-medium">${bookingData.pickupDate}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Return Date:</span>
                        <span class="col-span-2 font-medium">${bookingData.returnDate}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Duration:</span>
                        <span class="col-span-2 font-medium">${bookingData.duration}</span>
                    </div>
                </div>
                
                <div class="space-y-2">
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Pickup Location:</span>
                        <span class="col-span-2 font-medium">${bookingData.pickupLocation}</span>
                    </div>
                    <div class="grid grid-cols-3">
                        <span class="text-gray-600">Dropoff Location:</span>
                        <span class="col-span-2 font-medium">${bookingData.dropoffLocation}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-semibold text-gray-700 mb-3 pb-2 border-b">Additional Services</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-3 ${bookingData.additionalDriver ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'} rounded-lg">
                    <div class="flex items-center">
                        <i class="fas ${bookingData.additionalDriver ? 'fa-check-circle text-green-500' : 'fa-times-circle text-gray-400'} mr-2"></i>
                        <span class="font-medium">Additional Driver (+€15/day)</span>
                    </div>
                </div>
                
                <div class="p-3 ${bookingData.fullInsurance ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'} rounded-lg">
                    <div class="flex items-center">
                        <i class="fas ${bookingData.fullInsurance ? 'fa-check-circle text-green-500' : 'fa-times-circle text-gray-400'} mr-2"></i>
                        <span class="font-medium">Full Insurance (+€25/day)</span>
                    </div>
                </div>
                
                <div class="p-3 ${bookingData.gpsNavigation ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'} rounded-lg">
                    <div class="flex items-center">
                        <i class="fas ${bookingData.gpsNavigation ? 'fa-check-circle text-green-500' : 'fa-times-circle text-gray-400'} mr-2"></i>
                        <span class="font-medium">GPS Navigation (+€8/day)</span>
                    </div>
                </div>
                
                <div class="p-3 ${bookingData.childSeat ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'} rounded-lg">
                    <div class="flex items-center">
                        <i class="fas ${bookingData.childSeat ? 'fa-check-circle text-green-500' : 'fa-times-circle text-gray-400'} mr-2"></i>
                        <span class="font-medium">Child Seat (+€5/day)</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${bookingData.specialRequests ? `
        <div class="mt-6">
            <h4 class="font-semibold text-gray-700 mb-3 pb-2 border-b">Special Requests</h4>
            <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p>${bookingData.specialRequests}</p>
            </div>
        </div>
        ` : ''}
        
        ${bookingData.bookingId ? `
        <div class="mt-6">
            <h4 class="font-semibold text-gray-700 mb-3 pb-2 border-b">System Information</h4>
            <div class="space-y-2">
                <div class="grid grid-cols-3">
                    <span class="text-gray-600">Booking ID:</span>
                    <span class="col-span-2 font-mono text-sm">${bookingData.bookingId}</span>
                </div>
                <div class="grid grid-cols-3">
                    <span class="text-gray-600">Storage:</span>
                    <span class="col-span-2 font-mono text-sm">${dbConnected ? 'PostgreSQL Database' : 'LocalStorage'}</span>
                </div>
            </div>
        </div>
        ` : ''}
    `;
    
    // Show the modal
    modal.classList.remove('hidden');
}

/**
 * Standardize booking data for display (handle different formats)
 */
function standardizeBookingData(booking) {
    // Create a standardized object
    return {
        // Booking reference
        bookingReference: booking.booking_reference || booking.bookingReference || 'N/A',
        
        // Customer information
        customerName: getCustomerName(booking),
        customerEmail: booking.customer?.email || booking.email || 'N/A',
        customerPhone: booking.customer?.phone || booking.phone || 'N/A',
        customerAge: booking.customer?.age || booking.age || 'N/A',
        driverLicense: booking.customer?.driverLicense || booking.driverLicense || 'N/A',
        licenseExpiration: formatDate(booking.customer?.licenseExpiration || booking.licenseExpiration),
        country: booking.customer?.country || booking.country || 'N/A',
        
        // Car information
        carInfo: getCarInfo(booking),
        dailyRate: (booking.daily_rate || booking.dailyRate || 0).toFixed(2),
        
        // Dates and locations
        pickupDate: formatDate(booking.pickup_date || booking.pickupDate),
        returnDate: formatDate(booking.return_date || booking.returnDate),
        duration: getDuration(booking),
        pickupLocation: booking.pickup_location || booking.pickupLocation || 'N/A',
        dropoffLocation: booking.dropoff_location || booking.dropoffLocation || 'N/A',
        
        // Financial information
        totalPrice: (booking.total_price || booking.totalPrice || 0).toFixed(2),
        paymentDate: formatDate(booking.payment_date || booking.paymentDate),
        
        // Status information
        status: booking.status || 'pending',
        dateSubmitted: formatDate(booking.date_submitted || booking.dateSubmitted || booking.created_at),
        
        // Additional services
        additionalDriver: booking.additional_driver || booking.additionalDriver || false,
        fullInsurance: booking.full_insurance || booking.fullInsurance || false,
        gpsNavigation: booking.gps_navigation || booking.gpsNavigation || false,
        childSeat: booking.child_seat || booking.childSeat || false,
        
        // Special requests
        specialRequests: booking.special_requests || booking.specialRequests || '',
        
        // System information
        bookingId: booking.id || ''
    };
}

/**
 * Get customer name from booking object
 */
function getCustomerName(booking) {
    if (booking.customer) {
        return `${booking.customer.firstName || ''} ${booking.customer.lastName || ''}`.trim();
    }
    
    return `${booking.firstName || booking.first_name || ''} ${booking.lastName || booking.last_name || ''}`.trim() || 'N/A';
}

/**
 * Get car information from booking object
 */
function getCarInfo(booking) {
    if (booking.car) {
        return `${booking.car.make || ''} ${booking.car.model || ''}`.trim();
    }
    
    return `${booking.car_make || booking.carMake || ''} ${booking.car_model || booking.carModel || ''}`.trim() || 'N/A';
}

/**
 * Get date information for display
 */
function getDateInfo(booking) {
    const pickupDate = formatDate(booking.pickup_date || booking.pickupDate, true);
    const returnDate = formatDate(booking.return_date || booking.returnDate, true);
    
    return `${pickupDate} - ${returnDate}`;
}

/**
 * Get duration of booking
 */
function getDuration(booking) {
    const pickupDate = new Date(booking.pickup_date || booking.pickupDate);
    const returnDate = new Date(booking.return_date || booking.returnDate);
    
    if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) {
        return 'N/A';
    }
    
    const diffTime = Math.abs(returnDate - pickupDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

/**
 * Format date for display
 */
function formatDate(dateString, short = false) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        
        if (short) {
            return date.toLocaleDateString();
        }
        
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString(undefined, options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Error';
    }
}

/**
 * Get badge class for status
 */
function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'confirmed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'completed':
            return 'info';
        case 'cancelled':
            return 'danger';
        default:
            return 'info';
    }
}

/**
 * Create a sample booking for testing
 */
async function createSampleBooking() {
    try {
        const operationResult = document.getElementById('db-operation-result');
        if (operationResult) {
            operationResult.innerHTML = '<div class="loading-spinner w-6 h-6 border-2 border-gray-200 rounded-full inline-block mr-2"></div> Creating sample booking...';
            operationResult.classList.remove('hidden', 'bg-red-100', 'bg-green-100');
            operationResult.classList.add('bg-blue-100', 'text-blue-800');
        }
        
        // Generate unique booking reference
        const bookingRef = 'BK' + Date.now().toString().slice(-6);
        
        // Create sample booking
        const sampleBooking = {
            booking_reference: bookingRef,
            customer: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+30 123 456 7890',
                age: '35',
                driverLicense: 'DL123456789',
                licenseExpiration: new Date(new Date().getFullYear() + 2, 0, 1).toISOString(),
                country: 'Greece'
            },
            car_make: 'Toyota',
            car_model: 'Corolla',
            pickup_date: new Date().toISOString(),
            return_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            pickup_location: 'Athens Airport',
            dropoff_location: 'Athens Airport',
            daily_rate: 45,
            total_price: 225,
            status: 'confirmed',
            date_submitted: new Date().toISOString(),
            payment_date: new Date().toISOString(),
            additional_driver: true,
            full_insurance: true,
            gps_navigation: false,
            child_seat: false,
            special_requests: 'Please have the car ready early in the morning.'
        };
        
        // Save booking
        const response = await fetch('/api/admin/bookings/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sampleBooking)
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (operationResult) {
                operationResult.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Sample booking created successfully!';
                operationResult.classList.remove('bg-blue-100', 'bg-red-100');
                operationResult.classList.add('bg-green-100', 'text-green-800');
            }
            
            showToast('Sample booking created!', 'success');
            
            // Reload bookings
            loadBookings();
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error creating sample booking:', error);
        
        const operationResult = document.getElementById('db-operation-result');
        if (operationResult) {
            operationResult.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> Failed to create sample booking: ${error.message}`;
            operationResult.classList.remove('hidden', 'bg-blue-100', 'bg-green-100');
            operationResult.classList.add('bg-red-100', 'text-red-800');
        }
        
        showToast('Failed to create sample booking: ' + error.message, 'error');
    }
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'rounded-lg shadow-lg p-4 mb-4 flex items-center space-x-3 transition-all duration-500 transform translate-x-0';
    
    // Set color based on type
    switch (type) {
        case 'success':
            toast.classList.add('bg-green-100', 'text-green-800', 'border-l-4', 'border-green-500');
            toast.innerHTML = `<i class="fas fa-check-circle text-green-500"></i><span class="flex-1">${message}</span>`;
            break;
        case 'error':
            toast.classList.add('bg-red-100', 'text-red-800', 'border-l-4', 'border-red-500');
            toast.innerHTML = `<i class="fas fa-exclamation-circle text-red-500"></i><span class="flex-1">${message}</span>`;
            break;
        case 'warning':
            toast.classList.add('bg-yellow-100', 'text-yellow-800', 'border-l-4', 'border-yellow-500');
            toast.innerHTML = `<i class="fas fa-exclamation-triangle text-yellow-500"></i><span class="flex-1">${message}</span>`;
            break;
        default:
            toast.classList.add('bg-blue-100', 'text-blue-800', 'border-l-4', 'border-blue-500');
            toast.innerHTML = `<i class="fas fa-info-circle text-blue-500"></i><span class="flex-1">${message}</span>`;
    }
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'text-gray-400 hover:text-gray-500';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
    
    toast.appendChild(closeBtn);
    
    // Add to toast container
    const toastContainer = document.getElementById('toast-container');
    toastContainer.appendChild(toast);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

/**
 * Helper function to capitalize first letter
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Migrate data from localStorage to PostgreSQL database
 */
async function migrateLocalStorageToDatabase() {
    try {
        const operationResult = document.getElementById('db-operation-result');
        if (operationResult) {
            operationResult.innerHTML = '<div class="loading-spinner w-6 h-6 border-2 border-gray-200 rounded-full inline-block mr-2"></div> Migrating data from localStorage to database...';
            operationResult.classList.remove('hidden', 'bg-red-100', 'bg-green-100');
            operationResult.classList.add('bg-blue-100', 'text-blue-800');
        }
        
        // Load bookings from localStorage
        const localBookings = loadFromLocalStorage();
        
        if (localBookings.length === 0) {
            if (operationResult) {
                operationResult.innerHTML = '<i class="fas fa-info-circle mr-2"></i> No bookings found in localStorage.';
                operationResult.classList.remove('bg-blue-100', 'bg-red-100');
                operationResult.classList.add('bg-yellow-100', 'text-yellow-800');
            }
            return;
        }
        
        // Check database connection
        const dbStatus = await fetch('/api/admin/db-status');
        const dbStatusData = await dbStatus.json();
        
        if (!dbStatusData.connected) {
            if (operationResult) {
                operationResult.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i> Cannot migrate: Database is not connected.';
                operationResult.classList.remove('hidden', 'bg-blue-100', 'bg-green-100');
                operationResult.classList.add('bg-red-100', 'text-red-800');
            }
            return;
        }
        
        // Migrate each booking
        let successCount = 0;
        let failureCount = 0;
        
        for (const booking of localBookings) {
            try {
                // Normalize booking data
                const normalizedBooking = {
                    booking_reference: booking.booking_reference || booking.bookingReference || ('BK' + Date.now().toString().slice(-6)),
                    customer: {
                        firstName: booking.firstName || booking.first_name || booking.customer?.firstName || '',
                        lastName: booking.lastName || booking.last_name || booking.customer?.lastName || '',
                        email: booking.email || booking.customer?.email || '',
                        phone: booking.phone || booking.customer?.phone || '',
                        age: booking.age || booking.customer?.age || '',
                        driverLicense: booking.driverLicense || booking.driver_license || booking.customer?.driverLicense || '',
                        licenseExpiration: booking.licenseExpiration || booking.license_expiration || booking.customer?.licenseExpiration || '',
                        country: booking.country || booking.customer?.country || ''
                    },
                    car_make: booking.car_make || booking.carMake || booking.car?.make || '',
                    car_model: booking.car_model || booking.carModel || booking.car?.model || '',
                    pickup_date: booking.pickup_date || booking.pickupDate || '',
                    return_date: booking.return_date || booking.returnDate || '',
                    pickup_location: booking.pickup_location || booking.pickupLocation || '',
                    dropoff_location: booking.dropoff_location || booking.dropoffLocation || '',
                    daily_rate: booking.daily_rate || booking.dailyRate || 0,
                    total_price: booking.total_price || booking.totalPrice || 0,
                    status: booking.status || 'pending',
                    date_submitted: booking.date_submitted || booking.dateSubmitted || booking.created_at || new Date().toISOString(),
                    payment_date: booking.payment_date || booking.paymentDate || '',
                    additional_driver: booking.additional_driver || booking.additionalDriver || false,
                    full_insurance: booking.full_insurance || booking.fullInsurance || false,
                    gps_navigation: booking.gps_navigation || booking.gpsNavigation || false,
                    child_seat: booking.child_seat || booking.childSeat || false,
                    special_requests: booking.special_requests || booking.specialRequests || ''
                };
                
                // Send to server
                const response = await fetch('/api/admin/bookings/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(normalizedBooking)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    successCount++;
                } else {
                    failureCount++;
                    console.error('Error migrating booking:', data.error);
                }
            } catch (error) {
                failureCount++;
                console.error('Error processing booking for migration:', error);
            }
        }
        
        if (operationResult) {
            if (successCount > 0) {
                operationResult.innerHTML = `<i class="fas fa-check-circle mr-2"></i> Migration complete! ${successCount} booking(s) migrated successfully.${failureCount > 0 ? ` ${failureCount} booking(s) failed.` : ''}`;
                operationResult.classList.remove('bg-blue-100', 'bg-red-100');
                operationResult.classList.add('bg-green-100', 'text-green-800');
            } else {
                operationResult.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> Migration failed! No bookings were migrated.${failureCount > 0 ? ` ${failureCount} booking(s) failed.` : ''}`;
                operationResult.classList.remove('bg-blue-100', 'bg-green-100');
                operationResult.classList.add('bg-red-100', 'text-red-800');
            }
        }
        
        // Reload bookings to show updated data
        if (successCount > 0) {
            loadBookings();
        }
    } catch (error) {
        console.error('Error migrating data:', error);
        
        const operationResult = document.getElementById('db-operation-result');
        if (operationResult) {
            operationResult.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> Error during migration: ${error.message}`;
            operationResult.classList.remove('hidden', 'bg-blue-100', 'bg-green-100');
            operationResult.classList.add('bg-red-100', 'text-red-800');
        }
    }
}

/**
 * Clear database of all bookings
 */
async function clearDatabase() {
    try {
        const operationResult = document.getElementById('db-operation-result');
        if (operationResult) {
            operationResult.innerHTML = '<div class="loading-spinner w-6 h-6 border-2 border-gray-200 rounded-full inline-block mr-2"></div> Clearing database...';
            operationResult.classList.remove('hidden', 'bg-red-100', 'bg-green-100');
            operationResult.classList.add('bg-blue-100', 'text-blue-800');
        }
        
        // Send delete request
        const response = await fetch('/api/admin/db/clear', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (operationResult) {
                operationResult.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Database cleared successfully!';
                operationResult.classList.remove('bg-blue-100', 'bg-red-100');
                operationResult.classList.add('bg-green-100', 'text-green-800');
            }
            
            showToast('Database cleared successfully', 'success');
            
            // Reload bookings
            loadBookings();
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error clearing database:', error);
        
        const operationResult = document.getElementById('db-operation-result');
        if (operationResult) {
            operationResult.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> Failed to clear database: ${error.message}`;
            operationResult.classList.remove('hidden', 'bg-blue-100', 'bg-green-100');
            operationResult.classList.add('bg-red-100', 'text-red-800');
        }
        
        showToast('Failed to clear database: ' + error.message, 'error');
    }
}

/**
 * Update booking status
 * @param {string} bookingId - ID of the booking to update
 * @param {string} newStatus - New status to set
 */
async function updateBookingStatus(bookingId, newStatus) {
    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Booking status updated to "${newStatus}"`, 'success');
            
            // Update in local array
            const bookingIndex = allBookings.findIndex(b => b.id === bookingId);
            if (bookingIndex !== -1) {
                allBookings[bookingIndex].status = newStatus;
                // Also update current booking if it's the one being viewed
                if (currentBooking && currentBooking.id === bookingId) {
                    currentBooking.status = newStatus;
                    
                    // Update status in modal if open
                    const statusBadge = document.querySelector('#booking-modal .badge');
                    if (statusBadge) {
                        statusBadge.className = `badge badge-${getStatusBadgeClass(newStatus)}`;
                        statusBadge.textContent = capitalizeFirstLetter(newStatus);
                    }
                }
            }
            
            // Refresh tables
            displayRecentBookings();
            displayAllBookings();
            
            return true;
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        showToast('Failed to update status: ' + error.message, 'error');
        
        return false;
    }
}

/**
 * Delete a booking
 * @param {string} bookingId - ID of the booking to delete
 */
async function deleteBooking(bookingId) {
    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Booking deleted successfully', 'success');
            
            // Remove from local array
            const bookingIndex = allBookings.findIndex(b => b.id === bookingId);
            if (bookingIndex !== -1) {
                allBookings.splice(bookingIndex, 1);
                
                // Close modal if it's the one being viewed
                if (currentBooking && currentBooking.id === bookingId) {
                    document.getElementById('booking-modal').classList.add('hidden');
                    currentBooking = null;
                }
            }
            
            // Refresh tables and stats
            updateDashboardStats();
            displayRecentBookings();
            filterBookings(); // This also refreshes all bookings display
            
            return true;
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        showToast('Failed to delete booking: ' + error.message, 'error');
        
        return false;
    }
}

/**
 * Print booking details
 * @param {Object} booking - Booking to print
 */
function printBooking(booking) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Format booking data for printing
    const bookingData = standardizeBookingData(booking);
    
    // Create print content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Booking ${bookingData.bookingReference} - Print</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 10px;
                }
                .logo {
                    font-weight: bold;
                    font-size: 24px;
                    color: #3366cc;
                }
                .booking-ref {
                    font-size: 18px;
                    margin-top: 5px;
                }
                .section {
                    margin-bottom: 25px;
                }
                .section-title {
                    font-weight: bold;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .info-item {
                    margin-bottom: 5px;
                }
                .info-label {
                    font-weight: bold;
                    color: #666;
                }
                .status {
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 14px;
                    font-weight: bold;
                }
                .status-confirmed {
                    background-color: #d1fae5;
                    color: #047857;
                }
                .status-pending {
                    background-color: #fef3c7;
                    color: #92400e;
                }
                .status-completed {
                    background-color: #dbeafe;
                    color: #1e40af;
                }
                .status-cancelled {
                    background-color: #fee2e2;
                    color: #b91c1c;
                }
                .additional-options {
                    margin-top: 20px;
                }
                .option-item {
                    padding: 8px;
                    margin-bottom: 5px;
                    border-radius: 3px;
                }
                .option-enabled {
                    background-color: #d1fae5;
                }
                .option-disabled {
                    background-color: #f3f4f6;
                    color: #6b7280;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #eee;
                    padding-top: 10px;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">Calma Car Rental</div>
                <div class="booking-ref">Booking Reference: ${bookingData.bookingReference}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Customer Information</div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Name:</span>
                        ${bookingData.customerName}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email:</span>
                        ${bookingData.customerEmail}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Phone:</span>
                        ${bookingData.customerPhone}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Age:</span>
                        ${bookingData.customerAge}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Driver's License:</span>
                        ${bookingData.driverLicense}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Country:</span>
                        ${bookingData.country}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Booking Details</div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="status status-${bookingData.status}">${capitalizeFirstLetter(bookingData.status)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Car:</span>
                        ${bookingData.carInfo}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Pickup Date:</span>
                        ${bookingData.pickupDate}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Return Date:</span>
                        ${bookingData.returnDate}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Pickup Location:</span>
                        ${bookingData.pickupLocation}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Dropoff Location:</span>
                        ${bookingData.dropoffLocation}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Duration:</span>
                        ${bookingData.duration}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Payment Information</div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Daily Rate:</span>
                        €${bookingData.dailyRate}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Total Price:</span>
                        €${bookingData.totalPrice}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Booking Date:</span>
                        ${bookingData.dateSubmitted}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Payment Date:</span>
                        ${bookingData.paymentDate}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Additional Services</div>
                <div class="additional-options">
                    <div class="option-item ${bookingData.additionalDriver ? 'option-enabled' : 'option-disabled'}">
                        Additional Driver (+€15/day): ${bookingData.additionalDriver ? 'Yes' : 'No'}
                    </div>
                    <div class="option-item ${bookingData.fullInsurance ? 'option-enabled' : 'option-disabled'}">
                        Full Insurance (+€25/day): ${bookingData.fullInsurance ? 'Yes' : 'No'}
                    </div>
                    <div class="option-item ${bookingData.gpsNavigation ? 'option-enabled' : 'option-disabled'}">
                        GPS Navigation (+€8/day): ${bookingData.gpsNavigation ? 'Yes' : 'No'}
                    </div>
                    <div class="option-item ${bookingData.childSeat ? 'option-enabled' : 'option-disabled'}">
                        Child Seat (+€5/day): ${bookingData.childSeat ? 'Yes' : 'No'}
                    </div>
                </div>
            </div>
            
            ${bookingData.specialRequests ? `
            <div class="section">
                <div class="section-title">Special Requests</div>
                <p>${bookingData.specialRequests}</p>
            </div>
            ` : ''}
            
            <div class="footer">
                <p>Thank you for choosing Calma Car Rental!</p>
                <p>For any questions or changes to your booking, please contact us at support@calmacarrental.com</p>
                <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
        </body>
        </html>
    `;
    
    // Write to the new window and print
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
        printWindow.print();
    };
} 