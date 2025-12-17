/* js/admin.js */

const API_URL = "/api";

/* ============================================================
   1. SEGURANÇA & AUTENTICAÇÃO
   ============================================================ */

// Verifica se tem token ao carregar
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

// Função Wrapper para requisições autenticadas
async function fetchAuth(url, options = {}) {
    const headers = options.headers || {};
    
    // Adiciona o Token no Header
    headers['Authorization'] = `Bearer ${token}`;

    // Se for FormData, o navegador define o Content-Type automaticamente.
    // Se for JSON, garantimos que o header exista se não foi passado.
    // (Nota: No código abaixo, quando enviamos JSON, já passamos 'Content-Type': 'application/json', então ok)

    const response = await fetch(url, { ...options, headers });

    // Se der 401 (Não autorizado), o token expirou ou é inválido
    if (response.status === 401) {
        alert("Sessão expirada. Por favor, faça login novamente.");
        logout();
        return null;
    }

    return response;
}

window.logout = function() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
};

/* ============================================================
   2. INICIALIZAÇÃO E UI
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("FCaseStore Admin carregado.");
    loadProducts();
    loadBanners();
});

window.switchTab = function(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(`tab-${tab}`);
    if(target) target.classList.add('active');
    
    // Adiciona classe active ao botão clicado
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
};

window.closeModal = function(id) {
    document.getElementById(id).classList.remove('open');
};

/* ============================================================
   3. GERENCIAMENTO DE PRODUTOS
   ============================================================ */

async function loadProducts() {
    try {
        // GET é público, mas pode usar fetchAuth sem problemas
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        const products = data.products || [];
        
        const tbody = document.querySelector('#products-table tbody');
        
        if(products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#777">Nenhum produto encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            const img = p.images?.[0] || '';
            // Prepara o objeto para ser passado no onclick (escapa aspas simples)
            const jsonString = JSON.stringify(p).replace(/'/g, "&apos;");

            return `
            <tr>
                <td><img src="${img}" class="table-img"></td>
                <td>
                    <strong>${p.name}</strong><br>
                    <small style="color:#777">SKU: ${p.id}</small>
                </td>
                <td>${p.category} <i class="fas fa-angle-right" style="font-size:0.7em; color:#ccc"></i> ${p.subcategory}</td>
                <td>R$ ${p.basePrice.toFixed(2)}</td>
                <td class="actions">
                    <button class="btn-icon edit" onclick='editProduct(${jsonString})' title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteProduct('${p.id}', '${p._id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
    }
}

window.openProductForm = function() {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('modal-title').innerText = "Novo Produto";
    
    // Limpa containers dinâmicos
    document.getElementById('general-preview').innerHTML = '';
    document.getElementById('variants-list-container').innerHTML = '';
    document.getElementById('colors-list-container').innerHTML = '';
    
    document.getElementById('product-modal').classList.add('open');
};

window.editProduct = function(p) {
    // 1. Dados Básicos
    document.getElementById('prod-id').value = p._id; // ID do Mongo
    document.getElementById('prod-customId').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-subcategory').value = p.subcategory;
    document.getElementById('prod-price').value = p.basePrice;
    document.getElementById('prod-desc').value = p.description || '';
    
    // Flags
    document.getElementById('flag-featured').checked = p.flags?.isFeatured || false;
    document.getElementById('flag-bestseller').checked = p.flags?.isBestSeller || false;
    document.getElementById('flag-new').checked = p.flags?.isNew || false;
    document.getElementById('prod-active').checked = p.active !== false;

    // 2. Imagens Gerais (Gera Cards Visuais)
    const prev = document.getElementById('general-preview');
    prev.innerHTML = '';
    if(p.images && Array.isArray(p.images)) {
        p.images.forEach(url => addImageCard(url, prev));
    }

    // 3. Variantes
    const vCont = document.getElementById('variants-list-container');
    vCont.innerHTML = '';
    if(p.variants && Array.isArray(p.variants)) {
        p.variants.forEach(v => addVariantEntry(v));
    }

    // 4. Cores
    const cCont = document.getElementById('colors-list-container');
    cCont.innerHTML = '';
    if(p.optionsSummary?.colors && Array.isArray(p.optionsSummary.colors)) {
        p.optionsSummary.colors.forEach(c => addColorEntry(c));
    }

    // Campo oculto de modelos (opcional, pois geramos dinâmico ao salvar)
    document.getElementById('prod-models').value = p.optionsSummary?.models?.join(', ') || '';

    document.getElementById('modal-title').innerText = "Editar Produto";
    document.getElementById('product-modal').classList.add('open');
};

/* --- SALVAR PRODUTO (SUBMIT) --- */
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Coleta Imagens Gerais (Lê do dataset dos cards)
    const images = [];
    document.querySelectorAll('#general-preview .img-preview-card').forEach(c => {
        images.push(c.dataset.url);
    });

    // 2. Coleta Variantes
    const variants = [];
    const modelsSet = new Set();
    
    document.querySelectorAll('#variants-list-container .dynamic-row').forEach(row => {
        const model = row.querySelector('.var-model').value.trim();
        const sku = row.querySelector('.var-sku').value.trim();
        const color = row.querySelector('.var-color').value.trim();
        const priceInput = row.querySelector('.var-price').value;
        
        if(model) modelsSet.add(model);
        
        // Coleta URLs da galeria desta variante específica
        const variantGallery = [];
        row.querySelectorAll('.variant-gallery .mini-thumb-wrapper').forEach(w => {
            variantGallery.push(w.dataset.url);
        });

        // Só adiciona se tiver SKU
        if(sku) {
            variants.push({
                id: sku, // Mantemos ID e SKU iguais para compatibilidade
                sku: sku,
                model: model,
                color: color,
                stock: parseInt(row.querySelector('.var-stock').value) || 0,
                price: priceInput ? parseFloat(priceInput) : parseFloat(document.getElementById('prod-price').value),
                gallery: variantGallery
            });
        }
    });

    // 3. Coleta Cores
    const colors = [];
    document.querySelectorAll('#colors-list-container .dynamic-row').forEach(row => {
        const name = row.querySelector('.color-name').value.trim();
        if(name) {
            colors.push({
                name: name,
                hex: row.querySelector('.color-hex').value,
                cardImage: row.querySelector('.color-img').value
            });
        }
    });

    // 4. Monta o Objeto JSON Final
    const productData = {
        id: document.getElementById('prod-customId').value,
        active: document.getElementById('prod-active').checked,
        name: document.getElementById('prod-name').value,
        category: document.getElementById('prod-category').value,
        subcategory: document.getElementById('prod-subcategory').value,
        description: document.getElementById('prod-desc').value,
        basePrice: parseFloat(document.getElementById('prod-price').value),
        
        flags: {
            isFeatured: document.getElementById('flag-featured').checked,
            isBestSeller: document.getElementById('flag-bestseller').checked,
            isNew: document.getElementById('flag-new').checked
        },
        
        images: images,
        
        optionsSummary: {
            hasModelSelection: variants.some(v => v.model !== ''),
            hasColorSelection: colors.length > 0,
            models: Array.from(modelsSet), // Gera lista baseada nas variantes cadastradas
            colors: colors
        },
        
        variants: variants
    };

    // 5. Envia para a API
    const mongoId = document.getElementById('prod-id').value;
    const method = mongoId ? 'PUT' : 'POST';
    const url = mongoId ? `${API_URL}/products/${mongoId}` : `${API_URL}/products`;

    try {
        // USA fetchAuth PARA ENVIAR O TOKEN
        const res = await fetchAuth(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (res && res.ok) {
            alert("Produto salvo com sucesso!");
            closeModal('product-modal');
            loadProducts();
        } else if (res) {
            const err = await res.json();
            alert("Erro ao salvar: " + (err.message || "Erro desconhecido"));
        }
    } catch (err) {
        console.error(err);
        alert("Erro de conexão com o servidor.");
    }
});

/* --- DELETAR PRODUTO --- */
window.deleteProduct = async function(customId, mongoId) {
    if(!confirm(`Tem certeza que deseja deletar o produto ${customId}?`)) return;
    
    try {
        const idToDelete = mongoId || customId;
        // USA fetchAuth PARA ENVIAR O TOKEN
        await fetchAuth(`${API_URL}/products/${idToDelete}`, { method: 'DELETE' });
        loadProducts();
    } catch (err) {
        console.error(err);
        alert("Erro ao deletar produto.");
    }
};

/* ============================================================
   4. GERENCIAMENTO DE BANNERS
   ============================================================ */

let currentBanners = [];

async function loadBanners() {
    try {
        const res = await fetch(`${API_URL}/banners`);
        currentBanners = await res.json();
        
        // Ordena por ordem crescente
        currentBanners.sort((a,b) => (a.order || 0) - (b.order || 0));
        
        const container = document.getElementById('banners-list');
        
        if(currentBanners.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:20px">Nenhum banner cadastrado.</p>';
            return;
        }

        container.innerHTML = currentBanners.map((b, idx) => `
            <div class="banner-card">
                <div class="banner-order-controls">
                    ${idx > 0 ? `<button class="btn-sort" onclick="moveBanner(${idx}, -1)" title="Subir">▲</button>` : '<div style="height:24px"></div>'}
                    ${idx < currentBanners.length -1 ? `<button class="btn-sort" onclick="moveBanner(${idx}, 1)" title="Descer">▼</button>` : '<div style="height:24px"></div>'}
                </div>
                
                <img src="${b.image}" class="banner-thumb">
                
                <div class="banner-info">
                    <strong>Ordem: ${b.order || 0}</strong><br>
                    <small>Link: ${b.link || 'Sem link'}</small>
                </div>
                
                <div class="banner-actions">
                    <button class="btn-icon edit" onclick='editBanner(${JSON.stringify(b).replace(/'/g, "&apos;")})' title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteBanner('${b._id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Erro ao carregar banners:", e);
    }
}

window.openBannerForm = function() {
    document.getElementById('banner-form').reset();
    document.getElementById('banner-id').value = '';
    document.getElementById('banner-preview').innerHTML = '';
    document.getElementById('banner-modal').classList.add('open');
};

window.editBanner = function(b) {
    document.getElementById('banner-id').value = b._id;
    document.getElementById('banner-link').value = b.link || '';
    document.getElementById('banner-order').value = b.order || 0;
    
    const prev = document.getElementById('banner-preview');
    prev.innerHTML = `<img src="${b.image}" style="max-width:100%; max-height:150px; border-radius:4px">`;
    prev.dataset.currentUrl = b.image; 

    document.getElementById('banner-modal').classList.add('open');
};

/* --- SALVAR BANNER --- */
document.getElementById('banner-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('banner-id').value;
    const previewContainer = document.getElementById('banner-preview');
    
    // Pega a URL nova (img src) ou a antiga (dataset)
    const newImg = previewContainer.querySelector('img');
    let imageUrl = newImg ? newImg.src : previewContainer.dataset.currentUrl;

    if(!imageUrl) return alert("Imagem é obrigatória para o banner");

    // Define ordem (se novo, vai para o final)
    let order = parseInt(document.getElementById('banner-order').value) || 0;
    if(!id && currentBanners.length > 0) {
        order = Math.max(...currentBanners.map(b => b.order || 0)) + 1;
    }

    const data = {
        image: imageUrl,
        link: document.getElementById('banner-link').value,
        order: order
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/banners/${id}` : `${API_URL}/banners`;

    // USA fetchAuth
    const res = await fetchAuth(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if(res && res.ok) {
        closeModal('banner-modal');
        loadBanners();
    }
});

/* --- DELETAR BANNER --- */
window.deleteBanner = async function(id) {
    if(confirm('Excluir banner?')) {
        await fetchAuth(`${API_URL}/banners/${id}`, { method: 'DELETE' });
        loadBanners();
    }
};

/* --- MOVER BANNER (ORDENAÇÃO) --- */
window.moveBanner = async function(index, direction) {
    const bannerA = currentBanners[index];
    const bannerB = currentBanners[index + direction];

    // Troca as ordens visualmente
    const tempOrder = bannerA.order;
    bannerA.order = bannerB.order;
    bannerB.order = tempOrder;

    // Atualiza ambos no servidor via PUT
    await Promise.all([
        fetchAuth(`${API_URL}/banners/${bannerA._id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ order: bannerA.order })
        }),
        fetchAuth(`${API_URL}/banners/${bannerB._id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ order: bannerB.order })
        })
    ]);

    loadBanners();
};

/* ============================================================
   5. SISTEMA DE UPLOAD & DOM DINÂMICO
   ============================================================ */

/* --- UPLOAD GENÉRICO --- */
async function uploadFileToCloud(file) {
    const formData = new FormData();
    formData.append('files', file); // Backend espera 'files'

    try {
        // Upload usa fetchAuth (mas o browser define boundary no content-type)
        // OBS: fetchAuth já adiciona o Header Authorization
        const res = await fetchAuth(`${API_URL}/upload`, { 
            method: 'POST', 
            body: formData 
        });
        
        if(!res || !res.ok) throw new Error("Falha no upload");
        
        const result = await res.json();
        return result.urls[0]; // Retorna a primeira URL
    } catch (err) {
        console.error(err);
        alert("Erro ao fazer upload da imagem.");
        return null;
    }
}

/* --- IMAGENS GERAIS (PAI) --- */
window.handleGeneralUpload = async function(input) {
    const files = input.files;
    const container = document.getElementById('general-preview');
    if(!files.length) return;

    // Loading Card
    const loading = document.createElement('div');
    loading.className = 'img-preview-card';
    loading.innerHTML = '<div style="padding:10px; font-size:0.8rem; text-align:center">Enviando...</div>';
    container.appendChild(loading);

    for (let file of files) {
        const url = await uploadFileToCloud(file);
        if(url) addImageCard(url, container);
    }
    
    loading.remove();
    input.value = ''; // Limpa input
};

function addImageCard(url, container) {
    const div = document.createElement('div');
    div.className = 'img-preview-card';
    div.dataset.url = url;
    div.innerHTML = `
        <img src="${url}">
        <div class="img-controls">
            <button type="button" class="btn-move" onclick="moveImg(this, -1)">❮</button>
            <button type="button" class="btn-del-img" onclick="this.closest('.img-preview-card').remove()">×</button>
            <button type="button" class="btn-move" onclick="moveImg(this, 1)">❯</button>
        </div>
    `;
    container.appendChild(div);
}

window.moveImg = function(btn, dir) {
    const card = btn.closest('.img-preview-card');
    const sibling = dir === -1 ? card.previousElementSibling : card.nextElementSibling;
    if(sibling) {
        const parent = card.parentNode;
        if(dir === -1) parent.insertBefore(card, sibling);
        else parent.insertBefore(sibling, card);
    }
};

/* --- UPLOAD INLINE (Cores e Variantes) --- */
window.triggerInlineUpload = function(btn) {
    // Cria input invisível on-the-fly
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        // Feedback Visual
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
        btn.disabled = true;

        const url = await uploadFileToCloud(file);
        
        if(url) {
            // Acha o input de texto ao lado do botão e preenche
            const textInput = btn.parentElement.querySelector('input[type="text"], input[type="hidden"]');
            if(textInput) textInput.value = url;
            
            // Se for COR, atualiza a miniatura
            const row = btn.closest('.dynamic-row');
            if (row && row.querySelector('.color-preview-area')) {
               updateColorThumb(row, url);
            }

            btn.innerHTML = '<i class="fas fa-check" style="color:green"></i>';
        } else {
            btn.innerHTML = '<i class="fas fa-times" style="color:red"></i>';
        }

        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-upload"></i>';
            btn.disabled = false;
        }, 2000);
    };

    fileInput.click();
};

function updateColorThumb(row, url) {
    // Remove thumb antigo se houver
    const oldWrap = row.querySelector('.color-preview-wrapper');
    if(oldWrap) oldWrap.remove();

    // Cria novo thumb
    const wrapper = document.createElement('div');
    wrapper.className = 'color-preview-wrapper'; // Classe padronizada CSS
    wrapper.innerHTML = `<img src="${url}" class="color-thumb">`;
    
    // Insere antes do botão de upload
    const btnContainer = row.querySelector('.color-preview-area') || row.querySelector('.input-with-btn');
    const btn = btnContainer.querySelector('button');
    btnContainer.insertBefore(wrapper, btn);
}

/* --- UPLOAD VARIANTE (Múltiplas) --- */
window.triggerVariantUpload = function(btn) {
    const fileInput = document.createElement('input'); 
    fileInput.type = 'file'; 
    fileInput.multiple = true;
    
    fileInput.onchange = async e => {
        const galleryContainer = btn.parentElement; // .variant-gallery
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        for (let file of e.target.files) {
            const url = await uploadFileToCloud(file);
            if(url) {
                const wrap = document.createElement('div');
                wrap.className = 'mini-thumb-wrapper';
                wrap.dataset.url = url;
                wrap.innerHTML = `
                    <img src="${url}" class="mini-thumb">
                    <button type="button" class="btn-rm-thumb" onclick="this.parentElement.remove()">×</button>
                `;
                // Insere antes do botão de adicionar
                galleryContainer.insertBefore(wrap, btn);
            }
        }
        btn.innerHTML = originalHtml;
    };
    fileInput.click();
};

/* --- ADICIONAR LINHAS (HTML) --- */

window.addVariantEntry = function(data = {}) {
    const container = document.getElementById('variants-list-container');
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    
    // Monta Galeria
    let galleryHTML = '';
    if (data.gallery && data.gallery.length > 0) {
        galleryHTML = data.gallery.map(url => `
            <div class="mini-thumb-wrapper" data-url="${url}">
                <img src="${url}" class="mini-thumb">
                <button type="button" class="btn-rm-thumb" onclick="this.parentElement.remove()">×</button>
            </div>
        `).join('');
    }

    div.innerHTML = `
        <div class="row-inputs">
            <input type="text" placeholder="SKU" value="${data.sku || data.id || ''}" class="var-sku" style="width:100px">
            <input type="text" placeholder="Modelo" value="${data.model || ''}" class="var-model" style="flex:1">
            <input type="text" placeholder="Cor" value="${data.color || ''}" class="var-color" style="flex:1">
            <input type="number" placeholder="Qtd" value="${data.stock || 0}" class="var-stock" style="width:60px">
            <input type="number" placeholder="R$" value="${data.price || ''}" class="var-price" style="width:70px" title="Preço específico">
            <button type="button" onclick="this.closest('.dynamic-row').remove()" class="btn-remove">&times;</button>
        </div>
        
        <div class="variant-gallery">
            ${galleryHTML}
            <button type="button" class="btn-add-img-sm" onclick="triggerVariantUpload(this)">
                <i class="fas fa-camera"></i> <small>Add Foto</small>
            </button>
        </div>
    `;
    container.appendChild(div);
};

window.addColorEntry = function(data = {}) {
    const container = document.getElementById('colors-list-container');
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    
    const imgHtml = data.cardImage ? `
        <div class="color-preview-wrapper">
            <img src="${data.cardImage}" class="color-thumb">
        </div>` : '';

    div.innerHTML = `
        <div class="row-inputs">
            <input type="text" placeholder="Nome Cor" value="${data.name || ''}" class="color-name" style="flex:1">
            <input type="color" value="${data.hex || '#000000'}" class="color-hex" style="width:40px; height:40px; padding:2px">
            
            <div class="input-with-btn" style="flex:2">
                <input type="text" placeholder="URL Bolinha" value="${data.cardImage || ''}" class="color-img">
                <div class="color-preview-area" style="display:flex; gap:5px; align-items:center">
                    ${imgHtml}
                    <button type="button" class="btn-icon upload" onclick="triggerColorUpload(this)">
                        <i class="fas fa-upload"></i>
                    </button>
                </div>
            </div>

            <button type="button" onclick="this.closest('.dynamic-row').remove()" class="btn-remove">&times;</button>
        </div>
    `;
    container.appendChild(div);
};