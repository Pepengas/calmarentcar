/**
 * Fix Cards Layout 
 * This script ensures proper card layout and equal heights for better visual presentation.
 */

document.addEventListener('DOMContentLoaded', function() {
  const CardFixer = {
    // Card selectors for different sections of the site
    cardSelectors: [
      '.services-grid .card',
      '.blog-grid .card',
      '.testimonials-grid .card',
      '.fleet-grid .car-card',
      '.featured-locations .location-card'
    ],
    
    init: function() {
      // Initial fix on page load
      this.fixAllCards();
      
      // Fix on window resize with debounce for performance
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this.fixAllCards(), 250);
      });
      
      // Fix cards after any content loads that might affect card heights
      document.addEventListener('load', () => {
        this.fixAllCards();
      }, true);
    },
    
    fixAllCards: function() {
      this.cardSelectors.forEach(selector => {
        const cards = document.querySelectorAll(selector);
        if (cards.length) {
          this.resetCardHeights(cards);
          this.equalizeCardHeights(cards);
          this.fixCardLayout(cards);
        }
      });
    },
    
    resetCardHeights: function(cards) {
      cards.forEach(card => {
        card.style.height = 'auto';
        
        // Also reset heights of specific elements within the card
        const cardBody = card.querySelector('.card-body');
        const cardTitle = card.querySelector('.card-title');
        const cardText = card.querySelector('.card-text');
        
        if (cardBody) cardBody.style.height = 'auto';
        if (cardTitle) cardTitle.style.height = 'auto';
        if (cardText) cardText.style.height = 'auto';
      });
    },
    
    equalizeCardHeights: function(cards) {
      // Skip if we're on mobile (let cards stack naturally)
      if (window.innerWidth < 768) {
        return;
      }
      
      // Find max heights for different card elements
      let maxCardHeight = 0;
      let maxTitleHeight = 0;
      let maxTextHeight = 0;
      
      cards.forEach(card => {
        const cardHeight = card.offsetHeight;
        maxCardHeight = Math.max(maxCardHeight, cardHeight);
        
        const cardTitle = card.querySelector('.card-title');
        if (cardTitle) {
          maxTitleHeight = Math.max(maxTitleHeight, cardTitle.offsetHeight);
        }
        
        const cardText = card.querySelector('.card-text');
        if (cardText) {
          maxTextHeight = Math.max(maxTextHeight, cardText.offsetHeight);
        }
      });
      
      // Apply the max heights
      cards.forEach(card => {
        card.style.height = `${maxCardHeight}px`;
        
        const cardTitle = card.querySelector('.card-title');
        if (cardTitle) {
          cardTitle.style.height = `${maxTitleHeight}px`;
        }
        
        const cardText = card.querySelector('.card-text');
        if (cardText) {
          cardText.style.height = `${maxTextHeight}px`;
        }
      });
    },
    
    fixCardLayout: function(cards) {
      cards.forEach(card => {
        // Ensure images maintain aspect ratio and cover their container
        const cardImage = card.querySelector('.card-img-top, .card-image');
        if (cardImage) {
          cardImage.style.objectFit = 'cover';
          cardImage.style.width = '100%';
          
          // Set specific height based on card type
          if (card.closest('.blog-grid')) {
            cardImage.style.height = '200px';
          } else if (card.closest('.fleet-grid')) {
            cardImage.style.height = '180px';
          } else if (card.closest('.location-card')) {
            cardImage.style.height = '220px';
          }
        }
        
        // Ensure card footer is at the bottom
        const cardFooter = card.querySelector('.card-footer');
        if (cardFooter) {
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          
          const cardBody = card.querySelector('.card-body');
          if (cardBody) {
            cardBody.style.flexGrow = '1';
          }
        }
        
        // Add box shadow on hover for interactive feel
        card.addEventListener('mouseenter', function() {
          this.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
          this.style.transform = 'translateY(-5px)';
          this.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
        });
        
        card.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = '0 5px 10px rgba(0,0,0,0.05)';
        });
      });
    }
  };
  
  // Initialize the card fixer
  CardFixer.init();
}); 