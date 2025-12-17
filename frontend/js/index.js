/* js/index.js */

document.addEventListener('productsLoaded', () => {
    initHome(window.allProducts, window.siteBanners);
});
if(window.allProducts && window.allProducts.length > 0) {
    initHome(window.allProducts, window.siteBanners);
}

function initHome(products, banners) {
    renderBanners(banners);
    renderCollections(products);
    
    const featured = products.filter(p => p.flags && p.flags.isFeatured);
    const bestSellers = products.filter(p => p.flags && p.flags.isBestSeller);

    renderProductGrid(featured, '.destaques-grid');
    renderProductGrid(bestSellers, '.best-sellers-carousel');
}

function renderBanners(list) {
    const track = document.querySelector('.slider-track');
    if(!track || !list.length) return;

    track.innerHTML = list.map(b => `
        <div class="slide">
            <a href="${b.link || '#'}"><img src="${b.image}" alt="${b.alt}"></a>
        </div>
    `).join('');

    let i = 0;
    setInterval(() => {
        i = (i + 1) % list.length;
        track.scrollTo({left: track.offsetWidth * i, behavior: 'smooth'});
    }, 4000);
}

function renderCollections(products) {
    const container = document.querySelector('.collections-carousel');
    if(!container) return;

    const subs = [...new Set(products.map(p => p.subcategory))].filter(Boolean);

    container.innerHTML = subs.map(sub => {
        const prod = products.find(p => p.subcategory === sub);
        const img = prod ? prod.images[0] : '';
        
        return `
        <div class="collection-item">
            <a href="/collections.html?subcategory=${encodeURIComponent(sub)}">
                <div class="collection-img-wrapper" style="width:80px; height:80px; border-radius:50%; overflow:hidden; margin:0 auto 10px; background:#fff; border:2px solid transparent; transition:0.3s">
                    <img src="${img}" style="width:100%; height:100%; object-fit:cover">
                </div>
                <span class="collection-name" style="font-weight:600; font-size:0.9rem">${sub}</span>
            </a>
        </div>`;
    }).join('');
}

function renderProductGrid(list, selector) {
    const container = document.querySelector(selector);
    if(!container) return;
    container.innerHTML = list.map(p => createSmartCard(p)).join('');
}

function createSmartCard(p) {
    let dotsHTML = '';
    if(p.optionsSummary && p.optionsSummary.hasColorSelection) {
        const visibleColors = p.optionsSummary.colors.slice(0, 4);
        dotsHTML = visibleColors.map(c => `
            <div class="color-dot" 
                 style="background-color:${c.hex}" 
                 onclick="window.changeCardImage(this, '${c.cardImage}')"></div>
        `).join('');
    }
    
    // Container sempre existe para manter altura uniforme
    const colorContainerHTML = `<div class="card-colors">${dotsHTML}</div>`;

    const needsSelection = p.optionsSummary?.hasModelSelection || p.optionsSummary?.hasColorSelection;
    const btnText = needsSelection ? "Escolher Opções" : "Adicionar";
    const btnClass = needsSelection ? "" : "add-direct";
    const btnAction = needsSelection ? `href="/product.html?id=${p.id}"` : `onclick="window.addToCart('${p.id}')"`;
    const tag = needsSelection ? 'a' : 'button';

    return `
    <div class="common-card">
        <a href="/product.html?id=${p.id}" class="common-card-link">
            <img src="${p.images[0]}" class="common-card-img" alt="${p.name}">
        </a>
        <div class="common-card-info">
            <div>
                <h3 class="common-card-title">${p.name}</h3>
                ${colorContainerHTML} 
                <p class="common-card-price">${p.basePrice.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
            </div>
            <${tag} ${btnAction} class="btn-card-action ${btnClass}">${btnText}</${tag}>
        </div>
    </div>`;
}