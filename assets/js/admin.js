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
            allBookings = data.bookings;
            filteredBookings = data.bookings;
            carModels = new Set(data.bookings.map(booking => booking.carModel));
            updateDashboard();
        } else {
            console.error('Failed to load bookings');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    } finally {
        hideLoader();
    }
}

       