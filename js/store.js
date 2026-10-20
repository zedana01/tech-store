/**
 * Techno Nova Store - Core Frontend Logic
 */

let storeData = null;
let cart = JSON.parse(localStorage.getItem('techno_cart') || '[]');
let currentCategory = 'all';
let searchQuery = '';

// Load initial store data
async function initStore() {
  try {
    const res = await fetch('data/products.json?v=' + Date.now());
    const freshData = await res.json();
    
    const localOverride = localStorage.getItem('techno_store_data');
    if (localOverride) {
      const parsed = JSON.parse(localOverride);
      // Auto-migrate any broken/old image links to fresh local images
      if (parsed.products && Array.isArray(parsed.products)) {
        parsed.products.forEach(p => {
          const fresh = freshData.products.find(fp => fp.id === p.id);
          if (fresh && (!p.image || p.image.includes('unsplash') || p.image.includes('photo-1622445262464'))) {
            p.image = fresh.image;
          }
        });
      }
      storeData = parsed;
      localStorage.setItem('techno_store_data', JSON.stringify(storeData));
    } else {
      storeData = freshData;
    }
  } catch (e) {
    console.error('Failed to load store data:', e);
  }

  updateHeaderAndHero();
  renderCategoryTabs();
  renderProducts();
  updateCartUI();
  setupEventListeners();
}

function updateHeaderAndHero() {
  if (!storeData || !storeData.settings) return;
  const s = storeData.settings;
  
  const storeNameEls = document.querySelectorAll('.store-name-text');
  storeNameEls.forEach(el => el.textContent = s.storeName);

  const phoneEls = document.querySelectorAll('.store-phone-text');
  phoneEls.forEach(el => {
    el.textContent = s.phone;
    if (el.tagName === 'A') el.href = `tel:${s.phone}`;
  });

  const whatsappLinks = document.querySelectorAll('.store-whatsapp-link');
  whatsappLinks.forEach(el => el.href = `https://wa.me/${s.whatsapp}`);

  const heroTitle = document.getElementById('heroTitle');
  if (heroTitle && s.heroTitle) heroTitle.innerHTML = s.heroTitle;

  const heroSubtitle = document.getElementById('heroSubtitle');
  if (heroSubtitle && s.heroSubtitle) heroSubtitle.textContent = s.heroSubtitle;

  const heroBadge = document.getElementById('heroBadge');
  if (heroBadge && s.heroBadge) heroBadge.textContent = s.heroBadge;
}

function renderCategoryTabs() {
  const container = document.getElementById('categoryTabs');
  if (!container || !storeData.categories) return;

  container.innerHTML = storeData.categories.map(cat => `
    <button class="cat-btn ${cat.id === currentCategory ? 'active' : ''}" onclick="selectCategory('${cat.id}')">
      <i class="fas ${cat.icon || 'fa-tag'}"></i>
      ${cat.name}
    </button>
  `).join('');
}

function selectCategory(catId) {
  currentCategory = catId;
  renderCategoryTabs();
  renderProducts();
}

function renderProducts() {
  const container = document.getElementById('productsGrid');
  if (!container || !storeData.products) return;

  let filtered = storeData.products;

  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: #64748b;">
        <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px; color: #cbd5e1;"></i>
        <h3>لا توجد منتجات مطابقة لهذا القسم حالياً</h3>
        <p>يرجى اختيار قسم آخر أو تجربة كلمات بحث مختلفة</p>
      </div>
    `;
    return;
  }

  const currency = storeData.settings.currency || 'ر.س';

  container.innerHTML = filtered.map(prod => `
    <div class="product-card" data-id="${prod.id}">
      <div class="product-thumb">
        <span class="product-badge ${prod.oldPrice ? 'sale' : ''}">${prod.badge || 'جديد'}</span>
        <img src="${prod.image}" alt="${prod.name}" loading="lazy">
        <button class="quick-view-btn" onclick="openQuickView(${prod.id})">
          <i class="fas fa-eye"></i> نظرة سريعة
        </button>
      </div>
      <div class="product-body">
        <div class="product-category">${prod.categoryName || 'إلكترونيات ذكية'}</div>
        <h3 class="product-title">${prod.name}</h3>
        <div class="product-rating">
          ${renderStars(prod.rating || 5)}
          <span>(${prod.reviewsCount || 50}+ تقييم)</span>
        </div>
        <div class="product-footer">
          <div class="product-price">
            <span class="current-price">${prod.price} ${currency}</span>
            ${prod.oldPrice ? `<span class="old-price">${prod.oldPrice} ${currency}</span>` : ''}
          </div>
          <button class="add-to-cart-btn" onclick="addToCart(${prod.id})" title="أضف إلى السلة">
            <i class="fas fa-cart-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderStars(rating) {
  let stars = '';
  const fullStars = Math.floor(rating);
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars += '<i class="fas fa-star"></i>';
    } else {
      stars += '<i class="far fa-star"></i>';
    }
  }
  return stars;
}

// Cart Functionality
function addToCart(productId) {
  const prod = storeData.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      image: prod.image,
      qty: 1
    });
  }

  saveCart();
  updateCartUI();
  showToast(`تمت إضافة "${prod.name}" إلى السلة`);
  openCartDrawer();
}

function updateCartQty(productId, delta) {
  const item = cart.find(item => item.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(p => p.id !== productId);
  }

  saveCart();
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(p => p.id !== productId);
  saveCart();
  updateCartUI();
  showToast('تم حذف المنتج من السلة');
}

function saveCart() {
  localStorage.setItem('techno_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(b => b.textContent = totalCount);

  const cartList = document.getElementById('cartItemsList');
  const cartTotalEl = document.getElementById('cartTotalPrice');
  if (!cartList) return;

  const currency = (storeData && storeData.settings && storeData.settings.currency) || 'ر.س';

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div class="cart-empty-state">
        <i class="fas fa-shopping-bag"></i>
        <h4>سلة مشترياتك فارغة</h4>
        <p>تصفح أحدث الأجهزة والعروض واختر ما يناسبك</p>
      </div>
    `;
    if (cartTotalEl) cartTotalEl.textContent = `0 ${currency}`;
    return;
  }

  let totalAmount = 0;
  cartList.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    totalAmount += itemTotal;
    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.name}</h4>
          <div class="cart-item-price">${item.price} ${currency}</div>
          <div class="cart-qty-ctrl">
            <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="cart-remove-item" onclick="removeFromCart(${item.id})" title="حذف">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
  }).join('');

  if (cartTotalEl) cartTotalEl.textContent = `${totalAmount} ${currency}`;
}

function openCartDrawer() {
  document.getElementById('cartDrawer').classList.add('active');
  document.getElementById('cartOverlay').classList.add('active');
}

function closeCartDrawer() {
  document.getElementById('cartDrawer').classList.remove('active');
  document.getElementById('cartOverlay').classList.remove('active');
}

// Quick View Modal
function openQuickView(productId) {
  const prod = storeData.products.find(p => p.id === productId);
  if (!prod) return;

  const currency = storeData.settings.currency || 'ر.س';
  const modalBody = document.getElementById('quickViewBody');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <div class="modal-content-grid">
      <div class="modal-img-wrap">
        <img src="${prod.image}" alt="${prod.name}">
      </div>
      <div class="modal-details">
        <span class="product-badge ${prod.oldPrice ? 'sale' : ''}">${prod.badge || 'متاح فوراً'}</span>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin: 12px 0 8px;">${prod.name}</h2>
        <div class="product-rating" style="margin-bottom: 12px;">
          ${renderStars(prod.rating || 5)}
          <span>(${prod.reviewsCount || 50}+ تقييم)</span>
        </div>
        <div class="product-price" style="margin-bottom: 15px;">
          <span class="current-price" style="font-size: 1.6rem;">${prod.price} ${currency}</span>
          ${prod.oldPrice ? `<span class="old-price">${prod.oldPrice} ${currency}</span>` : ''}
        </div>
        <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 15px;">
          ${prod.description || ''}
        </p>
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px;">المواصفات والخصائص:</h4>
        <ul class="modal-specs-list">
          ${(prod.specs || []).map(s => `<li><i class="fas fa-check-circle"></i> ${s}</li>`).join('')}
        </ul>
        <div style="display: flex; gap: 12px; margin-top: 25px;">
          <button class="btn-primary" style="flex: 1;" onclick="addToCart(${prod.id}); closeModal();">
            <i class="fas fa-cart-plus"></i> أضف إلى السلة
          </button>
          <button class="btn-whatsapp-checkout" style="flex: 1;" onclick="orderSingleViaWhatsApp(${prod.id})">
            <i class="fab fa-whatsapp"></i> طلب مباشر
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('quickViewModal').classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('quickViewModal');
  if (modal) modal.classList.remove('active');
  const checkoutModal = document.getElementById('checkoutModal');
  if (checkoutModal) checkoutModal.classList.remove('active');
}

// Checkout & WhatsApp Ordering
function initiateWhatsAppCheckout() {
  if (cart.length === 0) {
    showToast('سلتك فارغة حالياً!');
    return;
  }
  closeCartDrawer();
  document.getElementById('checkoutModal').classList.add('active');
}

function completeWhatsAppOrder(event) {
  event.preventDefault();

  const name = document.getElementById('orderName').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  const city = document.getElementById('orderCity').value.trim();
  const address = document.getElementById('orderAddress').value.trim();
  const notes = document.getElementById('orderNotes').value.trim();

  if (!name || !phone || !city) {
    alert('يرجى ملء كافة الحقول الأساسية (الاسم، الهاتف، المدينة)');
    return;
  }

  const currency = (storeData && storeData.settings && storeData.settings.currency) || 'ر.س';
  let total = 0;
  let itemsText = '';

  cart.forEach((item, index) => {
    const itemSub = item.price * item.qty;
    total += itemSub;
    itemsText += `\n${index + 1}) *${item.name}*\n   الكمية: ${item.qty} × ${item.price} = ${itemSub} ${currency}`;
  });

  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toLocaleString('ar-EG');

  // Save order to history
  const newOrder = {
    id: orderId,
    customerName: name,
    customerPhone: phone,
    city: city,
    address: address,
    notes: notes,
    items: [...cart],
    total: total,
    currency: currency,
    date: now,
    status: 'جديد'
  };

  const existingOrders = JSON.parse(localStorage.getItem('techno_orders') || '[]');
  existingOrders.unshift(newOrder);
  localStorage.setItem('techno_orders', JSON.stringify(existingOrders));

  // WhatsApp Message
  const whatsappNumber = (storeData && storeData.settings && storeData.settings.whatsapp) || '201027093535';
  
  let msg = `*طلب شراء جديد من متجر تكنو نوفا* 🛍️\n`;
  msg += `*رقم الطلب:* ${orderId}\n`;
  msg += `*التاريخ:* ${now}\n`;
  msg += `--------------------------------\n`;
  msg += `*المنتجات المطلوبة:*${itemsText}\n`;
  msg += `--------------------------------\n`;
  msg += `💰 *الإجمالي الكلي:* *${total} ${currency}*\n\n`;
  msg += `👤 *بيانات العميل:* \n`;
  msg += `• *الاسم:* ${name}\n`;
  msg += `• *الهاتف:* ${phone}\n`;
  msg += `• *المدينة:* ${city}\n`;
  if (address) msg += `• *العنوان:* ${address}\n`;
  if (notes) msg += `• *ملاحظات إضافية:* ${notes}\n\n`;
  msg += `_أرجو تأكيد توفر الطلب والبدء في الشحن._`;

  const encodedMsg = encodeURIComponent(msg);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMsg}`;

  // Clear cart & close
  cart = [];
  saveCart();
  updateCartUI();
  closeModal();

  showToast('تم تسجيل طلبك بنجاح! جاري تحويلك للواتساب...');
  setTimeout(() => {
    window.open(whatsappUrl, '_blank');
  }, 1000);
}

function orderSingleViaWhatsApp(productId) {
  const prod = storeData.products.find(p => p.id === productId);
  if (!prod) return;

  const currency = storeData.settings.currency || 'ر.س';
  const whatsappNumber = (storeData && storeData.settings && storeData.settings.whatsapp) || '201027093535';

  let msg = `*استفسار وطلب منتج من متجر تكنو نوفا* ⚡\n\n`;
  msg += `*المنتج:* ${prod.name}\n`;
  msg += `*السعر:* ${prod.price} ${currency}\n`;
  msg += `*رابط الصورة:* ${prod.image}\n\n`;
  msg += `أود الاستفسار عن توفر المنتج وتأكيد طلب شرائه.`;

  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
}

function showToast(text) {
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> ${text}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = '0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function setupEventListeners() {
  const searchInput = document.getElementById('storeSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderProducts();
    });
  }

  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
}

document.addEventListener('DOMContentLoaded', initStore);
