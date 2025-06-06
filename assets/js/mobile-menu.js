/**
 * Mobile Menu Functionality
 * Handles responsive navigation across all pages
 */
document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
});

function initMobileMenu() {
  const mobileMenuButton = document.querySelector('.mobile-menu');
  const navContainer = document.querySelector('.nav-container, nav');
  
  if (mobileMenuButton && navContainer) {
    // Toggle menu on button click
    mobileMenuButton.addEventListener('click', function() {
      // Toggle active class on nav container
      navContainer.classList.toggle('active');
      
      // Toggle button state
      const isExpanded = navContainer.classList.contains('active');
      mobileMenuButton.setAttribute('aria-expanded', isExpanded.toString());
      
      // Toggle icon if it exists
      const icon = mobileMenuButton.querySelector('i');
      if (icon) {
        if (isExpanded) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-times');
          mobileMenuButton.setAttribute('aria-label', 'Close navigation menu');
        } else {
          icon.classList.add('fa-bars');
          icon.classList.remove('fa-times');
          mobileMenuButton.setAttribute('aria-label', 'Open navigation menu');
        }
      }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (navContainer.classList.contains('active')) {
        const isClickInsideNav = navContainer.contains(event.target);
        const isClickOnMenuButton = mobileMenuButton.contains(event.target);
        
        if (!isClickInsideNav && !isClickOnMenuButton) {
          navContainer.classList.remove('active');
          mobileMenuButton.setAttribute('aria-expanded', 'false');
          
          const icon = mobileMenuButton.querySelector('i');
          if (icon) {
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
          }
        }
      }
    });
    
    // Close menu when pressing escape key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && navContainer.classList.contains('active')) {
        navContainer.classList.remove('active');
        mobileMenuButton.setAttribute('aria-expanded', 'false');
        
        const icon = mobileMenuButton.querySelector('i');
        if (icon) {
          icon.classList.add('fa-bars');
          icon.classList.remove('fa-times');
        }
        
        mobileMenuButton.focus();
      }
    });
    
    // Add CSS for mobile menu if not already present
    addMobileMenuStyles();
  }
}

function addMobileMenuStyles() {
  // Check if styles already exist
  if (!document.getElementById('mobile-menu-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'mobile-menu-styles';
    styleEl.textContent = `
      @media (max-width: 768px) {
        .nav-container, nav ul.nav-menu, nav ul.nav-links {
          position: fixed;
          top: 0;
          right: -250px;
          width: 250px;
          height: 100vh;
          background-color: white;
          z-index: 1000;
          padding: 60px 20px 20px;
          transition: right 0.3s ease;
          box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
          display: flex !important;
          flex-direction: column;
          align-items: flex-start;
        }
        
        .nav-container.active, nav.active {
          right: 0;
        }
        
        nav ul.nav-menu.active, nav ul.nav-links.active {
          right: 0;
        }
        
        .nav-container li, nav ul.nav-menu li, nav ul.nav-links li {
          margin: 0 0 15px 0;
          width: 100%;
        }
        
        .nav-container a, nav ul.nav-menu a, nav ul.nav-links a {
          display: block;
          padding: 8px 0;
        }
        
        .mobile-menu {
          display: block;
          z-index: 1001;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }
} 