/**
 * Fix for car card visibility
 * This script adds the card-visible class to car cards immediately
 */
document.addEventListener('DOMContentLoaded', function() {
    // Query all car cards
    const carCards = document.querySelectorAll('.car-card');
    
    // Directly add the visible class to each card with a small delay between them
    if (carCards.length > 0) {
        carCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('card-visible');
            }, index * 100); // 100ms delay between each card
        });
    }
}); 