/**
 * Mobile Menu Functionality
 * Handles toggling the mobile menu and maintaining correct states
 */
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.querySelector('.mobile-menu');
    const navContainer = document.querySelector('.nav-container');
    
    if (mobileMenuButton && navContainer) {
        mobileMenuButton.addEventListener('click', function() {
            // Toggle the active class on the navigation container
            navContainer.classList.toggle('active');
            
            // Update the aria-expanded attribute for accessibility
            const isExpanded = navContainer.classList.contains('active');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded);
            
            // Toggle icon between bars and times (X)
            const icon = mobileMenuButton.querySelector('i');
            if (icon) {
                if (isExpanded) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        // Close the menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navContainer.contains(event.target) && 
                !mobileMenuButton.contains(event.target) && 
                navContainer.classList.contains('active')) {
                navContainer.classList.remove('active');
                mobileMenuButton.setAttribute('aria-expanded', false);
                
                const icon = mobileMenuButton.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        // Close menu when a nav link is clicked
        const navLinks = navContainer.querySelectorAll('a');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                navContainer.classList.remove('active');
                mobileMenuButton.setAttribute('aria-expanded', false);
                
                const icon = mobileMenuButton.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }
}); 