/* js/checkout.js */

document.addEventListener('productsLoaded', () => {
    initializeCheckoutPage(window.allProducts);
});
// Fallback
if(window.allProducts) initializeCheckoutPage(window.allProducts);

function initializeCheckoutPage(products) {
    refreshCheckoutData(products);
    setupFormListener(products);
}

function refreshCheckoutData(products) {
    const savedCart = localStorage.getItem('shoppingCart');
    const cartItems = savedCart ? JSON.parse(savedCart) : [];

    if (cartItems.length === 0) {
        window.location.href = '/index.html';
        return;
    }
    
    renderOrderSummary(products, cartItems);
}

function renderOrderSummary(products, cart) {
    const containers = [
        document.querySelector('.order-summary__content'), // Desktop
        document.querySelector('.order-summary-mobile__content') // Mobile (Acordeão)
    ];
    const mobileTotalEl = document.querySelector('.order-summary-mobile__total-price');

    // Se não achar nenhum container, sai (evita erro)
    if (!containers[0] && !containers[1]) return;

    let subtotal = 0;

    const itemsHTML = cart.map((item, index) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return '';

        let finalPrice = product.basePrice;
        let finalImg = product.images[0];
        let variantInfo = "";

        // Lógica de Variante
        if (item.variantId) {
            const variant = product.variants.find(v => v.id === item.variantId || v.sku === item.variantId);
            if (variant) {
                if (variant.price) finalPrice = variant.price;
                if (variant.gallery && variant.gallery.length > 0) finalImg = variant.gallery[0];
                variantInfo = `${variant.model} - ${variant.color}`;
            }
        }

        subtotal += finalPrice * item.qty;

        return `
            <div class="order-product">
                <div class="order-product__image-wrapper">
                    <img src="${finalImg}" class="order-product__image" alt="${product.name}">
                    <!-- REMOVI O BADGE DE QUANTIDADE DAQUI PARA LIMPAR O VISUAL -->
                </div>
                
                <div class="order-product__details">
                    <div class="order-product__header">
                        <div>
                            <p class="order-product__name">${product.name}</p>
                            <p class="order-product__variant">${variantInfo}</p>
                        </div>
                        <span class="order-product__price">
                            ${(finalPrice * item.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>

                    <!-- BOTÕES DE QUANTIDADE (Adicionados aqui) -->
                    <div class="checkout-qty-control">
                        <button type="button" class="checkout-qty-btn" onclick="updateCheckoutQty(${index}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="checkout-qty-val">${item.qty}</span>
                        <button type="button" class="checkout-qty-btn" onclick="updateCheckoutQty(${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const formattedTotal = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const summaryHTML = `
        <div class="order-product-list">${itemsHTML}</div>
        <div class="order-totals">
            <div class="totals-row">
                <span>Subtotal</span>
                <span>${formattedTotal}</span>
            </div>
            <div class="totals-row">
                <span>Frete</span>
                <span>A calcular</span>
            </div>
            <div class="totals-row is-total">
                <span>Total</span>
                <span>${formattedTotal}</span>
            </div>
        </div>
    `;

    // Atualiza Desktop e Mobile com o mesmo HTML
    containers.forEach(c => { if(c) c.innerHTML = summaryHTML; });
    
    if (mobileTotalEl) mobileTotalEl.textContent = formattedTotal;
}

/* Função Global para alterar quantidade */
window.updateCheckoutQty = function(index, change) {
    let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    
    if (cart[index]) {
        cart[index].qty += change;
        
        // Remove se chegar a 0
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
        
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
        
        // Atualiza a tela atual e o ícone do header
        refreshCheckoutData(window.allProducts);
        if(window.updateCartIconCount) window.updateCartIconCount();
    }
};

/* Lógica do Formulário (WhatsApp) */
function setupFormListener(products) {
    const checkoutForm = document.getElementById('checkout-form');
    if (!checkoutForm) return;

    // Remove listener antigo para não duplicar (clone)
    const newForm = checkoutForm.cloneNode(true);
    checkoutForm.parentNode.replaceChild(newForm, checkoutForm);

    newForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        const data = new FormData(newForm);
        
        let msg = "Olá! Gostaria de finalizar meu pedido:\n\n";
        msg += `*Cliente:* ${data.get('name')}\n`;
        msg += `*Endereço:* ${data.get('address')}, ${data.get('number')} - ${data.get('neighborhood')}\n\n`;
        msg += "*ITENS:*\n";
        
        let total = 0;

        cart.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if(product) {
                let price = product.basePrice;
                let detail = "";
                if(item.variantId) {
                    const v = product.variants.find(x => x.id === item.variantId || x.sku === item.variantId);
                    if(v) {
                        if(v.price) price = v.price;
                        detail = `[${v.model} - ${v.color}]`;
                    }
                }
                msg += `- (${item.qty}x) ${product.name} ${detail}\n`;
                total += price * item.qty;
            }
        });

        msg += `\n*TOTAL: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`;
        
        const phone = "5515991871125"; 
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    });
}