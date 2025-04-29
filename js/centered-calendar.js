/**
 * Centered Calendar Picker
 * A modern, centered date picker with overlay
 */

window.CenteredCalendar = function(options) {
  console.log('CenteredCalendar constructor called with options:', options);
  
  // Options
  this.inputId = options.inputId || '';
  this.minDate = options.minDate ? new Date(options.minDate) : new Date();
  this.maxDate = options.maxDate ? new Date(options.maxDate) : this.addMonths(new Date(), 12);
  this.initialValue = options.initialValue || '';
  this.onSelect = options.onSelect || function() {};
  
  // Find input element
  this.inputElement = document.getElementById(this.inputId);
  if (!this.inputElement) {
    console.error('CenteredCalendar: Input element not found with ID:', this.inputId);
    return;
  }
  
  // Add visual cue that this is a date picker
  this.inputElement.readOnly = true;
  this.inputElement.style.cursor = 'pointer';
  this.inputElement.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23555555'%3E%3Cpath d='M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z'/%3E%3C/svg%3E\")";
  this.inputElement.style.backgroundRepeat = 'no-repeat';
  this.inputElement.style.backgroundPosition = 'right 10px center';
  this.inputElement.style.backgroundSize = '20px';
  this.inputElement.style.paddingRight = '35px';
  
  // Set initial value if provided and input is empty
  if (this.initialValue && !this.inputElement.value) {
    this.inputElement.value = this.initialValue;
  }
  
  // Parse current input value or use current date
  this.currentDate = this.inputElement.value ? new Date(this.inputElement.value) : new Date();
  if (isNaN(this.currentDate.getTime())) {
    this.currentDate = new Date(); // Fallback to today if invalid date
  }
  
  this.selectedDate = new Date(this.currentDate);
  this.currentMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
  
  // Create calendar element
  this.createCalendarElement();
  
  // Attach events
  this.attachEvents();
  
  console.log('CenteredCalendar initialized for input:', this.inputId);
};

// Create the calendar element
window.CenteredCalendar.prototype.createCalendarElement = function() {
  // Create calendar container
  this.calendarContainer = document.createElement('div');
  this.calendarContainer.className = 'centered-calendar';
  this.calendarContainer.style.display = 'none';
  this.calendarContainer.style.position = 'fixed';
  this.calendarContainer.style.zIndex = '9999';
  this.calendarContainer.style.backgroundColor = 'white';
  this.calendarContainer.style.border = 'none';
  this.calendarContainer.style.borderRadius = '8px';
  this.calendarContainer.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  this.calendarContainer.style.width = '300px';
  this.calendarContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  this.calendarContainer.style.overflow = 'hidden';
  this.calendarContainer.style.transition = 'opacity 0.2s, transform 0.2s';
  
  // Create header
  var header = document.createElement('div');
  header.className = 'calendar-header';
  header.style.backgroundColor = '#0072bc';
  header.style.color = 'white';
  header.style.padding = '15px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.borderRadius = '8px 8px 0 0';
  header.style.textAlign = 'center';
  
  // Previous month button
  var prevBtn = document.createElement('button');
  prevBtn.className = 'prev-month-btn';
  prevBtn.innerHTML = '&laquo;';
  prevBtn.style.background = 'none';
  prevBtn.style.border = 'none';
  prevBtn.style.color = 'white';
  prevBtn.style.fontSize = '18px';
  prevBtn.style.cursor = 'pointer';
  prevBtn.style.width = '28px';
  prevBtn.style.height = '28px';
  prevBtn.style.display = 'flex';
  prevBtn.style.alignItems = 'center';
  prevBtn.style.justifyContent = 'center';
  prevBtn.style.borderRadius = '50%';
  prevBtn.style.transition = 'background-color 0.15s ease';
  
  prevBtn.addEventListener('mouseenter', function() {
    this.style.backgroundColor = 'rgba(255,255,255,0.3)';
  });
  
  prevBtn.addEventListener('mouseleave', function() {
    this.style.backgroundColor = 'transparent';
  });
  
  prevBtn.addEventListener('click', this.prevMonth.bind(this));
  
  // Month/year display
  var monthYearDisplay = document.createElement('div');
  monthYearDisplay.className = 'month-year-display';
  monthYearDisplay.style.fontWeight = '500';
  monthYearDisplay.style.fontSize = '20px';
  
  // Next month button
  var nextBtn = document.createElement('button');
  nextBtn.className = 'next-month-btn';
  nextBtn.innerHTML = '&raquo;';
  nextBtn.style.background = 'none';
  nextBtn.style.border = 'none';
  nextBtn.style.color = 'white';
  nextBtn.style.fontSize = '18px';
  nextBtn.style.cursor = 'pointer';
  nextBtn.style.width = '28px';
  nextBtn.style.height = '28px';
  nextBtn.style.display = 'flex';
  nextBtn.style.alignItems = 'center';
  nextBtn.style.justifyContent = 'center';
  nextBtn.style.borderRadius = '50%';
  nextBtn.style.transition = 'background-color 0.15s ease';
  
  nextBtn.addEventListener('mouseenter', function() {
    this.style.backgroundColor = 'rgba(255,255,255,0.3)';
  });
  
  nextBtn.addEventListener('mouseleave', function() {
    this.style.backgroundColor = 'transparent';
  });
  
  nextBtn.addEventListener('click', this.nextMonth.bind(this));
  
  header.appendChild(prevBtn);
  header.appendChild(monthYearDisplay);
  header.appendChild(nextBtn);
  
  // Create days of week header
  var daysHeader = document.createElement('div');
  daysHeader.className = 'days-header';
  daysHeader.style.display = 'grid';
  daysHeader.style.gridTemplateColumns = 'repeat(7, 1fr)';
  daysHeader.style.textAlign = 'center';
  daysHeader.style.padding = '10px 0';
  daysHeader.style.backgroundColor = '#f8f9fa';
  daysHeader.style.borderBottom = '1px solid #eee';
  
  var daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  daysOfWeek.forEach(day => {
    var dayEl = document.createElement('div');
    dayEl.textContent = day;
    dayEl.style.fontSize = '14px';
    dayEl.style.fontWeight = 'bold';
    dayEl.style.color = '#555';
    daysHeader.appendChild(dayEl);
  });
  
  // Create calendar grid
  var calendarGrid = document.createElement('div');
  calendarGrid.className = 'calendar-grid';
  calendarGrid.style.display = 'grid';
  calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  calendarGrid.style.gap = '2px';
  calendarGrid.style.padding = '20px';
  calendarGrid.style.backgroundColor = 'white';
  
  // Create footer actions
  var actions = document.createElement('div');
  actions.className = 'calendar-actions';
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.padding = '10px 15px';
  actions.style.borderTop = '1px solid #eee';
  actions.style.backgroundColor = 'white';
  
  // Today button
  var todayBtn = document.createElement('button');
  todayBtn.textContent = 'Today';
  todayBtn.style.background = 'none';
  todayBtn.style.border = 'none';
  todayBtn.style.padding = '8px 12px';
  todayBtn.style.color = '#555';
  todayBtn.style.marginRight = '8px';
  todayBtn.style.fontSize = '14px';
  todayBtn.style.fontWeight = '500';
  todayBtn.style.cursor = 'pointer';
  todayBtn.style.borderRadius = '4px';
  todayBtn.style.transition = 'background-color 0.2s';
  
  todayBtn.addEventListener('mouseenter', function() {
    this.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  });
  
  todayBtn.addEventListener('mouseleave', function() {
    this.style.backgroundColor = 'transparent';
  });
  
  todayBtn.addEventListener('click', this.selectToday.bind(this));
  
  // OK button
  var okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.style.background = 'none';
  okBtn.style.border = 'none';
  okBtn.style.padding = '8px 12px';
  okBtn.style.color = '#0072bc';
  okBtn.style.fontSize = '14px';
  okBtn.style.fontWeight = '500';
  okBtn.style.cursor = 'pointer';
  okBtn.style.borderRadius = '4px';
  okBtn.style.transition = 'background-color 0.2s';
  
  okBtn.addEventListener('mouseenter', function() {
    this.style.backgroundColor = 'rgba(0, 114, 188, 0.1)';
  });
  
  okBtn.addEventListener('mouseleave', function() {
    this.style.backgroundColor = 'transparent';
  });
  
  okBtn.addEventListener('click', this.applySelection.bind(this));
  
  actions.appendChild(todayBtn);
  actions.appendChild(okBtn);
  
  // Build the calendar
  this.calendarContainer.appendChild(header);
  this.calendarContainer.appendChild(daysHeader);
  this.calendarContainer.appendChild(calendarGrid);
  this.calendarContainer.appendChild(actions);
  
  // Store references
  this.monthYearDisplay = monthYearDisplay;
  this.calendarGrid = calendarGrid;
  
  // Add the calendar to the document body
  document.body.appendChild(this.calendarContainer);
};

// Attach events to the input element
window.CenteredCalendar.prototype.attachEvents = function() {
  // Show calendar when input is clicked
  this.inputElement.addEventListener('click', this.show.bind(this));
  
  // Handle keyboard navigation
  this.calendarContainer.addEventListener('keydown', this.handleKeyDown.bind(this));
};

// Show the calendar
window.CenteredCalendar.prototype.show = function() {
  // Center the calendar in the screen
  // Position in the center of the viewport
  this.calendarContainer.style.top = '50%';
  this.calendarContainer.style.left = '50%';
  this.calendarContainer.style.transform = 'translate(-50%, -50%) scale(0.95)';
  
  // Apply responsive sizing
  this.adjustResponsiveSizing();
  
  // Add a backdrop overlay
  if (!this.backdrop) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'calendar-backdrop';
    this.backdrop.style.position = 'fixed';
    this.backdrop.style.top = '0';
    this.backdrop.style.left = '0';
    this.backdrop.style.right = '0';
    this.backdrop.style.bottom = '0';
    this.backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.backdrop.style.zIndex = '9998'; // One less than the calendar
    this.backdrop.style.opacity = '0';
    this.backdrop.style.transition = 'opacity 0.2s ease';
    
    // Close when clicking the backdrop
    this.backdrop.addEventListener('click', this.hide.bind(this));
    
    document.body.appendChild(this.backdrop);
  }
  
  // Add a subtle animation
  this.calendarContainer.style.transition = 'opacity 0.2s, transform 0.2s';
  this.calendarContainer.style.opacity = '0';
  
  // Show the backdrop
  this.backdrop.style.display = 'block';
  
  // Show the calendar
  this.calendarContainer.style.display = 'block';
  
  // Re-render the calendar with current date
  this.renderCalendar();
  
  // Trigger animation
  setTimeout(() => {
    this.backdrop.style.opacity = '1';
    this.calendarContainer.style.opacity = '1';
    this.calendarContainer.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
  
  // Store the current visibility
  this.isVisible = true;
};

// Hide the calendar
window.CenteredCalendar.prototype.hide = function() {
  // Animate out
  this.calendarContainer.style.opacity = '0';
  this.calendarContainer.style.transform = 'translate(-50%, -50%) scale(0.95)';
  
  // Hide backdrop
  if (this.backdrop) {
    this.backdrop.style.opacity = '0';
  }
  
  // Actually hide after animation completes
  setTimeout(() => {
    this.calendarContainer.style.display = 'none';
    if (this.backdrop) {
      this.backdrop.style.display = 'none';
    }
  }, 200);
  
  this.isVisible = false;
};

// Render the calendar for the current month
window.CenteredCalendar.prototype.renderCalendar = function() {
  // Update month/year display
  this.monthYearDisplay.textContent = this.formatMonthYear(this.currentMonth);
  
  // Clear grid
  this.calendarGrid.innerHTML = '';
  
  // Get first day of month and number of days
  const year = this.currentMonth.getFullYear();
  const month = this.currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Get day of week for first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = firstDay.getDay();
  
  // Calculate dates for previous month to fill in first row
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  
  // Create day cells
  
  // Previous month days (grayed out)
  for (let i = 0; i < firstDayOfWeek; i++) {
    const dayNum = prevMonthDays - firstDayOfWeek + i + 1;
    this.createDayCell(dayNum, 'prev-month');
  }
  
  // Current month days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(year, month, i);
    
    let className = 'current-month';
    
    // Check if this date is today
    if (currentDate.getTime() === today.getTime()) {
      className += ' today';
    }
    
    // Check if this date is selected
    if (this.selectedDate && 
        currentDate.getDate() === this.selectedDate.getDate() && 
        currentDate.getMonth() === this.selectedDate.getMonth() && 
        currentDate.getFullYear() === this.selectedDate.getFullYear()) {
      className += ' selected';
    }
    
    // Check if date is within min/max range
    const isDisabled = (currentDate < this.minDate || currentDate > this.maxDate);
    if (isDisabled) {
      className += ' disabled';
    }
    
    this.createDayCell(i, className, currentDate, isDisabled);
  }
  
  // Next month days (grayed out)
  const cellsCreated = firstDayOfWeek + daysInMonth;
  const cellsNeeded = Math.ceil(cellsCreated / 7) * 7;
  const nextMonthDays = cellsNeeded - cellsCreated;
  
  for (let i = 1; i <= nextMonthDays; i++) {
    this.createDayCell(i, 'next-month');
  }
};

// Create a day cell in the calendar
window.CenteredCalendar.prototype.createDayCell = function(day, className, date, isDisabled) {
  const dayCell = document.createElement('div');
  dayCell.className = 'day-cell ' + className;
  dayCell.textContent = day;
  
  // Style the day cell similar to clock-number
  dayCell.style.padding = '0';
  dayCell.style.display = 'flex';
  dayCell.style.alignItems = 'center';
  dayCell.style.justifyContent = 'center';
  dayCell.style.width = '32px';
  dayCell.style.height = '32px';
  dayCell.style.margin = '2px auto';
  dayCell.style.textAlign = 'center';
  dayCell.style.cursor = isDisabled ? 'default' : 'pointer';
  dayCell.style.borderRadius = '50%';
  dayCell.style.fontSize = '14px';
  dayCell.style.color = '#333';
  dayCell.style.transition = 'background-color 0.2s, color 0.2s';
  
  // Style based on className
  if (className.includes('prev-month') || className.includes('next-month')) {
    dayCell.style.color = '#bbb';
  }
  
  if (className.includes('today')) {
    dayCell.style.border = '1px solid #0072bc';
    dayCell.style.fontWeight = 'bold';
  } else {
    dayCell.style.border = '1px solid transparent';
  }
  
  if (className.includes('selected')) {
    dayCell.style.backgroundColor = '#0072bc';
    dayCell.style.color = 'white';
    dayCell.style.fontWeight = 'bold';
  }
  
  if (className.includes('disabled')) {
    dayCell.style.color = '#ddd';
    dayCell.style.cursor = 'default';
  } else if (className.includes('current-month') && !className.includes('selected')) {
    dayCell.addEventListener('mouseenter', function() {
      this.style.backgroundColor = 'rgba(0, 114, 188, 0.1)';
    });
    
    dayCell.addEventListener('mouseleave', function() {
      if (!this.classList.contains('selected')) {
        this.style.backgroundColor = '';
      }
    });
    
    // Add click handler for day selection
    dayCell.addEventListener('click', () => {
      if (date) {
        this.selectDate(date);
      }
    });
  }
  
  this.calendarGrid.appendChild(dayCell);
};

// Select a date
window.CenteredCalendar.prototype.selectDate = function(date) {
  this.selectedDate = new Date(date);
  this.renderCalendar();
};

// Go to previous month
window.CenteredCalendar.prototype.prevMonth = function() {
  this.currentMonth = this.addMonths(this.currentMonth, -1);
  this.renderCalendar();
};

// Go to next month
window.CenteredCalendar.prototype.nextMonth = function() {
  this.currentMonth = this.addMonths(this.currentMonth, 1);
  this.renderCalendar();
};

// Select today's date
window.CenteredCalendar.prototype.selectToday = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Only select if within min/max range
  if (today >= this.minDate && today <= this.maxDate) {
    this.selectedDate = today;
    this.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.renderCalendar();
  }
};

// Apply the selected date
window.CenteredCalendar.prototype.applySelection = function() {
  if (this.selectedDate) {
    const formattedDate = this.formatDate(this.selectedDate);
    this.inputElement.value = formattedDate;
    
    // Call the onSelect callback
    if (typeof this.onSelect === 'function') {
      this.onSelect({
        date: this.selectedDate,
        formattedDate: formattedDate
      });
    }
  }
  
  this.hide();
};

// Handle keyboard navigation
window.CenteredCalendar.prototype.handleKeyDown = function(e) {
  if (!this.isVisible) return;
  
  switch (e.key) {
    case 'Escape':
      this.hide();
      break;
    case 'Enter':
      this.applySelection();
      break;
  }
};

// Helper method to add months to a date
window.CenteredCalendar.prototype.addMonths = function(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

// Format date as MM/DD/YYYY
window.CenteredCalendar.prototype.formatDate = function(date) {
  if (!date) return '';
  
  // Format as MM/DD/YYYY
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month < 10 ? '0' + month : month}/${day < 10 ? '0' + day : day}/${year}`;
};

// Format month and year
window.CenteredCalendar.prototype.formatMonthYear = function(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Responsive adjustments for the calendar
window.CenteredCalendar.prototype.adjustResponsiveSizing = function() {
  // Handle mobile view
  if (window.innerWidth <= 480) {
    this.calendarContainer.style.position = 'fixed';
    this.calendarContainer.style.top = '50%';
    this.calendarContainer.style.left = '50%';
    this.calendarContainer.style.transform = 'translate(-50%, -50%)';
    this.calendarContainer.style.width = '280px';
  } else {
    this.calendarContainer.style.width = '300px';
  }
}; 