/* js/collections.js */

document.addEventListener('productsLoaded', () => {
    if (window.allProducts && window.allProducts.length > 0) {
        initCollectionsPage(window.allProducts);
    } else {
        showError("Nenhum produto carregado.");
    }
});

if (window.allProducts && window.allProducts.length > 0) {
    initCollectionsPage(window.allProducts);
}

function initCollectionsPage(products) {
    try {
        renderSidebar(products);
        applyUrlParams(); 
        
        // 1. Saneia e esconde opções inválidas antes de filtrar
        updateFilterVisibility(); 
        
        // 2. Filtra os produtos
        filterAndRender(); 
        
        setupPageEvents();
    } catch (error) {
        console.error("Erro coleções:", error);
    }
}

/* --- RENDERIZAÇÃO DA SIDEBAR --- */
function renderSidebar(products) {
    const container = document.getElementById('filters-container');
    if (!container) return;

    const data = { category: new Set(), subcategory: new Set(), models: new Set(), colors: new Set() };

    products.forEach(p => {
        if(p.category) data.category.add(p.category);
        if(p.subcategory) data.subcategory.add(p.subcategory);
        p.optionsSummary?.models?.forEach(m => data.models.add(m));
        p.optionsSummary?.colors?.forEach(c => data.colors.add(c.name));
    });

    container.innerHTML = `
        ${createAccordion('Categorias', [...data.category].sort(), 'category')}
        ${createAccordion('Subcategorias', [...data.subcategory].sort(), 'subcategory')}
        ${createAccordion('Modelos', [...data.models].sort(), 'models')}
        ${createAccordion('Cores', [...data.colors].sort(), 'colors')}
    `;
}

function createAccordion(title, list, type) {
    if (list.length === 0) return '';
    return `
        <div class="filter-group" data-group-type="${type}">
            <h3 onclick="toggleFilter(this)">${title} <i class="fas fa-chevron-down"></i></h3>
            <div class="filter-content">
                ${list.map(i => `
                    <div class="filter-option" data-val="${i}">
                        <input type="checkbox" id="${type}-${i}" value="${i}" data-type="${type}">
                        <label for="${type}-${i}">${i}</label>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

window.toggleFilter = function(h3) {
    const content = h3.nextElementSibling;
    const icon = h3.querySelector('i');
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.style.transform = 'rotate(180deg)';
    }
};

/* --- LEITURA URL --- */
function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const map = { 'category':'category', 'subcategory':'subcategory', 'model':'models', 'tag':'tags', 'color':'colors' };

    for (const [key, type] of Object.entries(map)) {
        const val = params.get(key);
        if (val) {
            const decoded = decodeURIComponent(val);
            const checkbox = document.querySelector(`input[data-type="${type}"][value="${decoded}"]`);
            if (checkbox) {
                checkbox.checked = true;
                const content = checkbox.closest('.filter-content');
                if(content) content.style.maxHeight = content.scrollHeight + "px";
                
                // Sincronia reversa: Se selecionar sub, marca pai
                if (type === 'subcategory') syncParentCategory(decoded);
            }
        }
    }
}

function syncParentCategory(subcatName) {
    const product = window.allProducts.find(p => p.subcategory === subcatName);
    if (product && product.category) {
        const parentBox = document.querySelector(`input[data-type="category"][value="${product.category}"]`);
        if (parentBox && !parentBox.checked) {
            parentBox.checked = true;
            const content = parentBox.closest('.filter-content');
            if(content) content.style.maxHeight = content.scrollHeight + "px";
        }
    }
}

/* --- NOVA LÓGICA DE HIERARQUIA (SANEAMENTO) --- */
function updateFilterVisibility() {
    // 1. Pega o que está selecionado agora
    const selCats = getCheckedValues('category');
    const selSubs = getCheckedValues('subcategory');

    // --- PASSO A: Calcular Subcategorias Válidas ---
    // (Baseado apenas nas Categorias selecionadas)
    let productsForSubs = window.allProducts;
    if (selCats.length > 0) {
        productsForSubs = productsForSubs.filter(p => selCats.includes(p.category));
    }
    
    const validSubs = new Set(productsForSubs.map(p => p.subcategory));

    // --- PASSO B: Calcular Modelos e Cores Válidos ---
    // (Baseado em Categoria E Subcategoria selecionadas)
    let productsForAttributes = productsForSubs; // Já herda o filtro de categoria
    if (selSubs.length > 0) {
        productsForAttributes = productsForAttributes.filter(p => selSubs.includes(p.subcategory));
    }

    const validModels = new Set();
    const validColors = new Set();

    productsForAttributes.forEach(p => {
        p.optionsSummary?.models?.forEach(m => validModels.add(m));
        p.optionsSummary?.colors?.forEach(c => validColors.add(c.name));
    });

    // --- PASSO C: Aplicar na DOM (Esconder e Desmarcar) ---
    
    applyVisibility('subcategory', validSubs);
    applyVisibility('models', validModels);
    applyVisibility('colors', validColors);
}

function getCheckedValues(type) {
    const values = [];
    document.querySelectorAll(`input[data-type="${type}"]:checked`).forEach(i => values.push(i.value));
    return values;
}

function applyVisibility(type, validSet) {
    document.querySelectorAll(`.filter-option input[data-type="${type}"]`).forEach(input => {
        const parent = input.closest('.filter-option');
        if (validSet.has(input.value)) {
            parent.style.display = 'flex';
        } else {
            parent.style.display = 'none';
            // Se estava marcado mas agora é inválido, desmarca para não bugar o filtro
            if(input.checked) input.checked = false; 
        }
    });
}

/* --- FILTRAGEM --- */
function filterAndRender() {
    // 1. Limpa opções inválidas antes de ler
    updateFilterVisibility();

    // 2. Lê os filtros ativos (agora limpos)
    const current = { category: [], subcategory: [], models: [], colors: [] };
    document.querySelectorAll('#filters-container input:checked').forEach(input => {
        current[input.dataset.type].push(input.value);
    });

    // 3. Filtra produtos
    const result = window.allProducts.filter(p => {
        if (current.category.length && !current.category.includes(p.category)) return false;
        if (current.subcategory.length && !current.subcategory.includes(p.subcategory)) return false;
        
        if (current.models.length) {
            const hasModel = p.optionsSummary?.models?.some(m => current.models.includes(m));
            if (!hasModel) return false;
        }
        
        if (current.colors.length) {
            const hasColor = p.optionsSummary?.colors?.some(c => current.colors.includes(c.name));
            if (!hasColor) return false;
        }
        
        return true;
    });

    updateTitleUI(result.length, current);
    renderGrid(result);
}

function renderGrid(list) {
    const grid = document.querySelector('.products-grid');
    const btnMobile = document.querySelector('.btn-apply-filters');
    
    if (list.length === 0) {
        grid.innerHTML = '<p class="no-products" style="grid-column:1/-1; text-align:center; padding:40px; color:#666">Nenhum produto encontrado.</p>';
        if(btnMobile) btnMobile.textContent = 'Ver Resultados (0)';
        return;
    }

    grid.innerHTML = list.map(p => createCollectionCard(p)).join('');
    if(btnMobile) btnMobile.textContent = `Ver Resultados (${list.length})`;
}

function createCollectionCard(p) {
    let dotsHTML = '';
    if(p.optionsSummary && p.optionsSummary.hasColorSelection) {
        const visibleColors = p.optionsSummary.colors.slice(0, 4);
        dotsHTML = visibleColors.map(c => `
            <div class="color-dot" style="background-color:${c.hex}" onclick="window.changeCardImage(this, '${c.cardImage}')"></div>
        `).join('');
    }
    const colorContainerHTML = `<div class="card-colors">${dotsHTML}</div>`;

    const needsSelection = p.optionsSummary?.hasModelSelection || p.optionsSummary?.hasColorSelection;
    const btnText = needsSelection ? "Escolher Opções" : "Adicionar";
    const btnClass = needsSelection ? "" : "add-direct";
    const action = needsSelection ? `href="/product.html?id=${p.id}"` : `onclick="window.addToCart('${p.id}')"`;
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
            <${tag} ${action} class="btn-card-action ${btnClass}">${btnText}</${tag}>
        </div>
    </div>`;
}

function updateTitleUI(count, current) {
    const title = document.querySelector('.products-title');
    const bread = document.getElementById('breadcrumb-text');
    let text = "Todos os Produtos";
    
    if (current.subcategory.length === 1) text = current.subcategory[0];
    else if (current.category.length === 1) text = current.category[0];
    else if (current.models.length > 0) text = "Filtro por Modelo";

    title.textContent = text;
    if(bread) bread.textContent = `/ ${text}`;
}

function setupPageEvents() {
    const sidebar = document.querySelector('.filters-sidebar');
    const btnOpen = document.querySelector('.btn-filter-mobile');
    const btnClose = document.querySelector('.filters-close-btn');
    const btnApply = document.querySelector('.btn-apply-filters');

    if(btnOpen) btnOpen.addEventListener('click', () => sidebar.classList.add('is-open'));
    if(btnClose) btnClose.addEventListener('click', () => sidebar.classList.remove('is-open'));
    if(btnApply) btnApply.addEventListener('click', () => { sidebar.classList.remove('is-open'); window.scrollTo({top:0, behavior:'smooth'}); });

    const container = document.getElementById('filters-container');
    if(container) {
        container.addEventListener('change', (e) => {
            if(e.target.tagName === 'INPUT') {
                filterAndRender();
            }
        });
    }
}

function showError(msg) {
    const grid = document.querySelector('.products-grid');
    if(grid) grid.innerHTML = `<p style="padding:20px;text-align:center">${msg}</p>`;
}