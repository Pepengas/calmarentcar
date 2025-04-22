// Date picker fix using showPicker() method
document.addEventListener('DOMContentLoaded', function() {
    // Set minimum dates and validation logic
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    
    const pickupDate = document.getElementById('pickup-date');
    const dropoffDate = document.getElementById('dropoff-date');
    
    // Set minimum date for pickup date
    if (pickupDate) {
        pickupDate.min = todayFormatted;
        
        // When pickup date changes, update dropoff date minimum
        pickupDate.addEventListener('change', function() {
            if (dropoffDate && this.value) {
                dropoffDate.min = this.value;
                
                // If dropoff date is earlier than pickup date, reset it
                if (dropoffDate.value && dropoffDate.value < this.value) {
                    dropoffDate.value = this.value;
                }
            }
        });
    }
    
    // Set minimum date for dropoff date
    if (dropoffDate) {
        dropoffDate.min = todayFormatted;
    }
    
    // Get all date and time inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const timeInputs = document.querySelectorAll('input[type="time"]');
    
    // Add click event listeners to date inputs
    dateInputs.forEach(input => {
        input.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default action
            
            // Try using the modern showPicker() method
            if (typeof input.showPicker === 'function') {
                try {
                    input.showPicker();
                } catch (error) {
                    console.error("Error showing date picker:", error);
                    // Fallback if showPicker fails (e.g., security restrictions)
                    input.focus();
                }
            } else {
                // Fallback for browsers that don't support showPicker()
                input.focus();
            }
        });
    });
    
    // Add click event listeners to time inputs
    timeInputs.forEach(input => {
        input.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default action
            
            // Try using the modern showPicker() method
            if (typeof input.showPicker === 'function') {
                try {
                    input.showPicker();
                } catch (error) {
                    console.error("Error showing time picker:", error);
                    // Fallback if showPicker fails
                    input.focus();
                }
            } else {
                // Fallback for browsers that don't support showPicker()
                input.focus();
            }
        });
    });
}); 