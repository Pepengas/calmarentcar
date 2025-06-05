/**
 * Lightweight DateRangePicker
 * A simple, custom date range picker implementation for Calma Car Rental
 */

export class DateRangePicker {
    constructor(options = {}) {
        this.startInput = document.querySelector(options.startSelector || '#pickup-date');
        this.endInput = document.querySelector(options.endSelector || '#dropoff-date');
        this.startTimeInput = document.querySelector(options.startTimeSelector || '#pickup-time');
        this.endTimeInput = document.querySelector(options.endTimeSelector || '#dropoff-time');
        this.container = document.querySelector(options.containerSelector || '.date-range-container');
        this.onDateChange = options.onChange || (() => {});
        this.surchargeCallback = options.surchargeCallback || (() => {});
        
        // Config
        this.format = options.format || 'YYYY-MM-DD';
        this.minDate = options.minDate || new Date();
        this.maxDate = options.maxDate || this.addMonths(new Date(), 12);
        this.minHour = options.minHour || 8;
        this.maxHour = options.maxHour || 20;
        this.lateSurcharge = options.lateSurcharge || 10;
        this.lateCutoff = options.lateCutoff || 20;
        
        // State
        this.currentMonth = new Date();
        this.selectedStart = null;
        this.selectedEnd = null;
        this.appliedSurcharge = false;
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('DateRangePicker: Container not found');
            return;
        }
        
        // Create picker UI
        this.createPickerUI();
        
        // Add event listeners
        this.attachEvents();
        
        // Initial render
        this.renderCalendar();
        this.renderTimePickers();
    }
    
    createPickerUI() {
        // Create base structure
        this.container.innerHTML = `
            <div class="date-range-picker">
                <div class="calendar-header">
                    <button type="button" class="prev-month">&laquo;</button>
                    <div class="current-month"></div>
                    <button type="button" class="next-month">&raquo;</button>
                </div>
                <div class="calendar-grid">
                    <div class="weekdays">
                        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>
                    <div class="days"></div>
                </div>
                <div class="time-pickers">
                    <div class="time-picker pickup-time">
                        <label for="pickup-time-select">Pick-up Time</label>
                        <select id="pickup-time-select"></select>
                    </div>
                    <div class="time-picker dropoff-time">
                        <label for="dropoff-time-select">Drop-off Time</label>
                        <select id="dropoff-time-select"></select>
                    </div>
                </div>
                <div class="late-surcharge" style="display: none;">
                    <p><i class="fas fa-info-circle"></i> Late drop-off surcharge: €${this.lateSurcharge}</p>
                </div>
                <div class="date-range-actions">
                    <button type="button" class="btn apply-dates">Apply</button>
                    <button type="button" class="btn cancel-dates">Cancel</button>
                </div>
            </div>
        `;
        
        // Get elements
        this.pickerElement = this.container.querySelector('.date-range-picker');
        this.monthElement = this.container.querySelector('.current-month');
        this.daysElement = this.container.querySelector('.days');
        this.prevButton = this.container.querySelector('.prev-month');
        this.nextButton = this.container.querySelector('.next-month');
        this.applyButton = this.container.querySelector('.apply-dates');
        this.cancelButton = this.container.querySelector('.cancel-dates');
        this.pickupTimeSelect = this.container.querySelector('#pickup-time-select');
        this.dropoffTimeSelect = this.container.querySelector('#dropoff-time-select');
        this.surchargeElement = this.container.querySelector('.late-surcharge');
    }
    
    attachEvents() {
        // Calendar navigation
        this.prevButton.addEventListener('click', () => {
            this.currentMonth = this.addMonths(this.currentMonth, -1);
            this.renderCalendar();
        });
        
        this.nextButton.addEventListener('click', () => {
            this.currentMonth = this.addMonths(this.currentMonth, 1);
            this.renderCalendar();
        });
        
        // Apply/Cancel buttons
        this.applyButton.addEventListener('click', () => {
            if (this.selectedStart && this.selectedEnd) {
                // Format dates for input fields
                const startDate = this.formatDate(this.selectedStart);
                const endDate = this.formatDate(this.selectedEnd);
                
                // Get selected times
                const startTime = this.pickupTimeSelect.value;
                const endTime = this.dropoffTimeSelect.value;
                
                // Update input fields
                if (this.startInput) this.startInput.value = startDate;
                if (this.endInput) this.endInput.value = endDate;
                if (this.startTimeInput) this.startTimeInput.value = startTime;
                if (this.endTimeInput) this.endTimeInput.value = endTime;
                
                // Check for late surcharge
                const endHour = parseInt(endTime.split(':')[0]);
                if (endHour >= this.lateCutoff) {
                    this.appliedSurcharge = true;
                } else {
                    this.appliedSurcharge = false;
                }
                
                // Callback
                this.onDateChange({
                    start: startDate,
                    end: endDate,
                    startTime,
                    endTime,
                    appliedSurcharge: this.appliedSurcharge
                });
                
                // Hide picker
                this.hide();
            }
        });
        
        this.cancelButton.addEventListener('click', () => {
            this.hide();
        });
        
        // Time picker changes
        this.dropoffTimeSelect.addEventListener('change', () => {
            const selectedTime = this.dropoffTimeSelect.value;
            const hour = parseInt(selectedTime.split(':')[0]);
            
            if (hour >= this.lateCutoff) {
                this.surchargeElement.style.display = 'block';
                this.appliedSurcharge = true;
            } else {
                this.surchargeElement.style.display = 'none';
                this.appliedSurcharge = false;
            }
            
            this.surchargeCallback(this.appliedSurcharge);
        });
        
        // Connect to native inputs
        if (this.startInput) {
            this.startInput.addEventListener('click', (e) => {
                e.preventDefault();
                this.show();
            });
        }
        
        if (this.endInput) {
            this.endInput.addEventListener('click', (e) => {
                e.preventDefault();
                this.show();
            });
        }
    }
    
    renderCalendar() {
        // Update month display
        this.monthElement.textContent = this.formatMonth(this.currentMonth);
        
        // Clear days
        this.daysElement.innerHTML = '';
        
        // Get first day of month
        const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const startingDay = firstDay.getDay();
        
        // Calculate days in month
        const monthLength = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0).getDate();
        
        // Generate empty cells for days before start of month
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('span');
            emptyCell.className = 'day empty';
            this.daysElement.appendChild(emptyCell);
        }
        
        // Generate days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= monthLength; day++) {
            const date = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), day);
            const dayElement = document.createElement('span');
            
            dayElement.textContent = day;
            dayElement.className = 'day';
            dayElement.dataset.date = this.formatDate(date);
            
            // Disable past days
            if (date < today) {
                dayElement.classList.add('disabled');
            } else {
                // Add click handler for valid days
                dayElement.addEventListener('click', () => this.handleDateClick(date));
                
                // Check if day is in selected range
                if (this.selectedStart && this.selectedEnd) {
                    if (date >= this.selectedStart && date <= this.selectedEnd) {
                        dayElement.classList.add('in-range');
                    }
                    
                    if (date.getTime() === this.selectedStart.getTime()) {
                        dayElement.classList.add('start-date');
                    }
                    
                    if (date.getTime() === this.selectedEnd.getTime()) {
                        dayElement.classList.add('end-date');
                    }
                }
            }
            
            this.daysElement.appendChild(dayElement);
        }
    }
    
    renderTimePickers() {
        // Generate time options
        this.pickupTimeSelect.innerHTML = '';
        this.dropoffTimeSelect.innerHTML = '';
        
        // Create time options in 30-minute intervals
        for (let hour = this.minHour; hour <= this.maxHour; hour++) {
            for (let minute of ['00', '30']) {
                const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                
                const pickupOption = document.createElement('option');
                pickupOption.value = time;
                pickupOption.textContent = time;
                this.pickupTimeSelect.appendChild(pickupOption);
                
                const dropoffOption = document.createElement('option');
                dropoffOption.value = time;
                dropoffOption.textContent = time;
                this.dropoffTimeSelect.appendChild(dropoffOption);
            }
        }
        
        // Set default values (9:00 for pickup, 17:00 for dropoff)
        this.pickupTimeSelect.value = '09:00';
        this.dropoffTimeSelect.value = '17:00';
    }
    
    handleDateClick(date) {
        // If no start date selected or start date already selected and clicking before it
        if (!this.selectedStart || (this.selectedStart && date < this.selectedStart)) {
            this.selectedStart = date;
            this.selectedEnd = null;
            // Set current month to the selected date's month
            this.setCurrentMonth(date);
        } else {
            // If start date selected, set end date
            this.selectedEnd = date;
        }
        
        this.renderCalendar();
    }
    
    setCurrentMonth(date) {
        this.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        this.renderCalendar();
    }
    
    show() {
        // Try to parse existing values
        if (this.startInput?.value) {
            this.selectedStart = new Date(this.startInput.value);
        }
        
        if (this.endInput?.value) {
            this.selectedEnd = new Date(this.endInput.value);
        }
        
        // If start date is set, show that month
        if (this.selectedStart) {
            this.currentMonth = new Date(this.selectedStart);
        }
        
        // Render calendar
        this.renderCalendar();
        
        // Show picker
        this.pickerElement.style.display = 'block';
    }
    
    hide() {
        if (this.pickerElement) {
            this.pickerElement.style.display = 'none';
        }
    }
    
    // Helper methods
    formatDate(date) {
        if (!date) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    formatMonth(date) {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
}

// Export as default for ES modules
export default DateRangePicker; 