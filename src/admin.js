import { 
  auth, 
  db, 
  storage, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  ref, 
  uploadBytes, 
  getDownloadURL,
  isFirebaseConfigured,
  PRODUTOS_PADRAO
} from './firebase.js';

import { formatCurrency } from './cart.js';

// Estado local
let currentUser = null;
let currentTab = 'produtos';
let productsList = [];
let transactionsList = [];
let financialFilter = 'mes'; // 'hoje', 'semana', 'mes', 'todos'

/**
 * Inicialização do Admin
 */
document.addEventListener('DOMContentLoaded', () => {
  setupAuthListener();
  setupEventListeners();
  checkDemoBanner();
});

/**
 * Exibe aviso se o Firebase ainda não foi configurado
 */
function checkDemoBanner() {
  const banner = document.getElementById('demo-mode-alert');
  if (!banner) return;

  if (!isFirebaseConfigured) {
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

/**
 * Monitora autenticação
 */
function setupAuthListener() {
  const loginSection = document.getElementById('admin-login-section');
  const dashboardSection = document.getElementById('admin-dashboard-section');
  const userEmailDisplay = document.getElementById('admin-user-email');

  if (isFirebaseConfigured && auth) {
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      if (user) {
        if (loginSection) loginSection.style.display = 'none';
        if (dashboardSection) dashboardSection.style.display = 'block';
        if (userEmailDisplay) userEmailDisplay.textContent = user.email;
        loadProducts();
        loadFinancialRecords();
      } else {
        if (loginSection) loginSection.style.display = 'block';
        if (dashboardSection) dashboardSection.style.display = 'none';
      }
    });
  } else {
    // Modo de demonstração / local sem Firebase conectado ainda
    const demoLogged = localStorage.getItem('jl_admin_demo_logged') === 'true';
    if (demoLogged) {
      currentUser = { email: 'admin@jlimports.com (Modo Local/Demo)' };
      if (loginSection) loginSection.style.display = 'none';
      if (dashboardSection) dashboardSection.style.display = 'block';
      if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
      loadProducts();
      loadFinancialRecords();
    } else {
      if (loginSection) loginSection.style.display = 'block';
      if (dashboardSection) dashboardSection.style.display = 'none';
    }
  }
}

/**
 * Configura eventos dos botões e abas
 */
function setupEventListeners() {
  // Formulário de Login
  const loginForm = document.getElementById('admin-login-form');
  loginForm?.addEventListener('submit', handleLogin);

  // Botão de Logout
  const logoutBtn = document.getElementById('btn-logout');
  logoutBtn?.addEventListener('click', handleLogout);

  // Troca de Abas (Produtos / Financeiro)
  const tabButtons = document.querySelectorAll('.admin-tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentTab = e.currentTarget.getAttribute('data-tab');

      document.getElementById('tab-content-produtos').style.display = 
        currentTab === 'produtos' ? 'block' : 'none';
      document.getElementById('tab-content-financeiro').style.display = 
        currentTab === 'financeiro' ? 'block' : 'none';
    });
  });

  // Modal de Produto
  // Modal de Produto e Semeadura Inicial
  const btnNewProduct = document.getElementById('btn-new-product');
  const btnSeedProducts = document.getElementById('btn-seed-products');
  const productModal = document.getElementById('product-modal');
  const btnCloseProductModal = document.getElementById('btn-close-product-modal');
  const btnCancelProductModal = document.getElementById('btn-cancel-product-modal');
  const productForm = document.getElementById('product-form');

  btnNewProduct?.addEventListener('click', () => openProductModal());
  btnSeedProducts?.addEventListener('click', () => handleSeedInitialProducts());
  btnCloseProductModal?.addEventListener('click', () => closeProductModal());
  btnCancelProductModal?.addEventListener('click', () => closeProductModal());
  productForm?.addEventListener('submit', handleSaveProduct);

  // Imagem URL Preview em tempo real
  const imageUrlInput = document.getElementById('product-image-url');
  const imagePreview = document.getElementById('product-image-preview');
  const imagePlaceholder = document.getElementById('product-image-placeholder');

  imageUrlInput?.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url && imagePreview) {
      imagePreview.src = url;
      imagePreview.style.display = 'block';
      if (imagePlaceholder) imagePlaceholder.style.display = 'none';
    } else {
      if (imagePreview) imagePreview.style.display = 'none';
      if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
    }
  });

  // Tipo de Estoque / Sob Encomenda
  const tipoEstoqueSelect = document.getElementById('prod-tipo-estoque');
  const groupPrazoReserva = document.getElementById('group-prazo-reserva');
  const prazoReservaInput = document.getElementById('prod-prazo-reserva');

  tipoEstoqueSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'reserva') {
      if (groupPrazoReserva) groupPrazoReserva.style.display = 'block';
      if (prazoReservaInput && !prazoReservaInput.value) {
        prazoReservaInput.value = 'Previsão: 3 a 5 dias úteis';
      }
    } else {
      if (groupPrazoReserva) groupPrazoReserva.style.display = 'none';
    }
  });

  // Modal de Lançamento Financeiro
  const btnNewTransaction = document.getElementById('btn-new-transaction');
  const transactionModal = document.getElementById('transaction-modal');
  const btnCloseTransModal = document.getElementById('btn-close-trans-modal');
  const btnCancelTransModal = document.getElementById('btn-cancel-trans-modal');
  const transactionForm = document.getElementById('transaction-form');
  const transTipoSelect = document.getElementById('trans-tipo');

  btnNewTransaction?.addEventListener('click', () => openTransactionModal());
  btnCloseTransModal?.addEventListener('click', () => closeTransactionModal());
  btnCancelTransModal?.addEventListener('click', () => closeTransactionModal());
  transactionForm?.addEventListener('submit', handleSaveTransaction);

  // Alterna campos de pagamento / categoria de despesa
  transTipoSelect?.addEventListener('change', (e) => {
    const isEntrada = e.target.value === 'entrada';
    document.getElementById('group-forma-pagamento').style.display = isEntrada ? 'block' : 'none';
    document.getElementById('group-categoria-despesa').style.display = isEntrada ? 'none' : 'block';
  });

  // Filtros Financeiros
  const filterBtns = document.querySelectorAll('.finance-filter-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      financialFilter = e.currentTarget.getAttribute('data-period');
      renderFinancialData();
    });
  });
}

/**
 * Realiza Login
 */
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorMsg = document.getElementById('login-error');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (errorMsg) errorMsg.style.display = 'none';
  if (submitBtn) {
    submitBtn.textContent = 'Autenticando...';
    submitBtn.disabled = true;
  }

  if (isFirebaseConfigured && auth) {
    try {
      // Tenta login direto
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn('Tentativa inicial de login:', err.code);

      // Se o usuário ainda não foi criado no console, tenta criar automaticamente no primeiro acesso
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          return;
        } catch (createErr) {
          console.error('Erro ao registrar novo admin:', createErr);
        }
      }

      if (errorMsg) {
        if (err.code === 'auth/wrong-password') {
          errorMsg.textContent = 'Senha incorreta. Tente novamente.';
        } else if (err.code === 'auth/invalid-email') {
          errorMsg.textContent = 'Formato de e-mail inválido.';
        } else if (err.code === 'auth/weak-password') {
          errorMsg.textContent = 'A senha deve conter no mínimo 6 caracteres.';
        } else {
          errorMsg.textContent = 'E-mail ou senha incorretos. Verifique suas credenciais.';
        }
        errorMsg.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.textContent = 'Entrar no Painel';
        submitBtn.disabled = false;
      }
    }
  } else {
    // Simulação no modo local
    if (email.toLowerCase() === 'jlimports@gmail.com' && password === 'jlimports123') {
      localStorage.setItem('jl_admin_demo_logged', 'true');
      setupAuthListener();
    } else {
      if (errorMsg) {
        errorMsg.textContent = 'Credenciais de demonstração: jlimports@gmail.com / jlimports123';
        errorMsg.style.display = 'block';
      }
    }
    if (submitBtn) {
      submitBtn.textContent = 'Entrar no Painel';
      submitBtn.disabled = false;
    }
  }
}

/**
 * Realiza Logout
 */
async function handleLogout() {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  } else {
    localStorage.removeItem('jl_admin_demo_logged');
    setupAuthListener();
  }
}

/* ==========================================================================
   PRODUTOS — CRUD
   ========================================================================== */

/**
 * Carrega lista de produtos
 */
export async function loadProducts() {
  const loading = document.getElementById('products-admin-loading');
  if (loading) loading.style.display = 'block';

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'produtos'));
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      productsList = items;
    } catch (e) {
      console.error('Erro ao ler do Firestore:', e);
      productsList = getLocalProducts();
    }
  } else {
    productsList = getLocalProducts();
  }

  if (loading) loading.style.display = 'none';
  renderProductsTable();
}

function getLocalProducts() {
  const saved = localStorage.getItem('jl_produtos_local');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [...PRODUTOS_PADRAO];
}

function saveLocalProducts(list) {
  localStorage.setItem('jl_produtos_local', JSON.stringify(list));
}

/**
 * Renderiza tabela de produtos no admin
 */
function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  const btnSeed = document.getElementById('btn-seed-products');
  if (!tbody) return;

  if (productsList.length === 0) {
    if (btnSeed) btnSeed.style.display = 'inline-flex';
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:30px;">
      Nenhum produto cadastrado ainda. Use o botão <strong>"Cadastrar Novo Produto"</strong> ou <strong>"Carregar 6 Produtos Iniciais"</strong> para começar.
    </td></tr>`;
    return;
  }

  if (btnSeed) btnSeed.style.display = 'none';

  tbody.innerHTML = productsList.map((prod) => `
    <tr>
      <td style="width: 60px;">
        <img 
          src="${prod.imagem || './public/logo.png'}" 
          alt="${prod.nome}" 
          style="width: 44px; height: 44px; object-fit: contain; border-radius: var(--radius-sm); background: #000; padding: 2px;"
          onerror="this.onerror=null; this.src='./public/logo.png';"
        />
      </td>
      <td>
        <strong style="color: var(--text-main); font-size: 15px;">${prod.nome}</strong>
        <div style="font-size: 12px; color: var(--text-muted); max-width: 320px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
          ${prod.descricao || ''}
        </div>
      </td>
      <td>
        <span style="background: var(--bg-tertiary); padding: 4px 10px; border-radius: var(--radius-full); font-size: 12px;">
          ${prod.categoria || 'Geral'}
        </span>
      </td>
      <td>
        <strong style="color: var(--gold-light); font-size: 15px;">
          ${formatCurrency(prod.preco)}
        </strong>
      </td>
      <td>
        <div style="display: flex; flex-direction: column; gap: 5px; align-items: flex-start;">
          <span class="status-badge ${prod.ativo !== false ? 'active' : 'inactive'}">
            ${prod.ativo !== false ? '● Ativo' : '○ Inativo'}
          </span>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: var(--radius-full); background: ${prod.tipoEstoque === 'reserva' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(16, 185, 129, 0.12)'}; color: ${prod.tipoEstoque === 'reserva' ? '#F59E0B' : '#10B981'}; border: 1px solid ${prod.tipoEstoque === 'reserva' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(16, 185, 129, 0.25)'}; font-weight: 500;">
            ${prod.tipoEstoque === 'reserva' ? '⏳ Sob Reserva' : '📦 Em Estoque'}
          </span>
        </div>
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <button type="button" class="btn btn-secondary btn-edit-prod" data-id="${prod.id}" style="padding: 6px 12px; font-size: 12px; margin-right: 6px;">
          Editar
        </button>
        <button type="button" class="btn btn-danger btn-del-prod" data-id="${prod.id}" style="padding: 6px 12px; font-size: 12px;">
          Excluir
        </button>
      </td>
    </tr>
  `).join('');

  // Eventos de edição e exclusão
  tbody.querySelectorAll('.btn-edit-prod').forEach((b) => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const prod = productsList.find((p) => String(p.id) === String(id));
      if (prod) openProductModal(prod);
    });
  });

  tbody.querySelectorAll('.btn-del-prod').forEach((b) => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      handleDeleteProduct(id);
    });
  });
}

/**
 * Popula o banco com os 6 produtos padrão caso esteja vazio
 */
async function handleSeedInitialProducts() {
  if (!confirm('Deseja carregar os 6 produtos argentinos padrão (vinhos, alfajores, doce de leite) no banco de dados?')) return;

  const btnSeed = document.getElementById('btn-seed-products');
  if (btnSeed) {
    btnSeed.textContent = 'Carregando...';
    btnSeed.disabled = true;
  }

  try {
    if (isFirebaseConfigured && db) {
      for (const prod of PRODUTOS_PADRAO) {
        const { id, ...data } = prod;
        data.criadoEm = serverTimestamp();
        data.atualizadoEm = new Date().toISOString();
        await addDoc(collection(db, 'produtos'), data);
      }
    } else {
      saveLocalProducts([...PRODUTOS_PADRAO]);
    }
    await loadProducts();
    alert('Produtos iniciais carregados com sucesso!');
  } catch (err) {
    console.error('Erro ao semear produtos:', err);
    alert('Erro ao carregar produtos iniciais no Firebase. Verifique o console.');
  } finally {
    if (btnSeed) {
      btnSeed.textContent = '📦 Carregar 6 Produtos Iniciais no Banco';
      btnSeed.disabled = false;
    }
  }
}

function openProductModal(prod = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');
  const preview = document.getElementById('product-image-preview');
  const placeholder = document.getElementById('product-image-placeholder');

  form.reset();
  if (preview) {
    preview.style.display = 'none';
    preview.src = '';
  }
  if (placeholder) {
    placeholder.style.display = 'flex';
  }

  const groupPrazo = document.getElementById('group-prazo-reserva');

  if (prod) {
    title.textContent = 'Editar Produto';
    document.getElementById('prod-id').value = prod.id;
    document.getElementById('prod-nome').value = prod.nome || '';
    document.getElementById('prod-categoria').value = prod.categoria || 'Vinhos';
    document.getElementById('prod-preco').value = prod.preco || '';
    document.getElementById('prod-descricao').value = prod.descricao || '';
    document.getElementById('prod-ativo').checked = prod.ativo !== false;
    document.getElementById('product-image-url').value = prod.imagem || '';

    const tipoEstoque = prod.tipoEstoque || 'pronta_entrega';
    document.getElementById('prod-tipo-estoque').value = tipoEstoque;
    document.getElementById('prod-prazo-reserva').value = prod.prazoReserva || '';
    if (groupPrazo) groupPrazo.style.display = tipoEstoque === 'reserva' ? 'block' : 'none';

    if (prod.imagem && preview) {
      preview.src = prod.imagem;
      preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    }
  } else {
    title.textContent = 'Novo Produto';
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-ativo').checked = true;
    document.getElementById('prod-tipo-estoque').value = 'pronta_entrega';
    document.getElementById('prod-prazo-reserva').value = '';
    if (groupPrazo) groupPrazo.style.display = 'none';
  }

  modal?.classList.add('active');
}

function closeProductModal() {
  document.getElementById('product-modal')?.classList.remove('active');
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const nome = document.getElementById('prod-nome').value.trim();
  const categoria = document.getElementById('prod-categoria').value;
  const rawPreco = String(document.getElementById('prod-preco').value).replace(',', '.');
  const preco = parseFloat(rawPreco) || 0;
  const descricao = document.getElementById('prod-descricao').value.trim();
  const ativo = document.getElementById('prod-ativo').checked;
  const imageUrl = document.getElementById('product-image-url').value.trim();

  const tipoEstoque = document.getElementById('prod-tipo-estoque').value;
  const prazoReserva = tipoEstoque === 'reserva' ? (document.getElementById('prod-prazo-reserva').value.trim() || 'Prazo a combinar') : '';

  const saveBtn = document.getElementById('btn-save-product');
  if (saveBtn) {
    saveBtn.textContent = 'Salvando...';
    saveBtn.disabled = true;
  }

  try {
    const productData = {
      nome,
      categoria,
      preco,
      descricao,
      ativo,
      tipoEstoque,
      prazoReserva,
      imagem: imageUrl || './public/logo.png',
      atualizadoEm: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      if (id) {
        await updateDoc(doc(db, 'produtos', id), productData);
      } else {
        productData.criadoEm = serverTimestamp();
        await addDoc(collection(db, 'produtos'), productData);
      }
    } else {
      // Local fallback
      let list = getLocalProducts();
      if (id) {
        list = list.map((p) => String(p.id) === String(id) ? { ...p, ...productData } : p);
      } else {
        productData.id = 'prod_' + Date.now();
        list.unshift(productData);
      }
      saveLocalProducts(list);
    }

    closeProductModal();
    await loadProducts();
  } catch (err) {
    console.error('Erro ao salvar produto:', err);
    alert('Erro ao salvar produto. Verifique o console ou as regras do Firebase.');
  } finally {
    if (saveBtn) {
      saveBtn.textContent = 'Salvar Produto';
      saveBtn.disabled = false;
    }
  }
}

async function handleDeleteProduct(id) {
  if (!confirm('Tem certeza de que deseja excluir este produto do catálogo?')) return;

  try {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'produtos', id));
    } else {
      let list = getLocalProducts().filter((p) => String(p.id) !== String(id));
      saveLocalProducts(list);
    }
    await loadProducts();
  } catch (err) {
    console.error('Erro ao excluir:', err);
    alert('Erro ao excluir produto.');
  }
}

/* ==========================================================================
   GESTAO FINANCEIRA SIMPLIFICADA
   ========================================================================== */

export async function loadFinancialRecords() {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'financeiro'), orderBy('data', 'desc'));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      transactionsList = items;
    } catch (e) {
      console.warn('Erro ao carregar lançamentos financeiros do Firestore:', e);
      transactionsList = getLocalFinancialRecords();
    }
  } else {
    transactionsList = getLocalFinancialRecords();
  }

  renderFinancialData();
}

function getLocalFinancialRecords() {
  const saved = localStorage.getItem('jl_financeiro_local');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  // Exemplos iniciais
  return [
    {
      id: 'fin-1',
      tipo: 'entrada',
      data: new Date().toISOString().split('T')[0],
      descricao: 'Venda 2x Vinho Catena Zapata + 1x Alfajor Havanna',
      valor: 845.00,
      formaPagamento: 'Pix',
    },
    {
      id: 'fin-2',
      tipo: 'saida',
      data: new Date().toISOString().split('T')[0],
      descricao: 'Frete e transporte de lote Mendoza',
      valor: 320.00,
      categoriaDespesa: 'Frete & Transporte',
    }
  ];
}

function saveLocalFinancialRecords(list) {
  localStorage.setItem('jl_financeiro_local', JSON.stringify(list));
}

function renderFinancialData() {
  const tbody = document.getElementById('financial-table-body');
  const metricIncome = document.getElementById('metric-total-income');
  const metricExpense = document.getElementById('metric-total-expense');
  const metricBalance = document.getElementById('metric-total-balance');

  // Filtra por período com comparação direta de strings YYYY-MM-DD (sem distorção de fuso horário)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  const currentMonthStr = `${y}-${m}`;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const y7 = sevenDaysAgo.getFullYear();
  const m7 = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
  const d7 = String(sevenDaysAgo.getDate()).padStart(2, '0');
  const sevenDaysAgoStr = `${y7}-${m7}-${d7}`;

  const filtered = transactionsList.filter((item) => {
    if (financialFilter === 'todos') return true;
    const itemDateStr = (item.data || '').split('T')[0];

    if (financialFilter === 'hoje') {
      return itemDateStr === todayStr;
    }
    if (financialFilter === 'semana') {
      return itemDateStr >= sevenDaysAgoStr && itemDateStr <= todayStr;
    }
    if (financialFilter === 'mes') {
      return itemDateStr.startsWith(currentMonthStr);
    }
    return true;
  });

  // Calcula totais
  let totalIncome = 0;
  let totalExpense = 0;

  filtered.forEach((item) => {
    const val = Number(item.valor) || 0;
    if (item.tipo === 'entrada') totalIncome += val;
    else totalExpense += val;
  });

  const balance = totalIncome - totalExpense;

  if (metricIncome) metricIncome.textContent = formatCurrency(totalIncome);
  if (metricExpense) metricExpense.textContent = formatCurrency(totalExpense);
  if (metricBalance) {
    metricBalance.textContent = formatCurrency(balance);
    metricBalance.style.color = balance >= 0 ? 'var(--gold-light)' : 'var(--danger)';
  }

  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:30px;">Nenhum lançamento encontrado para este período.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((item) => {
    const isEntrada = item.tipo === 'entrada';
    const tagInfo = isEntrada ? item.formaPagamento || 'Pagamento' : item.categoriaDespesa || 'Despesa';
    const formattedDate = formatDisplayDate(item.data);

    return `
      <tr>
        <td>
          <span class="status-badge ${isEntrada ? 'income' : 'expense'}">
            ${isEntrada ? '↓ Entrada' : '↑ Saída'}
          </span>
        </td>
        <td>${formattedDate}</td>
        <td><strong style="color: var(--text-main);">${item.descricao}</strong></td>
        <td>
          <span style="background: var(--bg-tertiary); padding: 4px 10px; border-radius: var(--radius-full); font-size: 12px; color: var(--silver-accent);">
            ${tagInfo}
          </span>
        </td>
        <td>
          <strong style="color: ${isEntrada ? 'var(--gold-light)' : 'var(--danger)'}; font-size: 15px;">
            ${isEntrada ? '+' : '-'} ${formatCurrency(item.valor)}
          </strong>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn btn-secondary btn-edit-trans" data-id="${item.id}" style="padding: 5px 10px; font-size: 12px; margin-right: 6px;">
            Editar
          </button>
          <button type="button" class="btn btn-danger btn-del-trans" data-id="${item.id}" style="padding: 5px 10px; font-size: 12px;">
            Excluir
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Eventos de edição e exclusão de lançamentos
  tbody.querySelectorAll('.btn-edit-trans').forEach((b) => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const trans = transactionsList.find((t) => String(t.id) === String(id));
      if (trans) openTransactionModal(trans);
    });
  });

  tbody.querySelectorAll('.btn-del-trans').forEach((b) => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      handleDeleteTransaction(id);
    });
  });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function openTransactionModal(trans = null) {
  const modal = document.getElementById('transaction-modal');
  const title = document.getElementById('transaction-modal-title');
  const form = document.getElementById('transaction-form');
  form.reset();

  const groupForma = document.getElementById('group-forma-pagamento');
  const groupCat = document.getElementById('group-categoria-despesa');

  if (trans) {
    if (title) title.textContent = 'Editar Lançamento Financeiro';
    document.getElementById('trans-id').value = trans.id;
    document.getElementById('trans-tipo').value = trans.tipo || 'entrada';
    document.getElementById('trans-data').value = (trans.data || '').split('T')[0];
    document.getElementById('trans-descricao').value = trans.descricao || '';
    document.getElementById('trans-valor').value = trans.valor || '';

    if (trans.tipo === 'saida') {
      document.getElementById('trans-categoria-despesa').value = trans.categoriaDespesa || 'Outros';
      if (groupForma) groupForma.style.display = 'none';
      if (groupCat) groupCat.style.display = 'block';
    } else {
      document.getElementById('trans-forma-pagamento').value = trans.formaPagamento || 'Pix';
      if (groupForma) groupForma.style.display = 'block';
      if (groupCat) groupCat.style.display = 'none';
    }
  } else {
    if (title) title.textContent = 'Novo Lançamento Financeiro';
    document.getElementById('trans-id').value = '';
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    document.getElementById('trans-data').value = `${y}-${m}-${d}`;
    document.getElementById('trans-tipo').value = 'entrada';
    if (groupForma) groupForma.style.display = 'block';
    if (groupCat) groupCat.style.display = 'none';
  }

  modal?.classList.add('active');
}

function closeTransactionModal() {
  document.getElementById('transaction-modal')?.classList.remove('active');
}

async function handleSaveTransaction(e) {
  e.preventDefault();
  const id = document.getElementById('trans-id').value;
  const tipo = document.getElementById('trans-tipo').value;
  const data = document.getElementById('trans-data').value;
  const descricao = document.getElementById('trans-descricao').value.trim();
  const rawValor = String(document.getElementById('trans-valor').value).replace(',', '.');
  const valor = parseFloat(rawValor) || 0;
  const formaPagamento = document.getElementById('trans-forma-pagamento').value;
  const categoriaDespesa = document.getElementById('trans-categoria-despesa').value;

  const transData = {
    tipo,
    data,
    descricao,
    valor,
    formaPagamento: tipo === 'entrada' ? formaPagamento : '',
    categoriaDespesa: tipo === 'saida' ? categoriaDespesa : '',
    atualizadoEm: new Date().toISOString()
  };

  try {
    if (id) {
      // Edição
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'financeiro', id), transData);
      } else {
        const list = getLocalFinancialRecords();
        const index = list.findIndex((t) => String(t.id) === String(id));
        if (index > -1) {
          list[index] = { ...list[index], ...transData };
          saveLocalFinancialRecords(list);
        }
      }
    } else {
      // Novo
      transData.criadoEm = new Date().toISOString();
      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, 'financeiro'), transData);
      } else {
        const list = getLocalFinancialRecords();
        transData.id = 'fin_' + Date.now();
        list.unshift(transData);
        saveLocalFinancialRecords(list);
      }
    }

    closeTransactionModal();
    await loadFinancialRecords();
  } catch (err) {
    console.error('Erro ao salvar lançamento:', err);
    alert('Erro ao salvar lançamento financeiro.');
  }
}

async function handleDeleteTransaction(id) {
  if (!confirm('Deseja excluir este lançamento financeiro?')) return;

  try {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'financeiro', id));
    } else {
      let list = getLocalFinancialRecords().filter((t) => String(t.id) !== String(id));
      saveLocalFinancialRecords(list);
    }
    await loadFinancialRecords();
  } catch (err) {
    console.error('Erro ao excluir:', err);
  }
}
