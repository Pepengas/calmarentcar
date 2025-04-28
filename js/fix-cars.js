/**
 * Fix for the "Search Available Cars" button
 */
document.addEventListener('DOMContentLoaded', function() {
  // Get the button element
  const searchCarsButton = document.getElementById('search-cars-btn');
  
  if (searchCarsButton) {
    console.log('Search cars button found, adding event listener');
    
    // Add click event listener
    searchCarsButton.addEventListener('click', function() {
      console.log('Search cars button clicked');
      
      // Get all required fields in step 1
      const requiredFields = document.querySelectorAll('#step-1 input[required], #step-1 select[required]');
      let isValid = true;
      
      // Validate all required fields
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          isValid = false;
          
          // Add error styling
          const formGroup = field.closest('.form-group');
          if (formGroup) {
            formGroup.classList.add('error');
            
            // Show error message if available
            const errorElement = formGroup.querySelector('.validation-message');
            if (errorElement) {
              errorElement.textContent = 'This field is required';
            }
          }
        } else {
          // Remove error styling
          const formGroup = field.closest('.form-group');
          if (formGroup) {
            formGroup.classList.remove('error');
            
            // Clear error message
            const errorElement = formGroup.querySelector('.validation-message');
            if (errorElement) {
              errorElement.textContent = '';
            }
          }
        }
      });
      
      if (isValid) {
        console.log('Form is valid, proceeding to step 2');
        
        // Move to step 2 of the booking form
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        
        // Update form step classes
        if (step1 && step2) {
          step1.classList.remove('active');
          step2.classList.add('active');
          
          // Update progress indicators if they exist
          const step1Indicator = document.querySelector('.step[data-step="1"]');
          const step2Indicator = document.querySelector('.step[data-step="2"]');
          
          if (step1Indicator && step2Indicator) {
            step1Indicator.classList.remove('active');
            step2Indicator.classList.add('active');
          }
          
          // Update step titles if they exist
          const step1Title = document.querySelector('.step-title:nth-child(1)');
          const step2Title = document.querySelector('.step-title:nth-child(2)');
          
          if (step1Title && step2Title) {
            step1Title.classList.remove('active');
            step2Title.classList.add('active');
          }
          
          // Scroll to top of form
          const bookingForm = document.getElementById('booking-form');
          if (bookingForm) {
            bookingForm.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          console.error('Could not find step elements');
          showNotification('An error occurred. Please try again.', 'error');
        }
      } else {
        console.log('Form validation failed');
        showNotification('Please fill in all required fields.', 'error');
      }
    });
  } else {
    console.error('Search cars button not found');
  }
  
  // Back button functionality
  const backButton = document.getElementById('to-step-1');
  if (backButton) {
    console.log('Back button found, adding event listener');
    
    backButton.addEventListener('click', function() {
      console.log('Back button clicked');
      
      // Move back to step 1 of the booking form
      const step1 = document.getElementById('step-1');
      const step2 = document.getElementById('step-2');
      
      if (step1 && step2) {
        step2.classList.remove('active');
        step1.classList.add('active');
        
        // Update progress indicators
        const step1Indicator = document.querySelector('.step[data-step="1"]');
        const step2Indicator = document.querySelector('.step[data-step="2"]');
        
        if (step1Indicator && step2Indicator) {
          step2Indicator.classList.remove('active');
          step1Indicator.classList.add('active');
        }
        
        // Update step titles
        const step1Title = document.querySelector('.step-title:nth-child(1)');
        const step2Title = document.querySelector('.step-title:nth-child(2)');
        
        if (step1Title && step2Title) {
          step2Title.classList.remove('active');
          step1Title.classList.add('active');
        }
      }
    });
  }
  
  // Helper function to show notifications
  function showNotification(message, type = 'success') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<p>${message}</p>`;
    
    // Add to container
    container.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }
}); 