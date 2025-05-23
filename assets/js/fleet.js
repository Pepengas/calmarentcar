/**
 * Fleet Module - Handles car fleet functionality
 */

import { API_BASE_URL } from './config.js';
import { showNotification } from './ui.js';

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
    
    displayCars(cars) {
        if (!this.carGrid) return;
        this.carGrid.innerHTML = ''; // Clear existing cars
        
        if (cars.length === 0) {
            this.carGrid.innerHTML = '<p>No cars available at the moment.</p>';
            return;
        }
        
        cars.forEach(car => {
            const card = document.createElement('div');
            card.className = 'car-card';
            
            // Make sure car image URL is absolute
            const imageUrl = car.image.startsWith('http') ? 
                car.image : 
                `${API_BASE_URL}/${car.image}`;
            
            let featuresHtml = '';
            if (car.features && car.features.length > 0) {
                featuresHtml = `<ul class="car-features"><li>${car.features.join('</li><li>')}</li></ul>`;
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
                    <button class="btn btn-primary book-from-grid" data-car-id="${car.id}">Book Now</button>
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
        
        cars.forEach(car => {
            const option = document.createElement('option');
            option.value = car.id;
            option.textContent = `${car.name} - From €${car.pricePerDay}/day`;
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