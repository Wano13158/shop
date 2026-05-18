const search = document.getElementById('search');
const cards = Array.from(document.querySelectorAll('.catalog .card'));
const filterButtons = document.querySelectorAll('[data-filter]');

let activeFilter = 'all';

function applyFilters() {
  if (!cards.length) return;

  const q = (search?.value || '').trim().toLowerCase();
  cards.forEach(card => {
    const name = (card.dataset.name || '').toLowerCase();
    const stock = Number(card.dataset.stock || 0);
    const price = Number(card.dataset.price || 0);
    const bySearch = !q || name.includes(q);
    const byFilter = activeFilter === 'all' ||
      (activeFilter === 'stock' && stock > 0) ||
      (activeFilter === 'cheap' && price <= 100);
    card.classList.toggle('hidden', !(bySearch && byFilter));
  });
}

search?.addEventListener('input', applyFilters);
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    filterButtons.forEach(x => x.style.outline = 'none');
    btn.style.outline = '2px solid #22c55e';
    applyFilters();
  });
});

const STORAGE_KEY = 'grut_shop_cart_v1';
const TG_ORDER_URL = 'https://t.me/OfficialGrut123';

const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCart');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartCounters = document.querySelectorAll('[data-cart-count]');

let cart = loadCart();

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function getTotalItems() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getTotalPrice() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updateCartCounters() {
  const totalItems = getTotalItems();
  cartCounters.forEach(counter => {
    counter.textContent = totalItems;
  });
}

function getOrderMessage() {
  const lines = cart.map(item => `• ${item.name} × ${item.qty} = ${item.price * item.qty} грн`);
  lines.push(`Разом: ${getTotalPrice()} грн`);
  lines.push('Мій контакт для підтвердження замовлення:');
  return `Привіт! Хочу замовити:${'\n'}${lines.join('\n')}`;
}

function goToTelegramCheckout() {
  if (!cart.length) {
    alert('Додайте товар у кошик перед оплатою.');
    return;
  }

  const url = `${TG_ORDER_URL}?text=${encodeURIComponent(getOrderMessage())}`;
  window.open(url, '_blank');
}

function renderCart() {
  updateCartCounters();

  if (!cartItemsEl || !cartTotalEl) return;
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<li class="empty">Кошик порожній</li>';
    cartTotalEl.textContent = '0 грн';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  cartItemsEl.innerHTML = cart
    .map(item => `<li><span>${item.name} × ${item.qty}</span><b>${item.price * item.qty} грн</b></li>`)
    .join('');

  cartTotalEl.textContent = `${getTotalPrice()} грн`;
  if (checkoutBtn) checkoutBtn.disabled = false;
}

function addToCart(card) {
  const name = card.dataset.name || 'Модель';
  const price = Number(card.dataset.price || 0);
  const stock = Number(card.dataset.stock || 0);

  if (stock <= 0) {
    alert('Цього товару зараз немає в наявності.');
    return;
  }

  const existing = cart.find(item => item.name === name);
  if (existing) {
    if (existing.qty >= stock) {
      alert('Доступна максимальна кількість для цього товару.');
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({ name, price, qty: 1, stock });
  }

  saveCart();
  renderCart();
}

document.querySelectorAll('[data-add-cart]').forEach(button => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const card = button.closest('.card');
    if (!card) return;
    addToCart(card);
  });
});

clearCartBtn?.addEventListener('click', () => {
  cart = [];
  saveCart();
  renderCart();
});

checkoutBtn?.addEventListener('click', goToTelegramCheckout);

document.querySelectorAll('[data-checkout]').forEach(btn => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    goToTelegramCheckout();
  });
});

renderCart();
applyFilters();
