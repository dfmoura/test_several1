// Sample best-selling books data
const bestSellingBooks = [
    {
        id: 1,
        title: "The Midnight Library",
        author: "Matt Haig",
        price: 24.99,
        category: "Fiction",
        image: "📚"
    },
    {
        id: 2,
        title: "Atomic Habits",
        author: "James Clear",
        price: 19.99,
        category: "Non-Fiction",
        image: "📖"
    },
    {
        id: 3,
        title: "The Seven Husbands of Evelyn Hugo",
        author: "Taylor Jenkins Reid",
        price: 22.99,
        category: "Fiction",
        image: "📘"
    },
    {
        id: 4,
        title: "Project Hail Mary",
        author: "Andy Weir",
        price: 26.99,
        category: "Science Fiction",
        image: "🚀"
    },
    {
        id: 5,
        title: "Verity",
        author: "Colleen Hoover",
        price: 21.99,
        category: "Mystery & Thriller",
        image: "🔍"
    },
    {
        id: 6,
        title: "Lessons in Chemistry",
        author: "Bonnie Garmus",
        price: 23.99,
        category: "Fiction",
        image: "🧪"
    },
    {
        id: 7,
        title: "Tomorrow, and Tomorrow, and Tomorrow",
        author: "Gabrielle Zevin",
        price: 25.99,
        category: "Fiction",
        image: "🎮"
    },
    {
        id: 8,
        title: "The Creative Act",
        author: "Rick Rubin",
        price: 28.99,
        category: "Non-Fiction",
        image: "🎨"
    }
];

// Shopping cart functionality
let cart = [];
let cartTotal = 0;

// DOM elements
const bestsellersGrid = document.getElementById('bestsellersGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.querySelector('.search-btn');
const cartIcon = document.querySelector('.cart-icon');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotalElement = document.getElementById('cartTotal');
const cartCount = document.querySelector('.cart-count');
const categoryLinks = document.querySelectorAll('.category-link');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadBestSellingBooks();
    setupEventListeners();
});

// Load best-selling books
function loadBestSellingBooks(books = bestSellingBooks) {
    bestsellersGrid.innerHTML = '';
    
    books.forEach(book => {
        const bookCard = createBookCard(book);
        bestsellersGrid.appendChild(bookCard);
    });
}

// Create book card element
function createBookCard(book) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.innerHTML = `
        <div class="book-image">
            ${book.image}
        </div>
        <div class="book-info">
            <h3 class="book-title">${book.title}</h3>
            <p class="book-author">by ${book.author}</p>
            <p class="book-price">$${book.price.toFixed(2)}</p>
            <button class="add-to-cart-btn" onclick="addToCart(${book.id})">
                Add to Cart
            </button>
        </div>
    `;
    return bookCard;
}

// Add to cart functionality
function addToCart(bookId) {
    const book = bestSellingBooks.find(b => b.id === bookId);
    if (!book) return;

    const existingItem = cart.find(item => item.id === bookId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...book,
            quantity: 1
        });
    }

    updateCartDisplay();
    showNotification('Book added to cart!');
}

// Update cart display
function updateCartDisplay() {
    cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    cartTotalElement.textContent = cartTotal.toFixed(2);

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid #f1f1f1;">
                <div>
                    <h4 style="margin: 0; color: #333;">${item.title}</h4>
                    <p style="margin: 0.5rem 0 0 0; color: #666;">by ${item.author}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; color: #667eea; font-weight: 600;">$${item.price.toFixed(2)} x ${item.quantity}</p>
                    <button onclick="removeFromCart(${item.id})" style="background: #ff4757; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">Remove</button>
                </div>
            </div>
        `).join('');
    }
}

// Remove from cart
function removeFromCart(bookId) {
    cart = cart.filter(item => item.id !== bookId);
    updateCartDisplay();
    showNotification('Book removed from cart!');
}

// Search functionality
function setupEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Cart modal
    cartIcon.addEventListener('click', () => {
        cartModal.style.display = 'block';
    });

    closeCart.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });

    // Category filtering
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            categoryLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            const category = this.textContent;
            filterBooksByCategory(category);
        });
    });
}

// Perform search
function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        loadBestSellingBooks();
        return;
    }

    const filteredBooks = bestSellingBooks.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.category.toLowerCase().includes(searchTerm)
    );

    loadBestSellingBooks(filteredBooks);
    
    if (filteredBooks.length === 0) {
        bestsellersGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                <h3>No books found</h3>
                <p>Try searching with different keywords</p>
            </div>
        `;
    }
}

// Filter books by category
function filterBooksByCategory(category) {
    if (category === 'All Books') {
        loadBestSellingBooks();
        return;
    }

    const filteredBooks = bestSellingBooks.filter(book => 
        book.category === category
    );

    loadBestSellingBooks(filteredBooks);
    
    if (filteredBooks.length === 0) {
        bestsellersGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                <h3>No books in this category</h3>
                <p>Check back later for new releases</p>
            </div>
        `;
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #667eea;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Smooth scrolling for category links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
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

// Add hover effects for category cards
document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', function() {
        const category = this.querySelector('h3').textContent;
        const categoryLink = Array.from(categoryLinks).find(link => 
            link.textContent === category
        );
        if (categoryLink) {
            categoryLink.click();
        }
    });
});

// Add loading animation
function showLoading() {
    bestsellersGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
            <div style="width: 50px; height: 50px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            <p style="margin-top: 1rem; color: #666;">Loading books...</p>
        </div>
    `;
}

// Add spin animation
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(spinStyle);

// Initialize with a brief loading state for better UX
window.addEventListener('load', function() {
    showLoading();
    setTimeout(() => {
        loadBestSellingBooks();
    }, 500);
}); 