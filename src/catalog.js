import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  isFirebaseConfigured, 
  PRODUTOS_PADRAO,
  WHATSAPP_NUMBER 
} from './firebase.js';

import { 
  addToCart, 
  getCart, 
  getCartCount, 
  getCartTotal, 
  formatCurrency, 
  updateQuantity, 
  removeFromCart, 
  checkoutViaWhatsApp 
} from './cart.js';

let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';

/**
 * Busca os produtos ativos
 */
export async function fetchProducts() {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'produtos'), where('ativo', '==', true));
      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });

      if (items.length > 0) {
        allProducts = items;
        return allProducts;
      }

      // Se o Firestore respondeu vazio, checa se há produtos locais salvos
      const localSaved = localStorage.getItem('jl_produtos_local');
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        const activeOnly = parsed.filter((p) => p.ativo !== false);
        if (activeOnly.length > 0) {
          allProducts = activeOnly;
          return allProducts;
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar produtos do Firestore, usando locais:', error);
    }
  }

  // Fallback para localStorage ou catálogo padrão
  const localSaved = localStorage.getItem('jl_produtos_local');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      const activeOnly = parsed.filter((p) => p.ativo !== false);
      if (activeOnly.length > 0) {
        allProducts = activeOnly;
        return allProducts;
      }
    } catch (e) {
      console.error(e);
    }
  }

  allProducts = PRODUTOS_PADRAO;
  return allProducts;
}

/**
 * Renderiza os produtos filtrados
 */
export function renderCatalog() {
  const container = document.getElementById('products-grid');
  const loading = document.getElementById('products-loading');
  const empty = document.getElementById('products-empty');

  if (!container) return;

  if (loading) loading.style.display = 'none';

  let filtered = allProducts.filter((item) => {
    const matchesCategory = 
      activeCategory === 'all' || 
      item.categoria?.toLowerCase() === activeCategory.toLowerCase();

    const matchesSearch = 
      !searchQuery ||
      item.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoria?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  container.innerHTML = filtered.map((product) => {
    const isReserva = product.tipoEstoque === 'reserva';
    const prazoTexto = product.prazoReserva || 'Previsão a tratar';

    return `
    <article class="product-card ${isReserva ? 'card-reserva' : ''}" data-id="${product.id}">
      <div class="product-img-wrap">
        <img 
          src="${product.imagem || './public/logo.png'}" 
          alt="${product.nome}" 
          class="product-img"
          loading="lazy"
          onerror="this.onerror=null; this.src='./public/logo.png';"
        />
        <div class="product-badges-top">
          <span class="product-category-tag">${product.categoria || 'Geral'}</span>
          <span class="stock-badge ${isReserva ? 'stock-reserva' : 'stock-pronta'}">
            ${isReserva ? '⏳ Sob Encomenda' : '● Em Estoque'}
          </span>
        </div>
      </div>

      <div class="product-body">
        <h3 class="product-title font-serif">${product.nome}</h3>
        <p class="product-description">${product.descricao || 'Produto argentino selecionado pela JL Imports.'}</p>
        
        ${isReserva ? `
          <div class="reserva-notice-box">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span><strong>Sob Encomenda:</strong> ${prazoTexto}</span>
          </div>
        ` : `
          <div class="pronta-notice-box">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Disponível para entrega imediata</span>
          </div>
        `}

        <div class="product-footer">
          <div class="price-tag">
            <span class="price-currency">R$</span>
            <span class="price-value">${Number(product.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="product-actions">
            <div class="qty-control">
              <button type="button" class="qty-btn btn-minus" aria-label="Diminuir">-</button>
              <input type="number" class="qty-input" value="1" min="1" max="99" readonly />
              <button type="button" class="qty-btn btn-plus" aria-label="Aumentar">+</button>
            </div>

            <button type="button" class="btn-add-cart ${isReserva ? 'btn-reserva' : ''}" data-id="${product.id}">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${isReserva ? `
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                ` : `
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                `}
              </svg>
              <span>${isReserva ? 'Reservar' : 'Adicionar'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
  }).join('');

  attachProductEventListeners();
}

/**
 * Vincula cliques de quantidade e adição ao carrinho
 */
function attachProductEventListeners() {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach((card) => {
    const productId = card.getAttribute('data-id');
    const product = allProducts.find((p) => String(p.id) === String(productId));
    if (!product) return;

    const minusBtn = card.querySelector('.btn-minus');
    const plusBtn = card.querySelector('.btn-plus');
    const input = card.querySelector('.qty-input');
    const addBtn = card.querySelector('.btn-add-cart');

    minusBtn?.addEventListener('click', () => {
      let val = parseInt(input.value, 10) || 1;
      if (val > 1) input.value = val - 1;
    });

    plusBtn?.addEventListener('click', () => {
      let val = parseInt(input.value, 10) || 1;
      input.value = val + 1;
    });

    addBtn?.addEventListener('click', () => {
      const quantity = parseInt(input.value, 10) || 1;
      addToCart(product, quantity);
      showToast(`${quantity}x "${product.nome}" adicionado ao carrinho!`);
      openCartDrawer();
    });
  });
}

/**
 * Atualiza o painel lateral do carrinho e badges
 */
export function updateCartUI() {
  const badge = document.getElementById('header-cart-badge');
  const count = getCartCount();
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  const mobileCartBar = document.getElementById('mobile-floating-cart-bar');
  const mobileCartBadge = document.getElementById('mobile-cart-badge-pill');
  const mobileCartTotal = document.getElementById('mobile-cart-total-text');

  if (mobileCartBadge) mobileCartBadge.textContent = count;
  if (mobileCartTotal) mobileCartTotal.textContent = formatCurrency(getCartTotal());
  if (mobileCartBar) {
    mobileCartBar.style.display = count > 0 ? 'block' : 'none';
  }

  const itemsContainer = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const footer = document.getElementById('cart-drawer-footer');
  const totalEl = document.getElementById('cart-total-display');

  const cart = getCart();

  if (cart.length === 0) {
    if (itemsContainer) itemsContainer.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    if (footer) footer.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (footer) footer.style.display = 'flex';

  if (totalEl) {
    totalEl.textContent = formatCurrency(getCartTotal());
  }

  if (itemsContainer) {
    itemsContainer.innerHTML = cart.map((item) => `
      <div class="cart-item" data-id="${item.id}">
        <img 
          src="${item.imagem || './public/logo.png'}" 
          alt="${item.nome}" 
          class="cart-item-img"
          onerror="this.onerror=null; this.src='./public/logo.png';"
        />
        <div class="cart-item-info">
          <div>
            <h4 class="cart-item-name">
              ${item.nome}
              ${item.tipoEstoque === 'reserva' ? '<span class="cart-reserva-badge">⏳ Reserva</span>' : ''}
            </h4>
            <div class="cart-item-price">${formatCurrency(item.preco)}</div>
          </div>

          <div class="cart-item-actions">
            <div class="qty-control" style="height: 30px;">
              <button type="button" class="qty-btn cart-qty-minus" data-id="${item.id}">-</button>
              <input type="number" class="qty-input" value="${item.quantity}" readonly style="width: 26px; font-size: 13px;" />
              <button type="button" class="qty-btn cart-qty-plus" data-id="${item.id}">+</button>
            </div>
            <strong style="color: var(--gold-light); font-size: 13px;">
              ${formatCurrency(item.preco * item.quantity)}
            </strong>
          </div>
        </div>

        <button type="button" class="cart-remove-btn" data-id="${item.id}" title="Remover item">
          &times;
        </button>
      </div>
    `).join('');

    // Eventos dentro do carrinho
    itemsContainer.querySelectorAll('.cart-qty-minus').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = cart.find((i) => String(i.id) === String(id));
        if (item) updateQuantity(id, item.quantity - 1);
      });
    });

    itemsContainer.querySelectorAll('.cart-qty-plus').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = cart.find((i) => String(i.id) === String(id));
        if (item) updateQuantity(id, item.quantity + 1);
      });
    });

    itemsContainer.querySelectorAll('.cart-remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        removeFromCart(id);
      });
    });
  }
}

/**
 * Exibe notificação Toast
 */
export function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" fill="none" stroke="var(--gold-primary)" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

/**
 * Controle de abertura e fechamento do carrinho lateral
 */
export function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  drawer?.classList.add('active');
  overlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  drawer?.classList.remove('active');
  overlay?.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Inicialização dos controles do catálogo
 */
export function initCatalog() {
  // Categorias
  const catButtons = document.querySelectorAll('.category-btn');
  catButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      catButtons.forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeCategory = e.currentTarget.getAttribute('data-category');
      renderCatalog();
    });
  });

  // Busca
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderCatalog();
  });

  // Drawer do Carrinho
  const cartTrigger = document.getElementById('cart-trigger-btn');
  const cartClose = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const checkoutBtn = document.getElementById('btn-checkout-whatsapp');
  const mobileCartBtn = document.getElementById('mobile-cart-action-btn');

  cartTrigger?.addEventListener('click', openCartDrawer);
  mobileCartBtn?.addEventListener('click', openCartDrawer);
  cartClose?.addEventListener('click', closeCartDrawer);
  cartOverlay?.addEventListener('click', closeCartDrawer);
  checkoutBtn?.addEventListener('click', checkoutViaWhatsApp);

  // CTA Encomendas
  const customOrderBtn = document.getElementById('custom-order-whatsapp-btn');
  customOrderBtn?.addEventListener('click', () => {
    const text = encodeURIComponent('Olá, JL Imports! Estou procurando um produto argentino específico e gostaria de consultar a disponibilidade sob encomenda.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  });

  // Evento global de carrinho atualizado
  window.addEventListener('cart-updated', () => {
    updateCartUI();
  });

  // Carrega e renderiza
  fetchProducts().then(() => {
    renderCatalog();
    updateCartUI();
  });
}
