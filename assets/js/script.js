// --- E-COMMERCE LOGIC ---

// 1. Helper to get the current user's unique storage key
function getUserKey(baseName) {
    const userId = localStorage.getItem('loggedInUserId') || 'Guest';
    return `${baseName}_${userId}`;
}

// 2. Fetch and Render Products
async function loadProducts() {
    const productList = document.getElementById('product-list');
    if (!productList) return; 

    try {
        const response = await fetch('./assets/js/products.json'); 
        if (!response.ok) throw new Error("JSON file not found.");
        
        const products = await response.json();
        let htmlContent = '';
        
        // Get current user's wishlist to check against
        const wishlistKey = getUserKey('wishlist');
        const wishlist = JSON.parse(localStorage.getItem(wishlistKey)) || [];

        products.forEach(product => {
            const imageUrl = `${product.imageUrl}`;
            const placeholder = `https://placehold.co/300x400?text=${encodeURIComponent(product.name)}`;
            
            const isAvailable = product.isAvailable && product.stock > 0;
            const buttonText = isAvailable ? 'Add to Cart' : 'Out of Stock';
            const buttonClass = isAvailable ? 'btn-amazon' : 'btn-secondary';
            const disabledAttr = isAvailable ? '' : 'disabled';

            // Check if this product is in the user's wishlist
            const isWishlisted = wishlist.some(item => item.id === product.Id);
            const wishlistBtnClass = isWishlisted ? 'btn-danger' : 'btn-outline-danger';
            const wishlistIcon = isWishlisted ? 'fas fa-heart' : 'far fa-heart';
            const wishlistText = isWishlisted ? 'Wishlisted' : 'Wishlist';

            htmlContent += `
                <div class="col-md-4 mb-4 product-card-container" data-category="${product.category}">
                    <div class="product-card h-100 d-flex flex-column">
                        <img src="${product.imageUrl}" alt="${product.name}" style="height: 250px; object-fit: cover;" onerror="this.onerror=null; this.src='${placeholder}';">
                        <h6 class="mt-2 text-truncate" title="${product.name}">${product.name}</h6>
                        <div class="rating text-warning mb-1"><i class="fas fa-star"></i> ${product.rating}</div>
                        <p class="mb-1 text-truncate" title="${product.description}"><small>${product.description}</small></p>
                        <p class="mb-1 mt-auto"><span class="price-text">₹${product.price}</span></p>
                        <div class="d-grid gap-2 mt-2">
                            <button onclick="addToCart(${product.Id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${imageUrl}')" class="btn ${buttonClass} btn-sm" ${disabledAttr}>
                                ${buttonText}
                            </button>
                            <button onclick="toggleWishlist(${product.Id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${imageUrl}')" class="btn ${wishlistBtnClass} btn-sm">
                                <i class="${wishlistIcon}"></i> ${wishlistText}
                            </button>
                            <a href="product_details.html?id=${product.Id}" class="btn btn-link btn-sm">View Details</a>
                        </div>
                    </div>
                </div>
            `;
        });

        productList.innerHTML = htmlContent;

        // Filter by URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const categoryFromUrl = urlParams.get('category');
        if (categoryFromUrl) {
            filterProducts(categoryFromUrl);
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        productList.innerHTML = `<p class="text-danger text-center w-100">Failed to load products. Check console (F12). Error: ${error.message}</p>`;
    }
}

// 3. Update UI (Navbar & Sidebar)
function updateUI() {
    const cartKey = getUserKey('cart');
    const wishlistKey = getUserKey('wishlist');
    
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const wishlist = JSON.parse(localStorage.getItem(wishlistKey)) || [];
    
    // Update Counters
    const cartCountEl = document.getElementById('cart-count');
    const wishCountEl = document.getElementById('wishlist-count');
    if(cartCountEl) cartCountEl.innerText = cart.length;
    if(wishCountEl) wishCountEl.innerText = wishlist.length;
    
    // Update Billing Button Visibility
    const billingNavItem = document.getElementById('nav-billing-item');
    if (billingNavItem) {
        billingNavItem.style.display = cart.length > 0 ? 'block' : 'none';
    }

    // Update Login/Auth Navbar
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    const loggedInUserName = localStorage.getItem('loggedInUserName');
    const authNavItem = document.getElementById('nav-auth-item');

    if (authNavItem) {
        if (loggedInUserId && loggedInUserName) {
            authNavItem.innerHTML = `
                <div class="dropdown">
                    <a class="nav-link dropdown-toggle text-dark fw-bold d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user-circle text-danger fs-5 me-2"></i> Hello, ${loggedInUserName.split(' ')[0]}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                        <li><a class="dropdown-item" href="orders.html"><i class="fas fa-box me-2 text-primary"></i> My Orders</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger fw-bold" href="#" onclick="logoutUser(event)"><i class="fas fa-sign-out-alt me-2"></i> Logout</a></li>
                    </ul>
                </div>
            `;
        } else {
            authNavItem.innerHTML = `<a class="nav-link fw-bold" href="login.html"><i class="fas fa-user me-1"></i> Login</a>`;
        }
    }

    renderSidebar(cart);
}

// 4. Render Right Sidebar (Cart)
function renderSidebar(cart) {
    const sidebarBody = document.getElementById('sidebar-cart-body');
    if (!sidebarBody) return; 

    if (cart.length === 0) {
        sidebarBody.innerHTML = `
            <div class="text-center mt-5">
                <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <h5>Your Cart is empty</h5>
                <p class="text-muted">Add items to it now.</p>
            </div>
        `;
        return;
    }

    let subtotal = 0;
    let itemsHTML = '';

    cart.forEach(item => {
        subtotal += (item.price * item.qty);
        itemsHTML += `
            <div class="d-flex mb-3 pb-3 border-bottom align-items-center">
                <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; margin-right: 15px; border-radius: 5px;">
                <div class="flex-grow-1">
                    <h6 class="mb-0 text-truncate" style="max-width: 150px; font-size: 0.9rem;">${item.name}</h6>
                    <div class="text-danger fw-bold">₹${item.price}</div>
                    <div class="d-flex align-items-center mt-1">
                        <button class="btn btn-sm btn-outline-secondary px-2 py-0" onclick="updateQty(${item.id}, -1)">-</button>
                        <span class="mx-2 fw-bold" style="font-size: 0.9rem;">${item.qty}</span>
                        <button class="btn btn-sm btn-outline-secondary px-2 py-0" onclick="updateQty(${item.id}, 1)">+</button>
                    </div>
                </div>
            </div>
        `;
    });

    sidebarBody.innerHTML = `
        <div class="mb-3">${itemsHTML}</div>
        <p class="text-success fw-bold mb-1"><i class="fas fa-check-circle"></i> FREE Delivery</p>
        <hr>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="fw-bold">Subtotal:</span>
            <span class="fs-5 fw-bold text-danger">₹${subtotal.toFixed(2)}</span>
        </div>
        <div class="d-grid gap-2 mt-auto">
            <a href="cart.html" class="btn btn-amazon btn-lg w-100">Go to Cart</a>
            <a href="checkout.html" class="btn btn-warning w-100 fw-bold">Proceed to Checkout</a>
        </div>
    `;
}

// 5. Update Quantity
function updateQty(id, change) {
    const cartKey = getUserKey('cart');
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const itemIndex = cart.findIndex(item => item.id === id);

    if (itemIndex > -1) {
        cart[itemIndex].qty += change;
        if (cart[itemIndex].qty <= 0) cart.splice(itemIndex, 1);
        
        localStorage.setItem(cartKey, JSON.stringify(cart));
        updateUI(); 
    }
}

// 6. Add to Cart
function addToCart(id, name, price, image) {
    const cartKey = getUserKey('cart');
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ id, name, price, image, qty: 1 });
    }
    
    localStorage.setItem(cartKey, JSON.stringify(cart));
    
    const sidebarElement = document.getElementById('cartSidebar');
    if(sidebarElement) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(sidebarElement) || new bootstrap.Offcanvas(sidebarElement);
        bsOffcanvas.show();
    }
    updateUI();
}

// 7. Toggle Wishlist
function toggleWishlist(id, name, price, image) {
    const wishlistKey = getUserKey('wishlist');
    let wishlist = JSON.parse(localStorage.getItem(wishlistKey)) || [];
    const existingIndex = wishlist.findIndex(item => item.id === id);
    
    if (existingIndex > -1) {
        wishlist.splice(existingIndex, 1); // Remove
    } else {
        wishlist.push({ id, name, price, image }); // Add
    }
    
    localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
    updateUI();
    loadProducts(); // Refresh grid to update heart color
}

// 8. Logout
function logoutUser(e) {
    if(e) e.preventDefault();
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('loggedInUserName');
    alert("You have been logged out.");
    window.location.href = 'index.html';
}

// 9. Filtering Logic
function filterProducts(category) {
    const productCards = document.querySelectorAll('.product-card-container');
    productCards.forEach(card => {
        if (category === 'All' || card.getAttribute('data-category') === category) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });

    const radios = document.querySelectorAll('input[name="category"]');
    radios.forEach(radio => {
        if (radio.value === category) radio.checked = true;
    });
}

// 10. Price Filtering
function filterByPrice(maxPrice) {
    const priceLabel = document.getElementById('price-label');
    if (priceLabel) priceLabel.innerText = `₹${maxPrice}`;

    const productCards = document.querySelectorAll('.product-card-container');
    productCards.forEach(card => {
        const priceElement = card.querySelector('.price-text');
        if (priceElement) {
            const priceValue = parseFloat(priceElement.innerText.replace('₹', '').replace(',', ''));
            if (priceValue <= maxPrice) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// 11. Search
function searchProducts() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return; 
    const searchQuery = searchInput.value.toLowerCase();
    const productCards = document.querySelectorAll('.product-card-container');
    
    productCards.forEach(card => {
        const titleElement = card.querySelector('h6');
        if (titleElement) {
            const productName = titleElement.getAttribute('title').toLowerCase();
            if (productName.includes(searchQuery)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// Master Init
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    loadProducts(); 
});
