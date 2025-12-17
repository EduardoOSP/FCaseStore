/* js/scripts.js */

let allProducts = [];
let siteBanners = [];
const productsLoadedEvent = new Event('productsLoaded');
let cart = [];

document.addEventListener("DOMContentLoaded", () => {
    refreshCartState();
    setupMobileControls();
    renderCartLayout(); 
    setupCartEventListeners();
    setupFooter();
    setupHeaderScroll();
    loadInitialData();
});

function refreshCartState() {
    try {
        cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    } catch (e) {
        cart = [];
    }
    updateCartIconCount();
    renderCartItems();
}

function saveCart() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    updateCartIconCount();
    renderCartItems();
}

window.changeCardImage = function(dotElement, newSrc) {
    event.preventDefault(); 
    event.stopPropagation();
    const card = dotElement.closest('.common-card');
    const img = card.querySelector('.common-card-img');
    if (img && newSrc) {
        img.style.opacity = '0.5'; 
        img.src = newSrc;
        setTimeout(() => img.style.opacity = '1', 150);
    }
};

async function loadInitialData() { 
    try {
        console.log("Iniciando busca de dados no servidor...");

        // 1. AQUI ESTÁ A MUDANÇA: Apontamos para o seu Backend Local
        const res = await fetch("/api/all-data");
        
        // Verifica se a resposta foi OK (Status 200-299)
        if (!res.ok) {
            throw new Error(`Erro na API: ${res.status}`);
        }

        const data = await res.json();
        
        // O resto continua igual, pois mantivemos a estrutura do JSON
        allProducts = data.products || [];
        siteBanners = data.banners || [];
        
        window.allProducts = allProducts;
        window.siteBanners = siteBanners;

        console.log("Dados carregados com sucesso:", allProducts.length, "produtos");

        // Avisa o restante do site que os dados chegaram
        document.dispatchEvent(productsLoadedEvent);
        
        renderMobileMenuContent(); 
        refreshCartState(); 

    } catch (err) {
        console.error("Erro fatal ao carregar dados da API:", err);
        // Opcional: Mostrar alerta na tela para você saber que falhou
        alert("Erro de conexão com o servidor. Verifique se o backend está rodando na porta 3000.");
    }
}

function setupHeaderScroll() {
    let lastScrollY = window.scrollY;
    const header = document.querySelector('header');
    if (!header) return; 
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > 100 && currentScrollY > lastScrollY) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        lastScrollY = currentScrollY;
    });
}

function setupMobileControls() {
    const btnOpen = document.querySelector(".btn-open-menu");
    const menu = document.querySelector(".mobile-menu");
    const overlay = document.querySelector(".overlay");
    
    if(menu && !menu.querySelector('.mobile-menu-body')) {
        menu.innerHTML = `
            <div class="mobile-menu-header">
                <h2>Menu</h2>
                <button class="btn-close-menu"><i class="fas fa-times"></i></button>
            </div>
            <div class="mobile-menu-body"></div>
        `;
    }

    const closeBtn = document.querySelector(".btn-close-menu");
    const openMenu = () => { menu.classList.add("open"); overlay.classList.add("open"); };
    const closeMenu = () => { menu.classList.remove("open"); overlay.classList.remove("open"); };

    if(btnOpen) btnOpen.addEventListener("click", openMenu);
    if(closeBtn) closeBtn.addEventListener("click", closeMenu);
    if(overlay) overlay.addEventListener("click", closeMenu);
}

function renderMobileMenuContent() {
    const body = document.querySelector(".mobile-menu-body");
    if (!body) return;

    const menuStructure = {};
    window.allProducts.forEach(p => {
        if (!p.category) return;
        if (!menuStructure[p.category]) menuStructure[p.category] = new Set();
        if (p.subcategory) menuStructure[p.category].add(p.subcategory);
    });

    let listHTML = `<ul class="mobile-nav-list"><li class="mobile-nav-item"><a href="/" class="btn-open-nav-item">Início</a></li>`;

    for (const [cat, subcatsSet] of Object.entries(menuStructure)) {
        const subcats = [...subcatsSet].sort();
        if (subcats.length > 0) {
            listHTML += `
                <li class="mobile-nav-item has-submenu">
                    <button class="btn-open-nav-item">${cat} <i class="fas fa-chevron-down"></i></button>
                    <ul class="mobile-subnav-list">
                        ${subcats.map(sub => `<li><a href="/collections.html?subcategory=${encodeURIComponent(sub)}">${sub}</a></li>`).join('')}
                        <li><a href="/collections.html?category=${encodeURIComponent(cat)}" style="color:var(--color-brand-primary)"><strong>Ver tudo em ${cat}</strong></a></li>
                    </ul>
                </li>`;
        } else {
            listHTML += `<li class="mobile-nav-item"><a href="/collections.html?category=${encodeURIComponent(cat)}" class="btn-open-nav-item">${cat}</a></li>`;
        }
    }
    listHTML += `</ul>`;
    body.innerHTML = listHTML;

    document.querySelectorAll('.mobile-nav-item.has-submenu .btn-open-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = btn.closest('.mobile-nav-item');
            const sub = parent.querySelector('.mobile-subnav-list');
            
            document.querySelectorAll('.mobile-nav-item.is-active').forEach(i => {
                if(i !== parent) { i.classList.remove('is-active'); i.querySelector('.mobile-subnav-list').style.maxHeight = null; }
            });

            if(parent.classList.contains('is-active')) {
                parent.classList.remove('is-active'); sub.style.maxHeight = null;
            } else {
                parent.classList.add('is-active'); sub.style.maxHeight = sub.scrollHeight + "px";
            }
        });
    });
}

function setupFooter() {
    const footer = document.querySelector('.footer');
    if(!footer) return;
    footer.innerHTML = `
        <div class="footer-content">
            <div class="footer-col">
                <h4>FCaseStore</h4>
                <p>Acessórios premium para seu iPhone.</p>
                <div class="social-icons" style="margin-top:10px; display:flex; gap:10px; font-size:1.5rem">
                    <i class="fab fa-instagram"></i> <i class="fab fa-whatsapp"></i>
                </div>
            </div>
            <div class="footer-col">
                <h4>Links Úteis</h4>
                <ul style="list-style:none; line-height:2">
                    <li><a href="/">Início</a></li>
                    <li><a href="/collections.html">Produtos</a></li>
                    <li><a href="#">Contato</a></li>
                </ul>
            </div>
        </div>
        <div style="margin-top:30px; border-top:1px solid #333; padding-top:20px; font-size:0.8rem">
            &copy; 2024 FCaseStore. Todos os direitos reservados.
        </div>
    `;
}

function renderCartLayout() {
    const container = document.querySelector('.cart-container');
    if(!container) return;
    container.innerHTML = `
        <div class="cart-header">
            <h3>Seu Carrinho</h3>
            <button class="cart-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="cart-body"></div>
        <div class="cart-footer">
            <div class="cart-subtotal" style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:15px">
                <span>Total:</span> <span class="cart-subtotal-price">R$ 0,00</span>
            </div>
            <a href="checkout.html" class="btn-checkout" style="display:block; width:100%; padding:15px; background:var(--color-brand-primary); color:white; text-align:center; font-weight:bold; border-radius:5px">Finalizar Compra</a>
        </div>
    `;
}

function setupCartEventListeners() {
    const openBtn = document.querySelector('.cart-link');
    const container = document.querySelector('.cart-container');
    const overlay = document.querySelector('.cart-overlay');
    
    if(openBtn) openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        container.classList.add('is-open');
        overlay.classList.add('is-open');
        renderCartItems();
    });

    const closeCart = () => {
        container.classList.remove('is-open');
        overlay.classList.remove('is-open');
    };

    document.addEventListener('click', e => {
        if(e.target.closest('.cart-close-btn') || e.target.classList.contains('cart-overlay')) {
            closeCart();
        }
    });

    const body = document.querySelector('.cart-body');
    if(body) {
        body.addEventListener('click', e => {
            const index = e.target.closest('.cart-item')?.dataset.index;
            if(index === undefined) return;
            
            if(e.target.closest('.increase')) updateCartQtyByIndex(index, 1);
            if(e.target.closest('.decrease')) updateCartQtyByIndex(index, -1);
            if(e.target.closest('.remove')) removeFromCartByIndex(index);
        });
    }
}

function renderCartItems() {
    const body = document.querySelector('.cart-body');
    const totalEl = document.querySelector('.cart-subtotal-price');
    if(!body) return;

    if(!cart || cart.length === 0) {
        body.innerHTML = '<p style="text-align:center; padding:20px">Carrinho vazio.</p>';
        if(totalEl) totalEl.textContent = "R$ 0,00";
        return;
    }

    let total = 0;
    
    body.innerHTML = cart.map((item, index) => {
        const product = window.allProducts.find(x => x.id === item.productId);
        if(!product) return '';

        let finalPrice = product.basePrice;
        let finalImg = product.images[0];
        let variantName = "";

        if (item.variantId) {
            const variant = product.variants.find(v => v.id === item.variantId || v.sku === item.variantId);
            if (variant) {
                if (variant.price) finalPrice = variant.price;
                if (variant.gallery && variant.gallery.length > 0) finalImg = variant.gallery[0];
                variantName = `${variant.model || ''} ${variant.color || ''}`;
            }
        }

        total += finalPrice * item.qty;

        return `
            <div class="cart-item" data-index="${index}" style="display:flex; gap:10px; margin-bottom:15px">
                <img src="${finalImg}" style="width:60px; height:60px; object-fit:cover; border-radius:5px">
                <div style="flex:1">
                    <p style="font-weight:bold; font-size:0.9rem; margin-bottom:2px">${product.name}</p>
                    <p style="font-size:0.8rem; color:#666; margin-bottom:4px">${variantName}</p>
                    <p>${finalPrice.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px">
                        <button class="decrease" style="padding:2px 8px; border:1px solid #ccc">-</button>
                        <span>${item.qty}</span>
                        <button class="increase" style="padding:2px 8px; border:1px solid #ccc">+</button>
                    </div>
                </div>
                <button class="remove" style="color:red; background:none"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }).join('');

    if(totalEl) totalEl.textContent = total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    updateCartIconCount();
}

window.addToCartMulti = function(productId, qty, variantId = null) {
    refreshCartState(); 
    
    const existingIndex = cart.findIndex(item => item.productId === productId && item.variantId === variantId);

    if(existingIndex > -1) {
        cart[existingIndex].qty += qty;
    } else {
        cart.push({ productId, variantId, qty });
    }
    
    saveCart();
    
    if (!window.location.href.includes('checkout.html')) {
        const container = document.querySelector('.cart-container');
        const overlay = document.querySelector('.cart-overlay');
        if(container && overlay) {
            container.classList.add('is-open');
            overlay.classList.add('is-open');
        }
    }
};

window.addToCart = function(productId) {
    window.addToCartMulti(productId, 1, null);
};

function updateCartQtyByIndex(index, change) {
    if(cart[index]) {
        cart[index].qty += change;
        if(cart[index].qty <= 0) cart.splice(index, 1);
        saveCart();
    }
}

function removeFromCartByIndex(index) {
    cart.splice(index, 1);
    saveCart();
}

function updateCartIconCount() {
    let totalItems = 0;
    if(cart && cart.length > 0) {
        for (let i = 0; i < cart.length; i++) {
            totalItems += (cart[i].qty || 0);
        }
    }

    const badges = document.querySelectorAll('.header-cart-count');
    badges.forEach(badge => {
        badge.innerText = totalItems;
        if (totalItems > 0) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}