/**
 * Clock-Style Time Picker
 * A user-friendly visual time picker component for the booking form
 */

class ClockTimePicker {
  constructor(options = {}) {
    console.log('ClockTimePicker constructor called with options:', options);
    
    // Get the element by selector or directly from the options
    const selector = options.selector || '';
    this.element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    
    console.log('Target element:', this.element);
    
    // If inputSelector is provided, get that element separately
    if (options.inputSelector && typeof options.inputSelector === 'string') {
      this.inputElement = document.querySelector(options.inputSelector);
      console.log('Input element:', this.inputElement);
    } else {
      this.inputElement = this.element;
    }
    
    // Configuration
    this.minHour = options.minHour || 8;
    this.maxHour = options.maxHour || 20;
    this.interval = options.interval || 30; // minutes interval (15, 30, 60)
    this.onChange = options.onChange || (() => {});
    this.format24h = options.format24h || false;
    this.initialValue = options.initialValue || '09:00';
    
    // State
    this.isVisible = false;
    this.selectedHour = 9;
    this.selectedMinute = 0;
    this.currentView = 'hours'; // 'hours' or 'minutes'
    
    this.init();
  }
  
  init() {
    if (!this.element) {
      console.error('Clock Time Picker: Element not found for selector');
      return;
    }
    
    // Create picker UI
    this.createPickerUI();
    
    // Set initial value if provided
    if (this.initialValue) {
      this.setTimeFromString(this.initialValue);
    }
    
    // Add event listeners
    this.attachEvents();
    
    // Initial render
    this.renderClock();
    
    console.log('Time picker initialized successfully');
  }
  
  createPickerUI() {
    console.log('Creating picker UI for element:', this.element);
    
    // Create wrapper if it doesn't exist
    if (!this.element.classList.contains('clock-time-picker-wrapper')) {
      console.log('Creating wrapper element');
      const wrapper = document.createElement('div');
      wrapper.className = 'clock-time-picker-wrapper';
      
      // Insert wrapper before the element
      if (this.element.parentNode) {
        this.element.parentNode.insertBefore(wrapper, this.element);
        // Move element inside wrapper
        wrapper.appendChild(this.element);
        this.wrapperElement = wrapper;
        console.log('Wrapper created and element moved inside');
      } else {
        console.error('Element has no parent node');
        this.wrapperElement = this.element;
      }
    } else {
      console.log('Element already has wrapper class');
      this.wrapperElement = this.element;
      this.element = this.wrapperElement.querySelector('input');
    }
    
    // Create the clock face container
    this.clockElement = document.createElement('div');
    this.clockElement.className = 'clock-time-picker';
    this.clockElement.style.display = 'none';
    
    // Add the clock HTML structure
    this.clockElement.innerHTML = `
      <div class="clock-header">
        <div class="time-display">
          <span class="hour-display">09</span>:<span class="minute-display">00</span>
        </div>
      </div>
      <div class="clock-face">
        <div class="clock-center"></div>
        <div class="clock-hand"></div>
        <div class="clock-numbers"></div>
      </div>
      <div class="clock-actions">
        <button type="button" class="clock-cancel">Cancel</button>
        <button type="button" class="clock-ok">OK</button>
      </div>
    `;
    
    // Append the clock to the wrapper
    this.wrapperElement.appendChild(this.clockElement);
    console.log('Clock element appended to wrapper');
    
    // Get clock elements
    this.hourDisplay = this.clockElement.querySelector('.hour-display');
    this.minuteDisplay = this.clockElement.querySelector('.minute-display');
    this.clockFace = this.clockElement.querySelector('.clock-face');
    this.clockHand = this.clockElement.querySelector('.clock-hand');
    this.clockNumbers = this.clockElement.querySelector('.clock-numbers');
    this.cancelButton = this.clockElement.querySelector('.clock-cancel');
    this.okButton = this.clockElement.querySelector('.clock-ok');
    
    console.log('Clock UI elements cached');
  }
  
  attachEvents() {
    console.log('Attaching events for time picker');
    
    // Show clock when input is clicked
    this.element.addEventListener('click', (e) => {
      console.log('Input clicked, showing clock');
      e.preventDefault();
      this.showClock();
    });
    
    // Make sure the element responds to focus events too
    this.element.addEventListener('focus', (e) => {
      console.log('Input focused, showing clock');
      e.preventDefault();
      this.showClock();
    });
    
    // Switch between hour and minute view when clicking on the display
    this.hourDisplay.addEventListener('click', () => {
      console.log('Hour display clicked');
      this.switchView('hours');
    });
    
    this.minuteDisplay.addEventListener('click', () => {
      console.log('Minute display clicked');
      this.switchView('minutes');
    });
    
    // Handle OK and Cancel buttons
    this.okButton.addEventListener('click', () => {
      console.log('OK button clicked');
      this.applySelection();
      this.hideClock();
    });
    
    this.cancelButton.addEventListener('click', () => {
      console.log('Cancel button clicked');
      this.hideClock();
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.clockElement.contains(e.target) && e.target !== this.element) {
        console.log('Clicked outside, hiding clock');
        this.hideClock();
      }
    });
    
    console.log('All time picker events attached');
  }
  
  renderClock() {
    // Update time display
    this.hourDisplay.textContent = this.padZero(this.format24h ? this.selectedHour : this.getAmPmHour());
    this.minuteDisplay.textContent = this.padZero(this.selectedMinute);
    
    // Reset number display
    this.clockNumbers.innerHTML = '';
    
    if (this.currentView === 'hours') {
      this.renderHourFace();
    } else {
      this.renderMinuteFace();
    }
    
    // Update hand position
    this.updateClockHand();
  }
  
  renderHourFace() {
    // Generate hours based on min/max constraints
    for (let i = this.minHour; i <= this.maxHour; i++) {
      const hour = this.format24h ? i : i > 12 ? i - 12 : i === 0 ? 12 : i;
      const angle = ((hour % 12) / 6) * Math.PI - Math.PI / 2;
      const isSelected = this.selectedHour === i;
      
      // Calculate position
      const radius = 80; // pixels
      const left = radius + radius * Math.cos(angle);
      const top = radius + radius * Math.sin(angle);
      
      // Create hour element
      const hourElement = document.createElement('div');
      hourElement.className = `clock-number hour-number${isSelected ? ' selected' : ''}`;
      hourElement.textContent = hour;
      hourElement.style.left = `${left}px`;
      hourElement.style.top = `${top}px`;
      
      // Add click handler
      hourElement.addEventListener('click', () => {
        this.selectedHour = i;
        this.switchView('minutes');
      });
      
      this.clockNumbers.appendChild(hourElement);
    }
  }
  
  renderMinuteFace() {
    // Generate minutes based on interval
    for (let i = 0; i < 60; i += this.interval) {
      const angle = (i / 30) * Math.PI - Math.PI / 2;
      const isSelected = this.selectedMinute === i;
      
      // Calculate position
      const radius = 80; // pixels
      const left = radius + radius * Math.cos(angle);
      const top = radius + radius * Math.sin(angle);
      
      // Create minute element
      const minuteElement = document.createElement('div');
      minuteElement.className = `clock-number minute-number${isSelected ? ' selected' : ''}`;
      minuteElement.textContent = this.padZero(i);
      minuteElement.style.left = `${left}px`;
      minuteElement.style.top = `${top}px`;
      
      // Add click handler
      minuteElement.addEventListener('click', () => {
        this.selectedMinute = i;
        this.applySelection();
      });
      
      this.clockNumbers.appendChild(minuteElement);
    }
  }
  
  updateClockHand() {
    const value = this.currentView === 'hours' 
      ? (this.selectedHour % 12) / 6 
      : this.selectedMinute / 30;
    
    const angle = value * Math.PI - Math.PI / 2;
    const handLength = 60; // pixels
    
    // Calculate end point of hand
    const endX = handLength * Math.cos(angle);
    const endY = handLength * Math.sin(angle);
    
    this.clockHand.style.transform = `rotate(${angle + Math.PI/2}rad)`;
    this.clockHand.style.height = `${handLength}px`;
  }
  
  switchView(view) {
    this.currentView = view;
    
    // Update active display
    if (view === 'hours') {
      this.hourDisplay.classList.add('active');
      this.minuteDisplay.classList.remove('active');
    } else {
      this.hourDisplay.classList.remove('active');
      this.minuteDisplay.classList.add('active');
    }
    
    this.renderClock();
  }
  
  showClock() {
    console.log('Show clock called');
    
    // Position the clock below the input
    const inputRect = this.element.getBoundingClientRect();
    console.log('Input rect:', inputRect);
    
    this.clockElement.style.position = 'absolute';
    this.clockElement.style.top = `${inputRect.bottom + window.scrollY}px`;
    this.clockElement.style.left = `${inputRect.left + window.scrollX}px`;
    this.clockElement.style.display = 'block';
    
    // Parse current input value if it exists
    if (this.element.value) {
      console.log('Parsing existing value:', this.element.value);
      this.setTimeFromString(this.element.value);
    }
    
    this.isVisible = true;
    this.switchView('hours');
    console.log('Clock is now visible');
  }
  
  hideClock() {
    this.clockElement.style.display = 'none';
    this.isVisible = false;
  }
  
  applySelection() {
    // Format time as HH:MM
    const timeString = `${this.padZero(this.selectedHour)}:${this.padZero(this.selectedMinute)}`;
    
    // Update input value
    this.element.value = timeString;
    if (this.inputElement && this.inputElement !== this.element) {
      this.inputElement.value = timeString;
    }
    
    // Trigger change event
    this.onChange({
      hour: this.selectedHour,
      minute: this.selectedMinute,
      timeString: timeString
    });
  }
  
  setTimeFromString(timeString) {
    // Parse HH:MM format
    const parts = timeString.split(':');
    if (parts.length === 2) {
      this.selectedHour = parseInt(parts[0], 10);
      this.selectedMinute = parseInt(parts[1], 10);
      
      // Adjust to nearest interval
      this.selectedMinute = Math.round(this.selectedMinute / this.interval) * this.interval;
    }
  }
  
  // Helper methods
  padZero(number) {
    return number.toString().padStart(2, '0');
  }
  
  getAmPmHour() {
    if (this.selectedHour === 0) return 12;
    if (this.selectedHour > 12) return this.selectedHour - 12;
    return this.selectedHour;
  }
}

// Export for ES modules
export default ClockTimePicker; 