// This script can be used for future functionality or interactive elements

console.log("EcoBhoomi Enterprise website loaded successfully!");

// Example: Add smooth scroll effect for navigation links
document.querySelectorAll('nav ul li a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const target = document.querySelector(this.getAttribute('href'));
        target.scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// List of product image files
const products = [
    'Bohagi Black Jeera Masala 160ML-250ML Rs.10-Rs.20.jpg', 
    'Bohagi Nimbu Pani 160ML-250ML Rs.10-Rs.20.jpg', 
    'Bohagi Shikanji 160ML-250ML Rs.10-Rs.20.jpg', 
    'Frego Energy Drink 160ML-250ML Rs.10-Rs.20.jpg',
    'Frizee Apple 160ML-250ML Rs.10-Rs.20.jpg',
    'Kenpo Cola 160ML-250ML Rs.10-Rs.20.jpg',
    'Kenpo Orange 160ML-250ML Rs.10-Rs.20.jpg',
    'Kenpo Clear Lemon 160ML-250ML Rs.10-Rs.20.jpg'
];

// Function to remove file extensions
function removeExtension(filename) {
    return filename.replace(/\.(jpg|jpeg|png)$/i, '');
}

// Function to generate product grid
function loadProducts() {
    const productGrid = document.getElementById('product-grid');

    products.forEach((product) => {
        // Remove the file extension
        const cleanProduct = removeExtension(product);
        
        // Extract price and product name
        const priceMatch = cleanProduct.match(/Rs\..+/); // Match "Rs." and anything after it
        const price = priceMatch ? priceMatch[0] : 'Price not available'; // Get the matched price
        const productName = cleanProduct.split('Rs.')[0].replace(/[-_]/g, ' ').trim(); // Get product name up to "Rs."

        // Create product card
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');

        // Product Image
        const img = document.createElement('img');
        img.src = `./images/products/${product}`;
        img.alt = productName; // Use the processed product name for alt text
        img.addEventListener('click', () => showModal(img.src)); // Add click event for modal
        productCard.appendChild(img);

        // Product Name
        const nameElement = document.createElement('h3');
        nameElement.textContent = productName; // Use the processed product name
        productCard.appendChild(nameElement);

        // Product Price
        const priceElement = document.createElement('p');
        priceElement.textContent = price; // Display price
        productCard.appendChild(priceElement);

        // Append product card to the grid
        productGrid.appendChild(productCard);
    });
}

// Function to show modal with the clicked image
function showModal(imageSrc) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');

    modalImage.src = imageSrc;
    modalImage.style.maxHeight = `${window.innerHeight}px`; // Set max height to the window's inner height
    modal.style.display = 'block';

    // Close the modal when clicking outside the image
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Load products when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadProducts);
