import { WHATSAPP_NUMBER } from './firebase.js';

const STORAGE_KEY = 'jl_cart_items';

/**
 * Retorna os itens salvos no carrinho
 */
export function getCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Erro ao ler carrinho do localStorage:', e);
    return [];
  }
}

/**
 * Salva o carrinho e notifica ouvintes
 */
function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
  } catch (e) {
    console.error('Erro ao salvar carrinho:', e);
  }
}

/**
 * Adiciona um produto ao carrinho
 */
export function addToCart(product, quantity = 1) {
  const cart = getCart();
  const index = cart.findIndex((item) => item.id === product.id);

  const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

  if (index > -1) {
    cart[index].quantity += qtyToAdd;
  } else {
    cart.push({
      id: product.id,
      nome: product.nome,
      preco: Number(product.preco) || 0,
      imagem: product.imagem || '',
      categoria: product.categoria || '',
      quantity: qtyToAdd,
    });
  }

  saveCart(cart);
}

/**
 * Altera a quantidade de um item
 */
export function updateQuantity(productId, quantity) {
  let cart = getCart();
  const parsedQty = parseInt(quantity, 10);

  if (parsedQty <= 0) {
    cart = cart.filter((item) => item.id !== productId);
  } else {
    const item = cart.find((item) => item.id === productId);
    if (item) {
      item.quantity = parsedQty;
    }
  }

  saveCart(cart);
}

/**
 * Remove um item do carrinho
 */
export function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
}

/**
 * Limpa todo o carrinho
 */
export function clearCart() {
  saveCart([]);
}

/**
 * Retorna o total de itens no carrinho
 */
export function getCartCount() {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + item.quantity, 0);
}

/**
 * Retorna o valor monetário total do carrinho
 */
export function getCartTotal() {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + item.preco * item.quantity, 0);
}

/**
 * Formata valor em moeda brasileira (R$)
 */
export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Gera a mensagem formatada para o WhatsApp
 */
export function buildWhatsAppMessage() {
  const cart = getCart();
  if (cart.length === 0) return '';

  let message = `*Olá, JL Imports! Gostaria de fazer o seguinte pedido:*\n\n`;

  cart.forEach((item, index) => {
    const subtotal = item.preco * item.quantity;
    message += `${index + 1}. *${item.quantity}x* ${item.nome}\n`;
    message += `   _${formatCurrency(item.preco)} cada_ → *${formatCurrency(subtotal)}*\n\n`;
  });

  message += `-----------------------------\n`;
  message += `*VALOR TOTAL: ${formatCurrency(getCartTotal())}*\n`;
  message += `-----------------------------\n\n`;
  message += `Poderia me informar a disponibilidade e as formas de entrega? Obrigado!`;

  return message;
}

/**
 * Redireciona para o WhatsApp com a mensagem do carrinho
 */
export function checkoutViaWhatsApp() {
  const cart = getCart();
  if (cart.length === 0) {
    alert('Seu carrinho está vazio. Adicione produtos antes de finalizar!');
    return;
  }

  const message = buildWhatsAppMessage();
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;

  window.open(url, '_blank');
}
