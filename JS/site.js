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

applyFilters();
