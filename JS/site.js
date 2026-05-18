const search = document.getElementById('search');
const cards = Array.from(document.querySelectorAll('.catalog .card'));
const filterButtons = document.querySelectorAll('[data-filter]');

let activeFilter = 'all';

function applyFilters() {
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

const cart = [];
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCart');

function renderCart() {
  if (!cartItemsEl || !cartTotalEl) return;
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<li class="empty">Кошик порожній</li>';
    cartTotalEl.textContent = '0 грн';
    return;
  }

  cartItemsEl.innerHTML = cart
    .map(item => `<li><span>${item.name} × ${item.qty}</span><b>${item.price * item.qty} грн</b></li>`)
    .join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  cartTotalEl.textContent = `${total} грн`;
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
  cart.length = 0;
  renderCart();
});

renderCart();
applyFilters();
