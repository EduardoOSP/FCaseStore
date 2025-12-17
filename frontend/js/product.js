/* js/product.js */
let currentProduct = null;
let selectedModel = null;
let selectedColor = null;
let selectedVariantId = null;

document.addEventListener('productsLoaded', () => initProductPage(window.allProducts));
if (window.allProducts) initProductPage(window.allProducts);

function initProductPage(products) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    currentProduct = products.find(p => p.id === id);

    if (!currentProduct) {
        document.querySelector('.product-detail-container').innerHTML = '<h2>Produto não encontrado</h2>';
        return;
    }
    renderLayout();
}

function renderLayout() {
    const p = currentProduct;
    const hasModels = p.optionsSummary?.hasModelSelection;
    const hasColors = p.optionsSummary?.hasColorSelection;

    const availableModels = hasModels 
        ? [...new Set(p.variants.map(v => v.model))].sort() 
        : [];

    document.querySelector('.product-detail-container').innerHTML = `
        <div class="product-layout">
            <div class="product-gallery">
                <span class="product-breadcrumb">Início > ${p.category} > ${p.subcategory}</span>
                <div class="main-slider" id="mainSlider"></div>
                <div class="thumbs-track" id="thumbsTrack"></div>
            </div>

            <div class="product-info">
                <h1>${p.name}</h1>
                <p class="product-price" id="priceDisplay">${p.basePrice.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
                
                <div class="product-options">
                    ${hasModels ? `
                        <div class="option-group">
                            <label>Modelo:</label>
                            <!-- CORREÇÃO 3: Option hidden para sumir após seleção -->
                            <select id="model-select" class="form-select" onchange="selectModel(this.value)">
                                <option value="" disabled selected hidden>Selecione o modelo</option>
                                ${availableModels.map(m => `<option value="${m}">${m}</option>`).join('')}
                            </select>
                        </div>
                    ` : ''}

                    ${hasColors ? `
                        <div class="option-group">
                            <label>Cor:</label>
                            <div class="option-grid" id="colors-container"></div>
                        </div>
                    ` : ''}
                </div>

                <div class="purchase-row">
                    <div class="qty-selector-lg">
                        <button onclick="updatePageQty(-1)">-</button>
                        <input type="text" id="pageQty" value="1" readonly>
                        <button onclick="updatePageQty(1)">+</button>
                    </div>
                    <button class="btn-add-cart-lg" id="btnAddPage" disabled>Selecione as opções</button>
                </div>

                <div class="product-desc"><h3>Descrição</h3><p>${p.description}</p></div>
            </div>
        </div>
    `;

    // Inicialização
    if (!hasModels && !hasColors && p.variants.length > 0) {
        // Produto sem opções (ex: carregador) -> Seleciona automático
        selectedVariantId = p.variants[0].id || p.variants[0].sku;
        updateGallery(p.variants[0].gallery || p.images);
        updateBuyButton(false, "Adicionar ao Carrinho");
    } else {
        updateGallery(p.images);
    }
    
    if(hasColors) renderColors(p.optionsSummary.colors);
    
    // APLICA O ESTADO INICIAL (Transparente se precisar de modelo)
    checkAvailability(); 

    document.getElementById('btnAddPage').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('pageQty').value);
        window.addToCartMulti(p.id, qty, selectedVariantId);
    });
}

function renderColors(colorsList) {
    const container = document.getElementById('colors-container');
    container.innerHTML = colorsList.map(c => `
        <button class="option-btn color-btn" data-val="${c.name}" onclick="selectColor('${c.name}')" title="${c.name}">
            <span class="dot" style="background-color: ${c.hex}"></span>
        </button>
    `).join('');
}

window.selectModel = function(val) {
    selectedModel = val;
    checkAvailability();
};

window.selectColor = function(val) {
    selectedColor = val;
    document.querySelectorAll('#colors-container .option-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.val === val);
    });
    checkAvailability();
};

function checkAvailability() {
    const p = currentProduct;
    const hasModels = p.optionsSummary.hasModelSelection;
    const hasColors = p.optionsSummary.hasColorSelection;
    const colorBtns = document.querySelectorAll('#colors-container .option-btn');

    // CORREÇÃO 2: Cores transparentes se não tiver modelo selecionado
    if (hasModels && !selectedModel) {
        colorBtns.forEach(btn => btn.classList.add('waiting-model'));
        updateBuyButton(true, "Selecione o modelo");
        return; // Para aqui
    } else {
        colorBtns.forEach(btn => btn.classList.remove('waiting-model'));
    }

    // Filtrar Cores Disponíveis para o Modelo Selecionado
    if(hasModels && selectedModel && hasColors) {
        const validColors = p.variants
            .filter(v => v.model === selectedModel)
            .map(v => v.color);
        
        colorBtns.forEach(btn => {
            const colorName = btn.dataset.val;
            if(!validColors.includes(colorName)) {
                btn.classList.add('disabled');
                if(selectedColor === colorName) selectedColor = null; 
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    // Validação Final de Seleção
    if ((hasModels && !selectedModel) || (hasColors && !selectedColor)) {
        updateBuyButton(true, "Selecione as opções");
        selectedVariantId = null;
        return;
    }

    // Busca Variante
    const variant = p.variants.find(v => {
        const matchModel = hasModels ? v.model === selectedModel : true;
        const matchColor = hasColors ? v.color === selectedColor : true;
        return matchModel && matchColor;
    });

    if (variant) {
        selectedVariantId = variant.id || variant.sku;
        
        // CORREÇÃO 2: Foca na primeira imagem da variante
        const variantImages = (variant.gallery && variant.gallery.length > 0) ? variant.gallery : p.images;
        // Combina imagens do pai + variante (opcional, ou usa só variantImages)
        const finalImages = [...new Set([...p.images, ...variantImages])];
        
        updateGallery(finalImages);
        window.goToSlide(0); // Reseta carrossel para o início

        if(variant.price) document.getElementById('priceDisplay').textContent = variant.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

        if (variant.stock > 0) updateBuyButton(false, "Adicionar ao Carrinho");
        else updateBuyButton(true, "Esgotado");

    } else {
        updateBuyButton(true, "Indisponível");
        selectedVariantId = null;
    }
}

function updateGallery(images) {
    const slider = document.getElementById('mainSlider');
    const thumbs = document.getElementById('thumbsTrack');
    slider.innerHTML = images.map((src, i) => `<div class="slider-item" id="slide-${i}"><img src="${src}"></div>`).join('');
    thumbs.innerHTML = images.map((src, i) => `<button class="thumb-btn" onclick="goToSlide(${i})"><img src="${src}"></button>`).join('');
}

window.goToSlide = function(i) {
    const slide = document.getElementById(`slide-${i}`);
    if(slide) document.getElementById('mainSlider').scrollTo({left: slide.offsetLeft, behavior:'smooth'});
};

function updateBuyButton(disabled, text) {
    const btn = document.getElementById('btnAddPage');
    btn.disabled = disabled;
    btn.innerText = text;
    btn.style.background = disabled ? '#ccc' : 'var(--color-success)';
}

window.updatePageQty = (v) => {
    const el = document.getElementById('pageQty');
    let val = parseInt(el.value) + v;
    if(val < 1) val = 1;
    el.value = val;
};