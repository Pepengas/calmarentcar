/**
 * Dark Mode Toggle Functionality
 * Handles toggling between light and dark themes with local storage persistence
 */
document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const toggleIcon = document.querySelector('.toggle-icon i');
    const html = document.documentElement;
    
    // Check for saved user preference, if any
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Function to set theme
    function setTheme(theme) {
        html.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme); // Also set on body
        localStorage.setItem('theme', theme);
        
        // Set background color directly on html and body for full coverage
        if (theme === 'dark') {
            document.documentElement.style.backgroundColor = '#121212';
            document.body.style.backgroundColor = '#121212';
            if (darkModeToggle) darkModeToggle.checked = true;
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-moon');
                toggleIcon.classList.add('fa-sun');
            }
        } else {
            document.documentElement.style.backgroundColor = '';
            document.body.style.backgroundColor = '';
            if (darkModeToggle) darkModeToggle.checked = false;
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-sun');
                toggleIcon.classList.add('fa-moon');
            }
        }
    }
    
    // Apply saved theme on page load
    setTheme(currentTheme);
    
    // Add toggle event listener if the toggle exists
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            setTheme(newTheme);
        });
    }
    
    // Check for system preference
    function checkSystemPreference() {
        // Only apply system preference if user hasn't manually set a preference
        if (!localStorage.getItem('theme')) {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setTheme('dark');
            } else {
                setTheme('light');
            }
        }
    }
    
    // Check system preference on load
    checkSystemPreference();
    
    // Listen for system preference changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                setTheme(newTheme);
            }
        });
    }
    
    // Keyboard accessibility for the toggle
    if (darkModeToggle) {
        darkModeToggle.parentElement.addEventListener('keydown', function(e) {
            // Toggle on Space or Enter
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                darkModeToggle.checked = !darkModeToggle.checked;
                
                // Trigger the change event
                const event = new Event('change');
                darkModeToggle.dispatchEvent(event);
            }
        });
    }
}); 