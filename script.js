/* ═══════════════════════════════════════════════════
   SAVOUR — script.js
   All shared state lives in localStorage so customer
   and admin views always see the same data.
═══════════════════════════════════════════════════ */

let cart = [];
let serviceMode = '';
let tableId = '';
let selectedRating = 0;
let selectedCategory = '';
let activeCategory = 'All';
let currentItemModal = null;
let ORDERS = [];

/* ─── STORAGE HELPERS ─── */
const LS = {
  getMenu:      ()  => JSON.parse(localStorage.getItem('savour_menu')      || 'null'),
  setMenu:      (d) => localStorage.setItem('savour_menu',      JSON.stringify(d)),
  getFeedbacks: ()  => JSON.parse(localStorage.getItem('savour_feedbacks') || '[]'),
  setFeedbacks: (d) => localStorage.setItem('savour_feedbacks', JSON.stringify(d)),
  getOrders:    ()  => JSON.parse(localStorage.getItem('savour_orders')    || '[]'),
  setOrders:    (d) => localStorage.setItem('savour_orders',    JSON.stringify(d)),
};

/* ─── DEFAULT MENU ─── */
const DEFAULT_MENU = (() => {
  const cats = [
    { type:'Burger', cat:'Burger', img:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
    { type:'Pizza',  cat:'Pizza',  img:'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
    { type:'Pasta',  cat:'Pasta',  img:'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400' },
    { type:'Sushi',  cat:'Sushi',  img:'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
    { type:'Steak',  cat:'Steak',  img:'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
    { type:'Taco',   cat:'Taco',   img:'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=400' },
    { type:'Salad',  cat:'Salad',  img:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
    { type:'Dessert',cat:'Dessert',img:'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400' },
  ];
  const pfx = ['Classic','Spicy','Royal','Elite','Supreme','Zesty','Signature'];
  const items = [];

  /* ── Fried Rice first ── */
  items.push({ id:1, name:'Fried Rice', cat:'Rice', price:180,
    img:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
    desc:'Wok-tossed fragrant rice with vegetables, eggs, and a hint of sesame.' });

  for (let i = 0; i < 24; i++) {
    const c = cats[i % cats.length];
    const p = pfx[Math.floor(i / 4) % pfx.length];
    items.push({
      id: i + 2,
      name: `${p} ${c.type}`,
      cat: c.cat,
      price: 150 + i * 15,
      img: c.img,
      desc: `A delicious ${p.toLowerCase()} take on our signature ${c.type.toLowerCase()}, crafted with the finest ingredients.`
    });
  }
  return items;
})();

/* ─── INIT ─── */
function initData() {
  if (!LS.getMenu()) LS.setMenu(DEFAULT_MENU);
}
initData();

function getMenu() { return LS.getMenu() || DEFAULT_MENU; }

/* ─── LOADING SCREEN ─── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    ls.classList.add('fade-out');
    setTimeout(() => {
      ls.style.display = 'none';
      document.getElementById('mode-selection').style.display = 'block';
    }, 600);
  }, 1900);
});

/* ─── ALERT ─── */
function showAlert(title, msg, icon='✦') {
  document.getElementById('alert-title').innerText = title;
  document.getElementById('alert-msg').innerText   = msg;
  document.getElementById('alert-icon').innerText  = icon;
  document.getElementById('custom-alert').style.display = 'flex';
}
window.closeAlert = () => { document.getElementById('custom-alert').style.display = 'none'; };

/* ─── HOME ─── */
window.launchApp = (mode) => {
  document.getElementById('mode-selection').style.display = 'none';
  if (mode === 'customer') {
    document.getElementById('service-selector').style.display = 'flex';
  } else {
    /* Show owner view container, then show the login overlay inside it */
    document.getElementById('owner-view').style.display = 'block';
    document.getElementById('owner-login').style.display = 'flex';
  }
};
window.goHome = () => location.reload();

/* ─── SERVICE SELECTION ─── */
window.showTableInput = () => {
  document.getElementById('main-service-btns').style.display = 'none';
  document.getElementById('table-input-section').style.display = 'block';
};
window.resetServiceUI = () => {
  document.getElementById('main-service-btns').style.display = 'grid';
  document.getElementById('table-input-section').style.display = 'none';
};
window.confirmDineIn = () => {
  tableId = document.getElementById('table-no').value.trim();
  if (!tableId) return showAlert('TABLE MISSING', 'Please enter your table number.', '⚠️');
  setService('Dine-In');
};
window.setService = (type) => {
  serviceMode = type;
  document.getElementById('service-selector').style.display = 'none';

  /* Show customer view via classList */
  const cv = document.getElementById('customer-view');
  cv.classList.add('visible');

  document.getElementById('service-badge').innerText =
    type === 'Dine-In' ? `TABLE ${tableId}` : type.toUpperCase();
  document.getElementById('cart-service-info').innerText =
    type === 'Dine-In' ? `Dine-In · Table ${tableId}` : type;
  document.getElementById('call-waiter-btn').style.display = type === 'Dine-In' ? 'flex' : 'none';
  buildCategoryStrip();
  renderMenu(getMenu());
};

/* ─── CATEGORY STRIP ─── */
function buildCategoryStrip() {
  const menu = getMenu();
  const cats = ['All', ...new Set(menu.map(m => m.cat).filter(Boolean))];
  const strip = document.getElementById('cat-strip');
  strip.innerHTML = cats.map(c => `
    <button class="cat-pill${c === activeCategory ? ' active' : ''}"
            onclick="filterByCategory('${c}')">${c}</button>
  `).join('');
}
window.filterByCategory = (cat) => {
  activeCategory = cat;
  buildCategoryStrip();
  applyFilters();
};

/* ─── RENDER MENU ─── */
function renderMenu(items) {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  if (!items || !items.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:30px;">No items found.</p>';
    return;
  }
  grid.innerHTML = items.map(m => `
    <div class="menu-card" onclick="openItemModal(${m.id})">
      <div class="menu-card-img-wrap">
        <img src="${m.img}" alt="${m.name}"
             onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'">
        ${m.id === 1 ? '<span class="menu-card-badge">CHEF\'S PICK</span>' : ''}
      </div>
      <div class="card-body">
        <div class="food-cat">${m.cat || ''}</div>
        <div class="food-name">${m.name}</div>
        <div class="card-footer">
          <span class="food-price">₹${m.price}</span>
          <button class="add-btn" onclick="event.stopPropagation();addToCart(${m.id})">+ ADD</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.applyFilters = () => {
  const q = (document.getElementById('filter-input')?.value || '').toLowerCase();
  const clear = document.getElementById('search-clear-btn');
  if (clear) clear.style.display = q ? 'block' : 'none';
  let items = getMenu();
  if (activeCategory !== 'All') items = items.filter(m => m.cat === activeCategory);
  if (q) items = items.filter(m => m.name.toLowerCase().includes(q));
  renderMenu(items);
};

window.clearSearch = () => {
  document.getElementById('filter-input').value = '';
  document.getElementById('search-clear-btn').style.display = 'none';
  applyFilters();
};

/* ─── ITEM DETAIL MODAL ─── */
window.openItemModal = (id) => {
  const item = getMenu().find(x => x.id === id);
  if (!item) return;
  currentItemModal = item;
  document.getElementById('item-modal-img').src   = item.img;
  document.getElementById('item-modal-name').innerText  = item.name;
  document.getElementById('item-modal-price').innerText = `₹${item.price}`;
  document.getElementById('item-modal-desc').innerText  = item.desc || `A delicious ${item.name} crafted with fresh ingredients.`;
  document.getElementById('item-modal').style.display   = 'flex';
};
window.closeItemModal = () => { document.getElementById('item-modal').style.display = 'none'; };
window.addFromModal   = () => {
  if (currentItemModal) { addToCart(currentItemModal.id); closeItemModal(); }
};

/* ─── CART ─── */
window.toggleCart = () => {
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  const isOpen  = drawer.classList.contains('open');
  drawer.classList.toggle('open');
  overlay.classList.toggle('visible', !isOpen);
};

window.addToCart = (id) => {
  const item = getMenu().find(x => x.id === id);
  if (!item) return;
  cart.push(item);
  refreshCartUI();
  /* brief flash on cart button */
  const btn = document.querySelector('.cart-btn');
  btn.style.background = 'var(--gold)';
  btn.style.color = '#000';
  setTimeout(() => { btn.style.background = ''; btn.style.color = ''; }, 300);
};

window.removeFromCart = (idx) => {
  cart.splice(idx, 1);
  refreshCartUI();
};

function refreshCartUI() {
  const countEl = document.getElementById('cart-count');
  countEl.innerText = cart.length;
  countEl.style.display = cart.length ? 'flex' : 'none';

  const subtotal = cart.reduce((a, b) => a + b.price, 0);
  const tax      = Math.round(subtotal * 0.05);
  const total    = subtotal + tax;

  document.getElementById('cart-subtotal').innerText = `₹${subtotal}`;
  document.getElementById('cart-tax').innerText      = `₹${tax}`;
  document.getElementById('cart-total').innerText    = `₹${total}`;

  const html = cart.length
    ? cart.map((item, idx) => `
        <div class="cart-row">
          <img class="cart-row-img" src="${item.img}" alt="${item.name}"
               onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'">
          <div class="cart-row-info">
            <div class="cart-row-name">${item.name}</div>
            <div class="cart-row-price">₹${item.price}</div>
          </div>
          <button class="remove-btn" onclick="removeFromCart(${idx})">×</button>
        </div>`)
      .join('')
    : '<p class="empty-cart">Your cart is empty.<br>Add items from the menu.</p>';

  document.getElementById('cart-items').innerHTML = html;
}

window.callWaiter = () => showAlert('WAITER CALLED 🛎️', `A staff member is on the way to Table ${tableId}.`, '🛎️');

/* ─── CHECKOUT ─── */
window.showCheckout = () => {
  if (!cart.length) return showAlert('CART EMPTY', 'Please add items before checking out.', '🛒');
  const subtotal = cart.reduce((a, b) => a + b.price, 0);
  const tax      = Math.round(subtotal * 0.05);
  const total    = subtotal + tax;
  document.getElementById('bill-details').innerHTML = `
    <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:12px;">
      ${serviceMode}${serviceMode === 'Dine-In' ? ' · Table ' + tableId : ''}
    </p>
    <div style="border-top:1px solid var(--gold-border);padding-top:12px;margin-bottom:12px;">
      ${cart.map(i => `<div class="bill-item"><span>${i.name}</span><span>₹${i.price}</span></div>`).join('')}
    </div>
    <div class="bill-item" style="color:var(--text-muted)"><span>GST (5%)</span><span>₹${tax}</span></div>
    <div class="bill-item" style="color:var(--gold);font-weight:600;font-size:1rem;border-top:1px solid var(--gold-border);padding-top:10px;margin-top:6px;">
      <span>TOTAL</span><span>₹${total}</span>
    </div>`;
  toggleCart();
  document.getElementById('checkout-modal').style.display = 'flex';
};
window.closeCheckout = () => {
  document.getElementById('checkout-modal').style.display = 'none';
};

window.processPayment = (method) => {
  const subtotal = cart.reduce((a, b) => a + b.price, 0);
  const tax      = Math.round(subtotal * 0.05);
  const total    = subtotal + tax;
  const orderId  = 'ORD-' + Date.now().toString(36).toUpperCase();
  const time     = new Date().toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });

  /* ── Save order to localStorage so admin can see it ── */
  const orders = LS.getOrders();
  orders.unshift({
    id: orderId,
    service: serviceMode,
    table: tableId,
    items: cart.map(i => ({ name: i.name, price: i.price })),
    subtotal, tax, total, method, time,
    status: 'new'
  });
  LS.setOrders(orders);

  cart = [];
  refreshCartUI();
  document.getElementById('checkout-modal').style.display = 'none';
  showAlert('ORDER CONFIRMED! 🎉', `Order ${orderId} placed via ${method}. Total: ₹${total}`, '🎉');

  /* refresh admin views if open */
  renderAdminOrders();
  renderAdminStats();
};

/* ─── FEEDBACK ─── */
window.openFeedback = () => {
  selectedRating = 0; selectedCategory = '';
  document.getElementById('fb-name').value = '';
  document.getElementById('fb-comment').value = '';
  document.getElementById('rating-label').innerText = '';
  document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('selected'));
  document.getElementById('feedback-modal').style.display = 'flex';
};
window.closeFeedback = () => { document.getElementById('feedback-modal').style.display = 'none'; };

window.setRating = (val) => {
  selectedRating = val;
  const labels = ['','Poor 😞','Fair 😐','Good 🙂','Great 😄','Excellent 🤩'];
  document.getElementById('rating-label').innerText = labels[val];
  document.querySelectorAll('.star').forEach(s =>
    s.classList.toggle('active', parseInt(s.dataset.val) <= val));
};
window.selectCat = (el, cat) => {
  selectedCategory = cat;
  document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
};

window.submitFeedback = () => {
  if (!selectedRating)   return showAlert('RATING MISSING',   'Please give a star rating.', '⭐');
  if (!selectedCategory) return showAlert('CATEGORY MISSING', 'Please pick a category.',    '🏷️');
  const comment = document.getElementById('fb-comment').value.trim();
  if (!comment) return showAlert('COMMENT MISSING', 'Please write a short comment.', '✍️');

  const name = document.getElementById('fb-name').value.trim() || 'Anonymous Guest';
  const time = new Date().toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });

  /* ── Write directly to localStorage ── */
  const feedbacks = LS.getFeedbacks();
  feedbacks.unshift({ rating: selectedRating, category: selectedCategory, name, comment, time });
  LS.setFeedbacks(feedbacks);

  /* refresh admin panel if open */
  renderAdminFeedbacks();
  updateFeedbackBadge();

  closeFeedback();
  showAlert('THANK YOU! 🙏', `Feedback received, ${name.split(' ')[0]}! We appreciate it.`, '🙏');
};

/* ─── ADMIN LOGIN ─── */
window.handleOwnerLogin = () => {
  if (document.getElementById('owner-pass').value === '123') {
    /* Hide the login overlay */
    document.getElementById('owner-login').style.display = 'none';

    /* Show the dashboard using classList — CSS handles display:flex */
    document.getElementById('owner-dashboard').classList.add('visible');

    renderAdminList();
    renderAdminFeedbacks();
    renderAdminOrders();
    renderAdminStats();
    updateFeedbackBadge();
    updateOrderBadge();
  } else {
    showAlert('ACCESS DENIED', 'Incorrect PIN. Please try again.', '🔒');
  }
};

/* ─── ADMIN TABS ─── */
window.showAdminTab = (tab) => {
  ['menu','orders','feedback','stats'].forEach(t => {
    document.getElementById(`tab-${t}`).style.display = t === tab ? 'block' : 'none';
    const btn = document.getElementById(`btn-${t}-tab`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  /* always re-render to pick up latest localStorage data */
  if (tab === 'feedback') { renderAdminFeedbacks(); updateFeedbackBadge(); }
  if (tab === 'orders')   { renderAdminOrders(); updateOrderBadge(); }
  if (tab === 'stats')    renderAdminStats();
};

/* ─── BADGE HELPERS ─── */
function updateFeedbackBadge() {
  const n = LS.getFeedbacks().length;
  const el = document.getElementById('fb-count-badge');
  if (el) el.innerText = n;
}
function updateOrderBadge() {
  const orders = LS.getOrders();
  const newCount = orders.filter(o => o.status === 'new').length;
  const el = document.getElementById('order-badge');
  if (el) { el.innerText = newCount; el.style.display = newCount ? 'inline' : 'none'; }
}

/* ─── ADMIN: ADD ITEM ─── */
window.addNewItem = () => {
  const nameEl  = document.getElementById('new-name');
  const priceEl = document.getElementById('new-price');
  const catEl   = document.getElementById('new-cat');
  const imgEl   = document.getElementById('new-img');
  const name    = nameEl.value.trim();
  const price   = parseInt(priceEl.value);
  const cat     = catEl.value;
  const img     = imgEl.value.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  if (!name)                return showAlert('MISSING NAME',  'Please enter an item name.',  '⚠️');
  if (!price || price <= 0) return showAlert('MISSING PRICE', 'Please enter a valid price.', '⚠️');

  const menu = getMenu();
  const newItem = { id: Date.now(), name, cat, price, img,
    desc: `A delicious ${name.toLowerCase()}, prepared fresh to order.` };
  menu.unshift(newItem);
  LS.setMenu(menu);

  nameEl.value = ''; priceEl.value = ''; imgEl.value = '';
  renderAdminList();
  /* also rebuild category strip if customer view is open */
  buildCategoryStrip();
  applyFilters();
  showAlert('ITEM ADDED ✓', `"${name}" is now live on the menu!`, '✅');
};

/* ─── ADMIN: RENDER MENU LIST ─── */
let adminFilterQuery = '';
window.filterAdminList = () => {
  adminFilterQuery = document.getElementById('admin-search').value.toLowerCase();
  renderAdminList();
};

function renderAdminList() {
  const list = document.getElementById('admin-menu-list');
  if (!list) return;
  const menu    = getMenu();
  const visible = adminFilterQuery
    ? menu.filter(m => m.name.toLowerCase().includes(adminFilterQuery))
    : menu;
  document.getElementById('admin-item-count').innerText = `${visible.length} of ${menu.length} items`;
  list.innerHTML = visible.map(m => `
    <div class="admin-item">
      <img src="${m.img}" alt="${m.name}"
           onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'">
      <div class="admin-item-info">
        <div class="name">${m.name}</div>
        <div class="meta">
          <span class="price">₹${m.price}</span>
          <span class="cat-tag">${m.cat || '—'}</span>
        </div>
      </div>
      <button class="del-btn" onclick="deleteItem(${m.id})">DELETE</button>
    </div>
  `).join('') || '<p class="empty-state">No items match your search.</p>';
}

/* ─── ADMIN: DELETE ITEM ─── */
window.deleteItem = (id) => {
  const menu = getMenu();
  const item = menu.find(m => m.id === id);
  LS.setMenu(menu.filter(m => m.id !== id));
  renderAdminList();
  buildCategoryStrip();
  applyFilters();
  if (item) showAlert('REMOVED', `"${item.name}" has been removed from the menu.`, '🗑️');
};

/* ─── ADMIN: ORDERS ─── */
function renderAdminOrders() {
  const list = document.getElementById('admin-orders-list');
  if (!list) return;
  const orders = LS.getOrders();
  updateOrderBadge();
  if (!orders.length) {
    list.innerHTML = '<p class="empty-state">No orders placed yet.</p>';
    return;
  }
  list.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-card-head">
        <span class="order-id">${o.id}</span>
        <span class="order-status ${o.status === 'new' ? 'status-new' : 'status-done'}">
          ${o.status === 'new' ? 'NEW' : 'DONE'}
        </span>
      </div>
      <div class="order-meta">
        ${o.service}${o.table ? ' · Table ' + o.table : ''} · ${o.method} · ${o.time}
      </div>
      <div class="order-items-list">
        ${o.items.map(i => `${i.name} — ₹${i.price}`).join('<br>')}
      </div>
      <div class="order-total">Total: ₹${o.total} (incl. GST)</div>
      ${o.status === 'new'
        ? `<button class="btn-primary" style="margin-top:10px;padding:8px 18px;font-size:.78rem;display:inline-block;width:auto;"
                   onclick="markOrderDone('${o.id}')">MARK AS DONE</button>`
        : ''}
    </div>
  `).join('');
}
window.markOrderDone = (id) => {
  const orders = LS.getOrders();
  const o = orders.find(x => x.id === id);
  if (o) o.status = 'done';
  LS.setOrders(orders);
  renderAdminOrders();
  renderAdminStats();
};

/* ─── ADMIN: FEEDBACKS ─── */
function renderAdminFeedbacks() {
  const list = document.getElementById('admin-feedback-list');
  if (!list) return;

  /* read fresh from localStorage every time */
  const feedbacks = LS.getFeedbacks();
  updateFeedbackBadge();

  /* stats row */
  const statsRow = document.getElementById('feedback-stats-row');
  if (statsRow) {
    if (feedbacks.length) {
      const avg = (feedbacks.reduce((a, b) => a + b.rating, 0) / feedbacks.length).toFixed(1);
      const dist = [5,4,3,2,1].map(n => feedbacks.filter(f => f.rating === n).length);
      statsRow.innerHTML = `
        <div class="stat-card"><div class="stat-num">${feedbacks.length}</div><div class="stat-label">Total Reviews</div></div>
        <div class="stat-card"><div class="stat-num">${avg} ★</div><div class="stat-label">Average Rating</div></div>
        <div class="stat-card"><div class="stat-num">${dist[0]}</div><div class="stat-label">5-Star Reviews</div></div>`;
    } else {
      statsRow.innerHTML = '';
    }
  }

  if (!feedbacks.length) {
    list.innerHTML = '<p class="empty-state">No customer feedbacks yet. They will appear here once submitted.</p>';
    return;
  }
  const star = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  list.innerHTML =
    `<p class="empty-state" style="margin-bottom:16px;">${feedbacks.length} feedback${feedbacks.length > 1 ? 's' : ''} received</p>` +
    feedbacks.map(f => `
      <div class="fb-card">
        <div class="fb-card-head">
          <span class="fb-stars">${star(f.rating)}</span>
          <span class="fb-cat">${f.category}</span>
        </div>
        <p class="fb-comment">"${f.comment}"</p>
        <p class="fb-meta">— ${f.name} &nbsp;·&nbsp; ${f.time}</p>
      </div>
    `).join('');
}

/* ─── ADMIN: STATS ─── */
function renderAdminStats() {
  const el = document.getElementById('stats-content');
  if (!el) return;
  const orders    = LS.getOrders();
  const feedbacks = LS.getFeedbacks();
  const revenue   = orders.reduce((a, b) => a + b.total, 0);
  const avg       = feedbacks.length
    ? (feedbacks.reduce((a, b) => a + b.rating, 0) / feedbacks.length).toFixed(1)
    : '—';
  const menu = getMenu();

  /* payment breakdown */
  const payMethods = {};
  orders.forEach(o => { payMethods[o.method] = (payMethods[o.method] || 0) + 1; });

  /* top categories ordered */
  const catSales = {};
  orders.forEach(o => o.items.forEach(i => {
    const found = menu.find(m => m.name === i.name);
    if (found) catSales[found.cat] = (catSales[found.cat] || 0) + 1;
  }));
  const topCat = Object.entries(catSales).sort((a,b) => b[1]-a[1])[0];

  el.innerHTML = `
    <div class="analytics-grid">
      <div class="analytics-card">
        <h4>Total Revenue</h4>
        <div class="analytics-num">₹${revenue.toLocaleString('en-IN')}</div>
        <div class="analytics-sub">${orders.length} orders total</div>
      </div>
      <div class="analytics-card">
        <h4>Avg. Rating</h4>
        <div class="analytics-num">${avg}</div>
        <div class="analytics-sub">${feedbacks.length} reviews</div>
      </div>
      <div class="analytics-card">
        <h4>Menu Items</h4>
        <div class="analytics-num">${menu.length}</div>
        <div class="analytics-sub">Active listings</div>
      </div>
      <div class="analytics-card">
        <h4>Top Category</h4>
        <div class="analytics-num" style="font-size:1.8rem;">${topCat ? topCat[0] : '—'}</div>
        <div class="analytics-sub">${topCat ? topCat[1] + ' orders' : 'No orders yet'}</div>
      </div>
    </div>
    <div class="analytics-grid" style="margin-top:0;">
      <div class="analytics-card">
        <h4>Payment Methods</h4>
        ${Object.entries(payMethods).length
          ? Object.entries(payMethods).map(([k,v]) =>
              `<div style="display:flex;justify-content:space-between;font-size:.85rem;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);">
                <span style="color:var(--text-soft);">${k}</span>
                <span style="color:var(--gold);">${v} orders</span>
              </div>`).join('')
          : '<p class="empty-state" style="margin:0;">No orders yet.</p>'}
      </div>
      <div class="analytics-card">
        <h4>Service Split</h4>
        ${orders.length
          ? ['Dine-In','Parcel','Home Delivery'].map(s => {
              const cnt = orders.filter(o => o.service === s).length;
              return cnt ? `<div style="display:flex;justify-content:space-between;font-size:.85rem;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);">
                <span style="color:var(--text-soft);">${s}</span>
                <span style="color:var(--gold);">${cnt}</span>
              </div>` : '';
            }).join('')
          : '<p class="empty-state" style="margin:0;">No orders yet.</p>'}
      </div>
    </div>`;
}