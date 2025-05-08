/**
 * Searchable Country Selector
 * Creates a searchable dropdown for countries that replaces a standard input field
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the country selector
  initCountrySelector();
});

// List of countries
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", 
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", 
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", 
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", 
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", 
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", 
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", 
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", 
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", 
  "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", 
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", 
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", 
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", 
  "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", 
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", 
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", 
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", 
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", 
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", 
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", 
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

/**
 * Initialize the country selector
 */
function initCountrySelector() {
  const nationalityInput = document.getElementById('nationality');
  if (!nationalityInput) return;
  
  // Create the container and wrapper for the country selector
  const wrapper = document.createElement('div');
  wrapper.className = 'country-selector-wrapper';
  
  // Create the search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'country-search-input';
  searchInput.placeholder = 'Search for a country...';
  searchInput.autocomplete = 'off';
  
  // Create the dropdown container and add it to the body for maximum z-index
  const dropdown = document.createElement('div');
  dropdown.className = 'country-dropdown';
  document.body.appendChild(dropdown);
  
  // Add all countries to the dropdown
  countries.forEach(country => {
    const option = document.createElement('div');
    option.className = 'country-option';
    option.textContent = country;
    option.addEventListener('click', function() {
      nationalityInput.value = country;
      searchInput.value = country;
      hideDropdown();
      
      // Trigger validation if any
      const event = new Event('change', { bubbles: true });
      nationalityInput.dispatchEvent(event);
    });
    dropdown.appendChild(option);
  });
  
  // Function to position and show dropdown
  function showDropdown() {
    const rect = searchInput.getBoundingClientRect();
    dropdown.style.width = rect.width + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
    dropdown.style.display = 'block';
    
    console.log('Showing dropdown at position:', {
      left: rect.left,
      top: rect.bottom + window.scrollY,
      width: rect.width
    });
  }
  
  // Function to hide dropdown
  function hideDropdown() {
    dropdown.style.display = 'none';
  }
  
  // Add event listeners for the search input
  searchInput.addEventListener('focus', function() {
    showDropdown();
  });
  
  searchInput.addEventListener('click', function(e) {
    e.stopPropagation();
    showDropdown();
  });
  
  searchInput.addEventListener('input', function() {
    showDropdown();
    
    const value = this.value.toLowerCase();
    const options = dropdown.querySelectorAll('.country-option');
    
    let hasResults = false;
    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      const isVisible = text.includes(value);
      option.style.display = isVisible ? 'block' : 'none';
      if (isVisible) hasResults = true;
    });
    
    // Show no results message
    if (!hasResults) {
      if (!dropdown.querySelector('.no-results')) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No countries found';
        dropdown.appendChild(noResults);
      }
      dropdown.querySelector('.no-results').style.display = 'block';
    } else {
      const noResults = dropdown.querySelector('.no-results');
      if (noResults) noResults.style.display = 'none';
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!wrapper.contains(e.target) && e.target !== dropdown && !dropdown.contains(e.target)) {
      hideDropdown();
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', function() {
    if (dropdown.style.display === 'block') {
      showDropdown();
    }
  });
  
  // Handle scroll
  window.addEventListener('scroll', function() {
    if (dropdown.style.display === 'block') {
      showDropdown();
    }
  });
  
  // Hide the original input and add our country selector
  nationalityInput.style.display = 'none';
  
  // Append elements to the wrapper
  wrapper.appendChild(searchInput);
  
  // Insert the wrapper after the input
  nationalityInput.parentNode.insertBefore(wrapper, nationalityInput.nextSibling);
  
  // Add debugging log
  console.log('Country selector initialized with fixed position approach');
} 