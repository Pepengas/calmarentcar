/**
 * Fleet Module - Handles car fleet functionality
 */

import { API_BASE_URL } from './config.js';
import { showNotification } from './ui.js';

// Convert a date string to YYYY-MM-DD
// Accepts formats:
//  - MM/DD/YYYY
//  - YYYY-MM-DD
//  - full ISO strings like YYYY-MM-DDTHH:mm:ssZ
function toISODateString(dateStr) {
    if (typeof dateStr !== 'string') return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
        return isoMatch[1];
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return '';
}

// Parse a date string in UTC to avoid timezone shifts
function parseDateUTC(dateInput) {
    if (dateInput instanceof Date) {
        return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
    }
    const iso = toISODateString(dateInput);
    return iso ? new Date(`${iso}T00:00:00Z`) : new Date(NaN);
}


export const Fleet = {
    carGrid: null,
    carSelectionDropdown: null,
    cars: [],
    
    async init() {
        this.carGrid = document.querySelector('.cars-grid');
        this.carSelectionDropdown = document.getElementById('car-selection');
        
        // Fetch and display cars
        await this.loadCars();
    },
    
    async loadCars() {
        try {
            this.cars = await this.fetchCars();
            const manualBlocks = await this.fetchManualBlocks();
            this.cars.forEach(car => { car.manual_blocks = manualBlocks.filter(b => b.car_id === car.id); });
            this.displayCars(this.cars);
            this.populateCarDropdown(this.cars);
        } catch (error) {
            console.error('Error loading cars:', error);
            showNotification('Failed to load car fleet. Please try refreshing.', 'error');
        }
    },
    
    async fetchCars() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cars`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const cars = await response.json();
            return cars;
        } catch (error) {
            console.error('Failed to fetch cars:', error);
            if (this.carGrid) this.carGrid.innerHTML = '<p class="error-message">Failed to load car fleet. Please try refreshing.</p>';
            if (this.carSelectionDropdown) this.carSelectionDropdown.innerHTML = '<option value="" disabled selected>Failed to load cars</option>';
            return [];
        }
    },
    
    async fetchManualBlocks() {
        try {
            const response = await fetch('/api/manual-blocks');
            if (!response.ok) return [];
            const data = await response.json();
            if (!data.success || !Array.isArray(data.blocks)) return [];
            return data.blocks.map(b => ({
                id: b.id,
                car_id: b.car_id,
                start: b.start_date,
                end: b.end_date
            }));
        } catch (e) {
            return [];
        }
    },
    
    displayCars(cars) {
        if (!this.carGrid) return;
        this.carGrid.innerHTML = '';
        if (cars.length === 0) {
            this.carGrid.innerHTML = '<p>No cars available at the moment.</p>';
            return;
        }
        // Get selected dates from booking form if present
        const pickupDateInput = document.getElementById('pickup-date');
        const dropoffDateInput = document.getElementById('dropoff-date');
        let pickupDate = pickupDateInput ? pickupDateInput.value : null;
        let dropoffDate = dropoffDateInput ? dropoffDateInput.value : null;
        let userRange = null;
        if (pickupDate && dropoffDate) {
            userRange = [parseDateUTC(pickupDate), parseDateUTC(dropoffDate)];
        }
        cars.forEach(car => {
            console.log('Rendering car:', car);
            console.log('Manual blocks for this car:', car.manual_blocks);
            const card = document.createElement('div');
            card.className = 'car-card';
            const imageUrl = car.image.startsWith('http') ? car.image : `${API_BASE_URL}/${car.image}`;
            let featuresHtml = '';
            if (car.features && car.features.length > 0) {
                featuresHtml = `<ul class="car-features"><li>${car.features.join('</li><li>')}</li></ul>`;
            }
            // --- Availability logic ---
            let isAvailable = true;
            let unavailableReason = '';
            if (car.manual_status === 'unavailable') {
                isAvailable = false;
                unavailableReason = 'Unavailable';
            } else if (car.manual_status === 'available') {
                isAvailable = true;
            } else if (userRange && Array.isArray(car.manual_blocks) && car.manual_blocks.length > 0) {
                for (const block of car.manual_blocks) {
                    const rangeStart = parseDateUTC(block.start);
                    const rangeEnd = parseDateUTC(block.end);
                    if (rangesOverlap(userRange[0], userRange[1], rangeStart, rangeEnd)) {
                        isAvailable = false;
                        unavailableReason = 'Unavailable';
                        break;
                    }
                }
            }
            card.innerHTML = `
                <div class="car-image">
                    <img src="${imageUrl}" alt="${car.name}" loading="lazy" width="300" height="200">
                </div>
                <div class="car-details">
                    <h3>${car.name}</h3>
                    <p>${car.description}</p>
                    ${featuresHtml}
                    <div class="car-pricing">
                        <span class="price">From €${car.pricePerDay}/day</span>
                        <span class="price-note">· Free cancellation</span>
                    </div>
                    <button class="btn btn-primary book-from-grid" data-car-id="${car.id}" ${!isAvailable ? 'disabled' : ''}>${isAvailable ? 'Book Now' : unavailableReason}</button>
                </div>
            `;
            this.carGrid.appendChild(card);
        });
        this.addGridBookNowListeners();
    },
    
    populateCarDropdown(cars) {
        if (!this.carSelectionDropdown) return;
        const firstOption = this.carSelectionDropdown.querySelector('option[disabled]');
        this.carSelectionDropdown.innerHTML = '';
        if (firstOption) {
            this.carSelectionDropdown.appendChild(firstOption);
        }
        if (cars.length === 0 && firstOption) {
            firstOption.textContent = 'No cars available';
            return;
        }
        // Get selected dates from booking form if present
        const pickupDateInput = document.getElementById('pickup-date');
        const dropoffDateInput = document.getElementById('dropoff-date');
        let pickupDate = pickupDateInput ? pickupDateInput.value : null;
        let dropoffDate = dropoffDateInput ? dropoffDateInput.value : null;
        let userRange = null;
        if (pickupDate && dropoffDate) {
            userRange = [parseDateUTC(pickupDate), parseDateUTC(dropoffDate)];
        }
        cars.forEach(car => {
            let isAvailable = true;
            if (car.manual_status === 'unavailable') {
                isAvailable = false;
            } else if (car.manual_status === 'available') {
                isAvailable = true;
            } else if (userRange && Array.isArray(car.manual_blocks) && car.manual_blocks.length > 0) {
                for (const block of car.manual_blocks) {
                    const rangeStart = parseDateUTC(block.start);
                    const rangeEnd = parseDateUTC(block.end);
                    if (rangesOverlap(userRange[0], userRange[1], rangeStart, rangeEnd)) {
                        isAvailable = false;
                        break;
                    }
                }
            }
            const option = document.createElement('option');
            option.value = car.id;
            option.textContent = `${car.name} - From €${car.pricePerDay}/day`;
            if (!isAvailable) {
                option.disabled = true;
                option.textContent += ' (Unavailable)';
            }
            this.carSelectionDropdown.appendChild(option);
        });
    },
    
    addGridBookNowListeners() {
        if (!this.carGrid) return;
        
        const bookButtons = this.carGrid.querySelectorAll('.book-from-grid');
        bookButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const carId = button.getAttribute('data-car-id');
                
                if (this.carSelectionDropdown) {
                    this.carSelectionDropdown.value = carId;
                    this.carSelectionDropdown.dispatchEvent(new Event('change'));
                }
                
                const bookingFormSection = document.querySelector('.booking-form');
                if (bookingFormSection) {
                    bookingFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                const firstField = document.getElementById('pickup-location');
                if(firstField) firstField.focus();
            });
        });
    },
    
    getCarById(carId) {
        return this.cars.find(car => car.id === carId);
    }
};

// Add a helper function to normalize dates to the start of the day
function normalizeDate(date) {
    if (typeof date === 'string') {
        return parseDateUTC(date);
    }
    const d = new Date(date);
    // Always use UTC to avoid timezone issues
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function rangesOverlap(userStart, userEnd, blockStart, blockEnd) {
    userStart = normalizeDate(userStart);
    userEnd = normalizeDate(userEnd);
    blockStart = normalizeDate(blockStart);
    blockEnd = normalizeDate(blockEnd);
    return userEnd >= blockStart && userStart <= blockEnd;
} 