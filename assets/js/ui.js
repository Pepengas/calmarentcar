/**
 * UI Module - Handles all UI-related functionality
 */

export const UI = {
    init() {
        this.initMobileMenu();
        this.setupScrollEffects();
        this.initFAQAccordion();
        console.log('UI initialized');
    },

    initMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-menu');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileMenu && navLinks) {
            mobileMenu.addEventListener('click', function() {
                navLinks.classList.toggle('active');
                mobileMenu.classList.toggle('active');
                
                // Update ARIA expanded state
                const isExpanded = mobileMenu.classList.contains('active');
                mobileMenu.setAttribute('aria-expanded', isExpanded);
                
                // Toggle between hamburger and X icon
                const icon = mobileMenu.querySelector('i');
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
            
            // Close menu when clicking outside or on a link
            document.addEventListener('click', function(event) {
                const isClickInsideNav = navLinks.contains(event.target);
                const isClickOnMenuButton = mobileMenu.contains(event.target);
                
                if (!isClickInsideNav && !isClickOnMenuButton && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    mobileMenu.classList.remove('active');
                    mobileMenu.setAttribute('aria-expanded', false);
                    
                    // Reset icon
                    const icon = mobileMenu.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
            
            // Close menu when clicking on navigation links
            const navLinksItems = document.querySelectorAll('.nav-links a');
            navLinksItems.forEach(link => {
                link.addEventListener('click', function() {
                    navLinks.classList.remove('active');
                    mobileMenu.classList.remove('active');
                    mobileMenu.setAttribute('aria-expanded', false);
                    
                    // Reset icon
                    const icon = mobileMenu.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                });
            });
        }
    },

    initFAQAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        if (faqItems.length > 0) {
            faqItems.forEach(item => {
                const header = item.querySelector('.faq-header');
                header.addEventListener('click', () => {
                    // Close all other items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item && otherItem.classList.contains('active')) {
                            otherItem.classList.remove('active');
                            const otherContent = otherItem.querySelector('.faq-content');
                            otherContent.style.maxHeight = null;
                            
                            // Update ARIA state
                            const otherBtn = otherItem.querySelector('.faq-toggle');
                            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                        }
                    });
                    
                    // Toggle current item
                    item.classList.toggle('active');
                    const content = item.querySelector('.faq-content');
                    
                    if (item.classList.contains('active')) {
                        content.style.maxHeight = content.scrollHeight + 'px';
                        header.querySelector('.faq-toggle').setAttribute('aria-expanded', 'true');
                    } else {
                        content.style.maxHeight = null;
                        header.querySelector('.faq-toggle').setAttribute('aria-expanded', 'false');
                    }
                });
            });
            
            // Auto-expand first FAQ item
            const firstItem = faqItems[0];
            const firstContent = firstItem.querySelector('.faq-content');
            const firstToggle = firstItem.querySelector('.faq-toggle');
            
            firstItem.classList.add('active');
            firstContent.style.maxHeight = firstContent.scrollHeight + 'px';
            if (firstToggle) firstToggle.setAttribute('aria-expanded', 'true');
        }
    },

    setupScrollEffects() {
        // Header scroll effect
        const header = document.querySelector('.site-header');
        if (header) {
            window.addEventListener('scroll', function() {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });
        }

        // Smooth scroll for anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]:not(a[href="#"])');
        anchorLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
};

export function showNotification(message, type = 'success', duration = 5000) {
    // Create notification container if it doesn't exist
    let notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'alert');
    
    // Add icon based on type
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <p>${message}</p>
        <button class="close-btn" aria-label="Close notification">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Add close button functionality
    const closeButton = notification.querySelector('.close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            closeNotification(notification);
        });
    }
    
    // Auto-remove after duration
    setTimeout(() => {
        closeNotification(notification);
    }, duration);
    
    return notification;
}

function closeNotification(notification) {
    notification.classList.add('hiding');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300); // Match the CSS transition time
} 