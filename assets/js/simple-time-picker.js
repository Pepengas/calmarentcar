/**
 * Simple Clock Time Picker
 * A simpler implementation without using ES modules
 */

// Create the SimpleTimePicker class directly in the global scope
window.SimpleTimePicker = function(options) {
  console.log('SimpleTimePicker constructor called with options:', options);
  
  // Options
  this.inputId = options.inputId || '';
  this.minHour = options.minHour || 8;
  this.maxHour = options.maxHour || 20;
  this.interval = options.interval || 30;
  this.initialValue = options.initialValue || '09:00';
  this.onSelect = options.onSelect || function() {};

  // Find input element
  this.inputElement = document.getElementById(this.inputId);
  if (!this.inputElement) {
    console.error('SimpleTimePicker: Input element not found with ID:', this.inputId);
    return;
  }

  console.log('SimpleTimePicker: Found input element:', this.inputElement);

  // Add visual cue that this is a time picker
  this.inputElement.readOnly = true;
  this.inputElement.style.cursor = 'pointer';
  this.inputElement.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23555555'%3E%3Cpath d='M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z'/%3E%3C/svg%3E\")";
  this.inputElement.style.backgroundRepeat = 'no-repeat';
  this.inputElement.style.backgroundPosition = 'right 10px center';
  this.inputElement.style.backgroundSize = '20px';
  this.inputElement.style.paddingRight = '35px';

  // Set initial value if provided and input is empty
  if (this.initialValue && !this.inputElement.value) {
    this.inputElement.value = this.initialValue;
    console.log('SimpleTimePicker: Set initial value:', this.initialValue);
  }

  // Parse current value
  var parts = (this.inputElement.value || this.initialValue).split(':');
  this.selectedHour = parseInt(parts[0], 10) || 9;
  this.selectedMinute = parseInt(parts[1], 10) || 0;
  console.log('SimpleTimePicker: Parsed time -', this.selectedHour + ':' + this.selectedMinute);

  // Create picker element
  this.createPickerElement();

  // Attach events
  this.attachEvents();

  console.log('SimpleTimePicker initialized for input:', this.inputId);
};

// Create the picker element with hour and minute displays
window.SimpleTimePicker.prototype.createPickerElement = function() {
  // Create picker container
  this.pickerContainer = document.createElement('div');
  this.pickerContainer.className = 'simple-time-picker';
  this.pickerContainer.style.display = 'none';
  this.pickerContainer.style.position = 'absolute';
  this.pickerContainer.style.zIndex = '9999';
  this.pickerContainer.style.backgroundColor = 'white';
  this.pickerContainer.style.border = 'none';
  this.pickerContainer.style.borderRadius = '12px';
  this.pickerContainer.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
  this.pickerContainer.style.width = '280px';
  this.pickerContainer.style.fontFamily = 'Arial, sans-serif';
  this.pickerContainer.style.overflow = 'hidden';
  this.pickerContainer.style.transition = 'opacity 0.2s, transform 0.2s';

  // Create header
  var header = document.createElement('div');
  header.className = 'picker-header';
  header.style.backgroundColor = '#0072bc';
  header.style.color = 'white';
  header.style.padding = '15px';
  header.style.textAlign = 'center';
  header.style.fontSize = '18px';
  header.style.fontWeight = 'bold';
  header.textContent = 'Select Time';

  // Create time selection area
  var timeSelection = document.createElement('div');
  timeSelection.className = 'time-selection';
  timeSelection.style.padding = '20px';
  timeSelection.style.display = 'flex';
  timeSelection.style.flexDirection = 'column';
  timeSelection.style.alignItems = 'center';
  timeSelection.style.backgroundColor = '#f8f9fa';

  // Create time display
  var timeDisplay = document.createElement('div');
  timeDisplay.className = 'time-display';
  timeDisplay.style.marginBottom = '20px';
  timeDisplay.style.fontSize = '36px';
  timeDisplay.style.fontWeight = 'bold';
  timeDisplay.style.color = '#0072bc';
  timeDisplay.style.padding = '10px 20px';
  timeDisplay.style.backgroundColor = 'white';
  timeDisplay.style.borderRadius = '8px';
  timeDisplay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  
  // Hour selector section
  var hourSection = document.createElement('div');
  hourSection.className = 'hour-section';
  hourSection.style.width = '100%';
  hourSection.style.marginBottom = '15px';
  
  var hourLabel = document.createElement('div');
  hourLabel.className = 'time-section-label';
  hourLabel.textContent = 'Hour';
  hourLabel.style.marginBottom = '8px';
  hourLabel.style.fontWeight = 'bold';
  hourLabel.style.color = '#555';
  hourLabel.style.textAlign = 'center';
  
  // Hour selector
  var hourSelector = document.createElement('div');
  hourSelector.className = 'hour-selector';
  hourSelector.style.display = 'flex';
  hourSelector.style.gap = '6px';
  hourSelector.style.marginBottom = '10px';
  hourSelector.style.width = '100%';
  hourSelector.style.justifyContent = 'center';
  hourSelector.style.flexWrap = 'wrap';

  // Check if we need AM/PM display (more than 12 hours range)
  var useAmPm = false; // Force 24-hour display

  for (var h = this.minHour; h <= this.maxHour; h++) {
    var hourBtn = document.createElement('button');
    hourBtn.type = 'button';
    hourBtn.className = 'hour-btn';
    // Always use 24-hour display
    hourBtn.textContent = h < 10 ? '0' + h : h;
    hourBtn.dataset.hour = h;
    hourBtn.style.width = '45px';
    hourBtn.style.height = '40px';
    hourBtn.style.margin = '2px';
    hourBtn.style.border = '1px solid #e0e0e0';
    hourBtn.style.borderRadius = '8px';
    hourBtn.style.background = 'white';
    hourBtn.style.cursor = 'pointer';
    hourBtn.style.fontSize = '15px';
    hourBtn.style.fontWeight = 'bold';
    hourBtn.style.transition = 'all 0.15s ease';
    if (h === this.selectedHour) {
      hourBtn.style.backgroundColor = '#0072bc';
      hourBtn.style.color = 'white';
      hourBtn.style.borderColor = '#0072bc';
      hourBtn.style.boxShadow = '0 2px 6px rgba(0,114,188,0.3)';
    }
    // Add hover effect
    hourBtn.addEventListener('mouseenter', function(btn) {
      if (parseInt(btn.dataset.hour) !== this.selectedHour) {
        btn.style.backgroundColor = '#f0f8ff';
        btn.style.borderColor = '#80bdff';
      }
    }.bind(this, hourBtn));
    hourBtn.addEventListener('mouseleave', function(btn) {
      if (parseInt(btn.dataset.hour) !== this.selectedHour) {
        btn.style.backgroundColor = 'white';
        btn.style.borderColor = '#e0e0e0';
      }
    }.bind(this, hourBtn));
    hourBtn.addEventListener('click', this.onHourClick.bind(this));
    hourSelector.appendChild(hourBtn);
  }
  
  // Minute section
  var minuteSection = document.createElement('div');
  minuteSection.className = 'minute-section';
  minuteSection.style.width = '100%';
  
  var minuteLabel = document.createElement('div');
  minuteLabel.className = 'time-section-label';
  minuteLabel.textContent = 'Minute';
  minuteLabel.style.marginBottom = '8px';
  minuteLabel.style.fontWeight = 'bold';
  minuteLabel.style.color = '#555';
  minuteLabel.style.textAlign = 'center';

  // Minute selector
  var minuteSelector = document.createElement('div');
  minuteSelector.className = 'minute-selector';
  minuteSelector.style.display = 'flex';
  minuteSelector.style.gap = '6px';
  minuteSelector.style.marginBottom = '10px';
  minuteSelector.style.width = '100%';
  minuteSelector.style.justifyContent = 'center';
  minuteSelector.style.flexWrap = 'wrap';

  for (var m = 0; m < 60; m += this.interval) {
    var minuteBtn = document.createElement('button');
    minuteBtn.type = 'button';
    minuteBtn.className = 'minute-btn';
    minuteBtn.textContent = m < 10 ? '0' + m : m;
    minuteBtn.style.width = '45px';
    minuteBtn.style.height = '40px';
    minuteBtn.style.margin = '2px';
    minuteBtn.style.border = '1px solid #e0e0e0';
    minuteBtn.style.borderRadius = '8px';
    minuteBtn.style.background = 'white';
    minuteBtn.style.cursor = 'pointer';
    minuteBtn.style.fontSize = '15px';
    minuteBtn.style.fontWeight = 'bold';
    minuteBtn.style.transition = 'all 0.15s ease';
    
    if (m === this.selectedMinute) {
      minuteBtn.style.backgroundColor = '#0072bc';
      minuteBtn.style.color = 'white';
      minuteBtn.style.borderColor = '#0072bc';
      minuteBtn.style.boxShadow = '0 2px 6px rgba(0,114,188,0.3)';
    }
    
    // Add hover effect
    minuteBtn.addEventListener('mouseenter', function(btn) {
      if (parseInt(btn.dataset.minute) !== this.selectedMinute) {
        btn.style.backgroundColor = '#f0f8ff';
        btn.style.borderColor = '#80bdff';
      }
    }.bind(this, minuteBtn));
    
    minuteBtn.addEventListener('mouseleave', function(btn) {
      if (parseInt(btn.dataset.minute) !== this.selectedMinute) {
        btn.style.backgroundColor = 'white';
        btn.style.borderColor = '#e0e0e0';
      }
    }.bind(this, minuteBtn));
    
    // Store minute value in the button
    minuteBtn.dataset.minute = m;
    
    // Add event listener
    minuteBtn.addEventListener('click', this.onMinuteClick.bind(this));
    
    minuteSelector.appendChild(minuteBtn);
  }

  // Create actions area
  var actions = document.createElement('div');
  actions.className = 'picker-actions';
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.padding = '12px 15px';
  actions.style.borderTop = '1px solid #eee';
  actions.style.gap = '10px';
  actions.style.backgroundColor = 'white';

  // Cancel button
  var cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'cancel-btn';
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '6px';
  cancelButton.style.backgroundColor = '#f2f2f2';
  cancelButton.style.color = '#555';
  cancelButton.style.fontWeight = '500';
  cancelButton.style.cursor = 'pointer';
  cancelButton.style.transition = 'all 0.15s ease';
  
  cancelButton.addEventListener('mouseenter', function() {
    this.style.backgroundColor = '#e6e6e6';
  });
  
  cancelButton.addEventListener('mouseleave', function() {
    this.style.backgroundColor = '#f2f2f2';
  });
  
  cancelButton.addEventListener('click', this.hide.bind(this));

  // OK button
  var okButton = document.createElement('button');
  okButton.type = 'button';
  okButton.className = 'ok-btn';
  okButton.textContent = 'OK';
  okButton.style.padding = '8px 20px';
  okButton.style.border = 'none';
  okButton.style.borderRadius = '6px';
  okButton.style.backgroundColor = '#0072bc';
  okButton.style.color = 'white';
  okButton.style.fontWeight = '500';
  okButton.style.cursor = 'pointer';
  okButton.style.transition = 'all 0.15s ease';
  
  okButton.addEventListener('mouseenter', function() {
    this.style.backgroundColor = '#005a94';
  });
  
  okButton.addEventListener('mouseleave', function() {
    this.style.backgroundColor = '#0072bc';
  });
  
  okButton.addEventListener('click', this.applySelection.bind(this));

  // Update time display
  this.updateTimeDisplay = function() {
    var h = this.selectedHour;
    var m = this.selectedMinute;
    // Always use 24-hour format
    timeDisplay.textContent = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  };
  this.updateTimeDisplay();

  // Build the picker
  actions.appendChild(cancelButton);
  actions.appendChild(okButton);
  
  hourSection.appendChild(hourLabel);
  hourSection.appendChild(hourSelector);
  
  minuteSection.appendChild(minuteLabel);
  minuteSection.appendChild(minuteSelector);

  timeSelection.appendChild(timeDisplay);
  timeSelection.appendChild(hourSection);
  timeSelection.appendChild(minuteSection);

  this.pickerContainer.appendChild(header);
  this.pickerContainer.appendChild(timeSelection);
  this.pickerContainer.appendChild(actions);

  // Add the picker to the document body
  document.body.appendChild(this.pickerContainer);
};

// Attach events to the input element
window.SimpleTimePicker.prototype.attachEvents = function() {
  // Show picker when input is clicked
  this.inputElement.addEventListener('click', this.show.bind(this));
  
  // Hide picker when clicking outside
  document.addEventListener('click', function(e) {
    if (e.target !== this.inputElement && !this.pickerContainer.contains(e.target) && 
        this.pickerContainer.style.display === 'block') {
      this.hide();
    }
  }.bind(this));
};

// Handle hour button click
window.SimpleTimePicker.prototype.onHourClick = function(e) {
  try {
    const hourBtn = e.target;
    const hour = parseInt(hourBtn.dataset.hour, 10);
    
    if (isNaN(hour)) {
      console.error('SimpleTimePicker: Invalid hour value in button data attribute');
      return;
    }
    
    console.log('SimpleTimePicker: Hour clicked -', hour);
    
    // Update selected hour
    this.selectedHour = hour;
    
    // Update UI
    this.updateHourSelection();
    
    // Update input value
    this.updateInputValue();
    
    // Call onSelect callback
    if (typeof this.onSelect === 'function') {
      this.onSelect({
        hour: this.selectedHour,
        minute: this.selectedMinute,
        timeString: this.formatTime(this.selectedHour, this.selectedMinute)
      });
    }
  } catch (error) {
    console.error('SimpleTimePicker: Error in onHourClick', error);
  }
};

// Handle minute button click
window.SimpleTimePicker.prototype.onMinuteClick = function(e) {
  // Update all minute buttons
  var minuteButtons = this.pickerContainer.querySelectorAll('.minute-btn');
  for (var i = 0; i < minuteButtons.length; i++) {
    minuteButtons[i].style.backgroundColor = 'white';
    minuteButtons[i].style.color = 'black';
  }
  
  // Highlight the selected button
  e.target.style.backgroundColor = '#0072bc';
  e.target.style.color = 'white';
  
  // Update selected minute
  this.selectedMinute = parseInt(e.target.dataset.minute, 10);
  
  // Update time display
  this.updateTimeDisplay();
};

// Show the picker
window.SimpleTimePicker.prototype.show = function() {
  // Center the picker in the screen
  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;
  var pickerWidth = 280; // Width of the picker
  var pickerHeight = 450; // Approximate height of the picker
  
  // Position in the center of the viewport
  this.pickerContainer.style.position = 'fixed'; // Use fixed instead of absolute
  this.pickerContainer.style.top = '50%';
  this.pickerContainer.style.left = '50%';
  this.pickerContainer.style.transform = 'translate(-50%, -50%)';
  
  // Add a backdrop overlay
  if (!this.backdrop) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'time-picker-backdrop';
    this.backdrop.style.position = 'fixed';
    this.backdrop.style.top = '0';
    this.backdrop.style.left = '0';
    this.backdrop.style.right = '0';
    this.backdrop.style.bottom = '0';
    this.backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.backdrop.style.zIndex = '9998'; // One less than the picker
    this.backdrop.style.opacity = '0';
    this.backdrop.style.transition = 'opacity 0.2s ease';
    
    // Close when clicking the backdrop
    this.backdrop.addEventListener('click', this.hide.bind(this));
    
    document.body.appendChild(this.backdrop);
  }
  
  // Add a subtle animation
  this.pickerContainer.style.transition = 'opacity 0.3s, transform 0.3s';
  this.pickerContainer.style.opacity = '0';
  this.pickerContainer.style.transform = 'translate(-50%, -50%) scale(0.95)';
  
  // Show the backdrop
  this.backdrop.style.display = 'block';
  
  // Show the picker
  this.pickerContainer.style.display = 'block';
  
  // Trigger animation
  setTimeout(() => {
    this.backdrop.style.opacity = '1';
    this.pickerContainer.style.opacity = '1';
    this.pickerContainer.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
  
  // Store the current visibility
  this.isVisible = true;
};

// Hide the picker
window.SimpleTimePicker.prototype.hide = function() {
  // Animate out
  this.pickerContainer.style.opacity = '0';
  this.pickerContainer.style.transform = 'translate(-50%, -50%) scale(0.95)';
  
  // Hide backdrop
  if (this.backdrop) {
    this.backdrop.style.opacity = '0';
  }
  
  // Actually hide after animation completes
  setTimeout(() => {
    this.pickerContainer.style.display = 'none';
    if (this.backdrop) {
      this.backdrop.style.display = 'none';
    }
  }, 300);
  
  this.isVisible = false;
};

// Apply the selection
window.SimpleTimePicker.prototype.applySelection = function() {
  // Format the time for the input field (always use 24-hour format for value)
  var h = this.selectedHour.toString().padStart(2, '0');
  var m = this.selectedMinute.toString().padStart(2, '0');
  var timeString = h + ':' + m;
  
  // Check if we need AM/PM display (more than 12 hours range)
  var useAmPm = false; // Force 24-hour display
  
  // Optionally format for display in the input field (if using AM/PM display)
  if (useAmPm) {
    // Calculate AM/PM display
    var hour12 = this.selectedHour % 12;
    if (hour12 === 0) hour12 = 12;
    var ampm = this.selectedHour < 12 ? 'AM' : 'PM';
    
    // For the actual displayed value in the input
    this.inputElement.value = timeString; // Keep 24h format in value for form submission
    
    // Add a visible formatted time (AM/PM) for user display
    var formattedTime = hour12 + ':' + m + ' ' + ampm;
    
    // If there's a visible span next to the field, update it
    var displaySpan = document.getElementById(this.inputId + '-display');
    if (displaySpan) {
      displaySpan.textContent = formattedTime;
    } else {
      // Create one if it doesn't exist
      displaySpan = document.createElement('span');
      displaySpan.id = this.inputId + '-display';
      displaySpan.style.marginLeft = '10px';
      displaySpan.style.color = '#555';
      displaySpan.textContent = formattedTime;
      
      // Insert after the input
      if (this.inputElement.nextSibling) {
        this.inputElement.parentNode.insertBefore(displaySpan, this.inputElement.nextSibling);
      } else {
        this.inputElement.parentNode.appendChild(displaySpan);
      }
    }
  } else {
    // Just use the 24h format
    this.inputElement.value = timeString;
  }
  
  // Call the onSelect callback
  if (typeof this.onSelect === 'function') {
    this.onSelect({
      hour: this.selectedHour,
      minute: this.selectedMinute,
      timeString: timeString
    });
  }
  
  // Hide the picker
  this.hide();
};

// Add formatTime helper method
window.SimpleTimePicker.prototype.formatTime = function(hour, minute) {
  try {
    const hourStr = hour < 10 ? '0' + hour : hour;
    const minuteStr = minute < 10 ? '0' + minute : minute;
    return hourStr + ':' + minuteStr;
  } catch (error) {
    console.error('SimpleTimePicker: Error formatting time', error);
    return '00:00'; // Fallback
  }
};

// Add updateHourSelection method
window.SimpleTimePicker.prototype.updateHourSelection = function() {
  try {
    // Update all hour buttons
    var hourButtons = this.pickerContainer.querySelectorAll('.hour-btn');
    for (var i = 0; i < hourButtons.length; i++) {
      const btnHour = parseInt(hourButtons[i].dataset.hour, 10);
      
      if (btnHour === this.selectedHour) {
        hourButtons[i].style.backgroundColor = '#0072bc';
        hourButtons[i].style.color = 'white';
        hourButtons[i].style.borderColor = '#0072bc';
        hourButtons[i].style.boxShadow = '0 2px 6px rgba(0,114,188,0.3)';
      } else {
        hourButtons[i].style.backgroundColor = 'white';
        hourButtons[i].style.color = 'black';
        hourButtons[i].style.borderColor = '#e0e0e0';
        hourButtons[i].style.boxShadow = 'none';
      }
    }
    
    console.log('SimpleTimePicker: Updated hour selection to', this.selectedHour);
  } catch (error) {
    console.error('SimpleTimePicker: Error in updateHourSelection', error);
  }
};

// Add updateInputValue method
window.SimpleTimePicker.prototype.updateInputValue = function() {
  try {
    // Format the selected time
    const timeString = this.formatTime(this.selectedHour, this.selectedMinute);
    
    // Update the input value
    if (this.inputElement) {
      this.inputElement.value = timeString;
      
      // Dispatch change event to trigger any listeners
      const event = new Event('change', { bubbles: true });
      this.inputElement.dispatchEvent(event);
      
      console.log('SimpleTimePicker: Updated input value to', timeString);
    }
  } catch (error) {
    console.error('SimpleTimePicker: Error in updateInputValue', error);
  }
}; 