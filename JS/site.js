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
const ORDERS_KEY = 'grut_shop_orders_v1';
const TG_ORDER_URL = 'https://t.me/OfficialGrut123';

const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCart');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartCounters = document.querySelectorAll('[data-cart-count]');
const ordersListEl = document.getElementById('ordersList');

let cart = loadCart();
let orders = loadOrders();

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


function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function renderOrders() {
  if (!ordersListEl) return;
  if (!orders.length) {
    ordersListEl.innerHTML = '<li class="empty">Поки що замовлень немає</li>';
    return;
  }

  ordersListEl.innerHTML = orders.map(order => `
    <li class="order-item">
      <div class="order-top">
        <b>Замовлення #${order.id} — ${order.customer.name}</b>
        <span class="status ${order.status === 'Прийнято' ? 'accepted' : 'pending'}">${order.status}</span>
      </div>
      <p>ID клієнта: ${order.customer.id} | Номер: ${order.customer.phone}</p>
      <p>${order.items.map(item => `${item.name} × ${item.qty}`).join(', ')}</p>
      <p>Сума: <b>${order.total} грн</b></p>
      <button class="control-btn" data-accept-order="${order.id}">Позначити як прийнято</button>
    </li>
  `).join('');
}

function createOrder(profile) {
  const order = {
    id: Date.now(),
    customer: profile,
    items: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price })),
    total: getTotalPrice(),
    status: 'В очікуванні'
  };
  orders.unshift(order);
  saveOrders();
  renderOrders();
}

function askCustomerProfile() {
  const id = prompt('Введіть ID замовника (наприклад: 1):', '1')?.trim();
  if (!id) return null;

  const name = prompt('Введіть імʼя замовника:', 'Іван')?.trim();
  if (!name) return null;

  const phone = prompt('Введіть номер телефону:', '+380992931923')?.trim();
  if (!phone) return null;

  return { id, name, phone };
}

function getOrderMessage(profile) {
  const orderLines = cart.map((item, index) =>
    `${index + 1}. ${item.name} × ${item.qty} — ${item.price * item.qty} грн`
  );

  return [
    '🛍️ НОВЕ ЗАМОВЛЕННЯ',
    '',
    '👤 Дані клієнта:',
    `ID: ${profile.id}`,
    `Імʼя: ${profile.name}`,
    `Номер: ${profile.phone}`,
    '',
    '📦 Товари:',
    ...orderLines,
    '',
    `💰 Разом: ${getTotalPrice()} грн`
  ].join('\n');
}

function goToTelegramCheckout() {
  if (!cart.length) {
    alert('Додайте товар у кошик перед оплатою.');
    return;
  }

  const profile = askCustomerProfile();
  if (!profile) {
    alert('Щоб оформити замовлення, заповніть ID, імʼя та номер телефону.');
    return;
  }

  createOrder(profile);
  const url = `${TG_ORDER_URL}?text=${encodeURIComponent(getOrderMessage(profile))}`;
  window.open(url, '_blank');

  cart = [];
  saveCart();
  renderCart();
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


function setupCartButtons() {
  document.querySelectorAll('[data-add-cart]').forEach(button => {
    const card = button.closest('.card');
    if (!card) return;
    const stock = Number(card.dataset.stock || 0);

    if (stock <= 0) {
      button.classList.add('bat-unavailable');
      button.textContent = 'Додати в кошик (не в наявності)';
      button.setAttribute('data-delay-message', 'Замовлення буде з затримкою, бо товару зараз немає в наявності.');
    }
  });
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

setupCartButtons();
renderCart();
renderOrders();
applyFilters();

ordersListEl?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-accept-order]');
  if (!button) return;
  const orderId = Number(button.dataset.acceptOrder);
  const order = orders.find(item => item.id === orderId);
  if (!order) return;
  order.status = 'Прийнято';
  saveOrders();
  renderOrders();
});
