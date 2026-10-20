/**
 * Techno Nova - Comprehensive Admin Dashboard Engine
 * Version 3.0
 */

let storeData = null;

// File Upload to Base64 Helper
function handleFileToInput(fileInput, targetInputId, previewImgId) {
  if (!fileInput.files || !fileInput.files[0]) return;
  const file = fileInput.files[0];
  
  if (file.size > 2 * 1024 * 1024) {
    alert('تنبيه: حجم الصورة كبير نسبياً (أكثر من 2 ميجابايت). يُفضل اختيار صورة محسنة للويب.');
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    document.getElementById(targetInputId).value = base64;
    if (previewImgId) {
      document.getElementById(previewImgId).src = base64;
    }
  };
  reader.readAsDataURL(file);
}

// 1. DATA INITIALIZATION & LOADING
async function loadStoreData() {
  const local = localStorage.getItem('techno_store_data');
  if (local) {
    try {
      storeData = JSON.parse(local);
    } catch (e) {
      console.error('Error parsing local storage:', e);
    }
  }

  if (!storeData) {
    try {
      const res = await fetch('../data/products.json?v=' + Date.now());
      storeData = await res.json();
    } catch (e) {
      console.error('Error fetching products.json:', e);
    }
  }

  if (!storeData) {
    storeData = { settings: {}, pages: {}, categories: [], products: [] };
  }
}

// 2. AUTHENTICATION CONTROLLER
function checkAuth() {
  const authed = sessionStorage.getItem('techno_admin_authed');
  const authScreen = document.getElementById('authScreen');
  if (authed === 'true') {
    authScreen.style.display = 'none';
    initAdminUI();
  } else {
    authScreen.style.display = 'flex';
  }
}

function handleAuth(e) {
  e.preventDefault();
  const pin = document.getElementById('pinInput').value.trim();
  const validPin = (storeData && storeData.settings && storeData.settings.adminPin) ? storeData.settings.adminPin : '1234';
  
  if (pin === validPin) {
    sessionStorage.setItem('techno_admin_authed', 'true');
    document.getElementById('authScreen').style.display = 'none';
    initAdminUI();
  } else {
    const err = document.getElementById('authError');
    err.style.display = 'block';
    document.getElementById('pinInput').value = '';
    setTimeout(() => { err.style.display = 'none'; }, 4000);
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('techno_admin_authed');
  window.location.reload();
}

// 3. UI INITIALIZATION & TAB SWITCHING
function initAdminUI() {
  populateProductsCategoryFilter();
  renderProductsTable();
  renderCategoriesGrid();
  populateAllCMSForms();
  populateSettingsForm();
  renderOrdersTable();
}

function switchMainTab(tabId, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.sidebar-menu .menu-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const titles = {
    'productsTab': 'إدارة الأجهزة والمنتجات',
    'categoriesTab': 'الأقسام والبانرات العريضة',
    'cmsTab': 'إدارة وتخصيص محتوى الصفحات',
    'ordersTab': 'سجل طلبات الواتساب الواردة',
    'settingsTab': 'إعدادات المتجر وهوية البراند',
    'backupTab': 'النسخ الاحتياطي واستعادة البيانات'
  };
  document.getElementById('currentSectionTitle').textContent = titles[tabId] || 'لوحة التحكم';
}

function switchCmsSubTab(subTabId, btn) {
  document.querySelectorAll('.cms-subpane').forEach(p => p.style.display = 'none');
  const target = document.getElementById(subTabId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.cms-tabs-bar .cms-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// 4. PRODUCTS MANAGEMENT (CRUD)
function populateProductsCategoryFilter() {
  const selFilter = document.getElementById('prodCategoryFilter');
  const selModal = document.getElementById('prodCategorySelect');
  const cats = storeData.categories || [];

  if (selFilter) {
    selFilter.innerHTML = '<option value="all">كافة الأقسام</option>' + cats.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  if (selModal) {
    selModal.innerHTML = cats.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}

function renderProductsTable(filterTerm = '', filterCat = 'all') {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  let prods = storeData.products || [];
  if (filterCat && filterCat !== 'all') {
    prods = prods.filter(p => p.category === filterCat);
  }
  if (filterTerm) {
    const term = filterTerm.toLowerCase().trim();
    prods = prods.filter(p => (p.name || '').toLowerCase().includes(term) || (p.categoryName || '').toLowerCase().includes(term));
  }

  if (prods.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 15px;">لا توجد أجهزة مطابقة للبحث أو القسم المحدد.</td></tr>`;
    return;
  }

  tbody.innerHTML = prods.map(p => {
    const specsText = (p.specs || []).join(' • ');
    return `
      <tr>
        <td>
          <img src="${p.image || '../images/prod_smart_watch.jpg'}" style="width: 54px; height: 54px; object-fit: contain; border-radius: 10px; border: 1px solid var(--border); padding: 2px;" onerror="this.onerror=null; this.src='../images/prod_smart_watch.jpg';">
        </td>
        <td>
          <div style="font-weight: 800; color: var(--text-main); font-size: 15px;">${p.name}</div>
          <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">${specsText}</div>
        </td>
        <td><span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 700;">${p.categoryName || p.category}</span></td>
        <td style="font-weight: 800; color: var(--primary);">${p.price} ر.س</td>
        <td style="color: var(--text-muted); text-decoration: line-through;">${p.oldPrice ? p.oldPrice + ' ر.س' : '-'}</td>
        <td><span style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;">${p.badge || '-'}</span></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button onclick="editProduct(${p.id})" class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px;" title="تعديل"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteProduct(${p.id})" class="btn btn-danger" style="padding: 6px 12px; font-size: 13px;" title="حذف"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminProducts() {
  const term = document.getElementById('prodSearchInput').value;
  const cat = document.getElementById('prodCategoryFilter').value;
  renderProductsTable(term, cat);
}

function openAddProductModal() {
  document.getElementById('productModalTitle').textContent = 'إضافة جهاز جديد';
  document.getElementById('prodEditId').value = '';
  document.getElementById('prodName').value = '';
  document.getElementById('prodBadge').value = 'جديد 2026';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodOldPrice').value = '';
  document.getElementById('prodSpecs').value = '';
  document.getElementById('prodImage').value = 'images/prod_smart_watch.jpg';
  document.getElementById('prodModalImgPreview').src = '../images/prod_smart_watch.jpg';
  document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
}

function editProduct(id) {
  const p = (storeData.products || []).find(x => x.id === id);
  if (!p) return;

  document.getElementById('productModalTitle').textContent = 'تعديل بيانات الجهاز: ' + p.name;
  document.getElementById('prodEditId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodCategorySelect').value = p.category;
  document.getElementById('prodBadge').value = p.badge || '';
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodOldPrice').value = p.oldPrice || '';
  document.getElementById('prodSpecs').value = (p.specs || []).join(', ');
  document.getElementById('prodImage').value = p.image || '';
  document.getElementById('prodModalImgPreview').src = p.image ? (p.image.startsWith('http') || p.image.startsWith('data:') ? p.image : '../' + p.image) : '../images/prod_smart_watch.jpg';
  document.getElementById('productModal').classList.add('active');
}

function handleProductSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('prodEditId').value;
  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategorySelect').value;
  const badge = document.getElementById('prodBadge').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const oldPrice = parseFloat(document.getElementById('prodOldPrice').value) || null;
  const specsRaw = document.getElementById('prodSpecs').value;
  const specs = specsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const image = document.getElementById('prodImage').value.trim() || 'images/prod_smart_watch.jpg';

  // Find category Name
  const catObj = (storeData.categories || []).find(c => c.id === category);
  const categoryName = catObj ? catObj.name : category;

  if (editId) {
    const id = parseInt(editId);
    const idx = (storeData.products || []).findIndex(x => x.id === id);
    if (idx !== -1) {
      storeData.products[idx] = {
        ...storeData.products[idx],
        name, category, categoryName, badge, price, oldPrice, specs, image
      };
    }
    showAdminToast('تم تحديث بيانات الجهاز بنجاح! 🎉');
  } else {
    const newId = storeData.products && storeData.products.length > 0 ? Math.max(...storeData.products.map(x => x.id)) + 1 : 1;
    const newProd = {
      id: newId,
      name, category, categoryName, badge, price, oldPrice, specs, image,
      reviewsCount: 40,
      featured: true
    };
    if (!storeData.products) storeData.products = [];
    storeData.products.push(newProd);
    showAdminToast('تمت إضافة الجهاز الجديد بنجاح! 🚀');
  }

  saveStoreState();
  closeProductModal();
  renderProductsTable();
}

function deleteProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الجهاز نهائياً من المتجر؟')) return;
  storeData.products = (storeData.products || []).filter(x => x.id !== id);
  saveStoreState();
  renderProductsTable();
  showAdminToast('تم حذف الجهاز بنجاح.');
}

// 5. CATEGORIES & WIDE BANNERS MANAGEMENT
function renderCategoriesGrid() {
  const container = document.getElementById('categoriesGridContainer');
  if (!container) return;

  const cats = storeData.categories || [];
  container.innerHTML = cats.map(c => {
    const bannerSrc = c.banner ? (c.banner.startsWith('http') || c.banner.startsWith('data:') ? c.banner : '../' + c.banner) : '../images/cat_banner_watches.jpg';
    return `
      <div class="cat-mgmt-card">
        <img src="${bannerSrc}" class="cat-mgmt-banner-preview" alt="${c.name}" onerror="this.onerror=null; this.src='../images/cat_banner_watches.jpg';">
        <div class="cat-mgmt-body">
          <div>
            <div class="cat-mgmt-title">
              <i class="fa-solid ${c.icon || 'fa-folder'}" style="color: var(--primary);"></i>
              <span>${c.name}</span>
              <span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: var(--text-muted); font-weight: 600;">${c.id}</span>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">${c.title || c.name}</div>
            <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 14px;">${c.description || '-'}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="openEditCategoryModal('${c.id}')" class="btn btn-secondary" style="flex: 1; padding: 8px; font-size: 13px;">
              <i class="fa-solid fa-pen-to-square"></i> تعديل القسم والبانر
            </button>
            <a href="../category?cat=${c.id}" target="_blank" class="btn btn-secondary" style="padding: 8px 12px; font-size: 13px;" title="معاينة صفحة القسم">
              <i class="fa-solid fa-eye"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openAddCategoryModal() {
  document.getElementById('categoryModalTitle').textContent = 'إضافة قسم جديد';
  document.getElementById('catEditId').value = '';
  document.getElementById('catName').value = '';
  document.getElementById('catSlug').value = '';
  document.getElementById('catIcon').value = 'fa-tag';
  document.getElementById('catTitle').value = '';
  document.getElementById('catDescription').value = '';
  document.getElementById('catBanner').value = 'images/hero_banner.jpg';
  document.getElementById('catModalBannerPreview').src = '../images/hero_banner.jpg';
  document.getElementById('categoryModal').classList.add('active');
}

function openEditCategoryModal(id) {
  const c = (storeData.categories || []).find(x => x.id === id);
  if (!c) return;

  document.getElementById('categoryModalTitle').textContent = 'تعديل بيانات وبانر: ' + c.name;
  document.getElementById('catEditId').value = c.id;
  document.getElementById('catName').value = c.name;
  document.getElementById('catSlug').value = c.id;
  document.getElementById('catIcon').value = c.icon || 'fa-tag';
  document.getElementById('catTitle').value = c.title || c.name;
  document.getElementById('catDescription').value = c.description || '';
  document.getElementById('catBanner').value = c.banner || '';
  document.getElementById('catModalBannerPreview').src = c.banner ? (c.banner.startsWith('http') || c.banner.startsWith('data:') ? c.banner : '../' + c.banner) : '../images/cat_banner_watches.jpg';
  document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('active');
}

function handleCategorySubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('catEditId').value;
  const name = document.getElementById('catName').value.trim();
  const slug = document.getElementById('catSlug').value.trim().toLowerCase();
  const icon = document.getElementById('catIcon').value.trim() || 'fa-tag';
  const title = document.getElementById('catTitle').value.trim();
  const description = document.getElementById('catDescription').value.trim();
  const banner = document.getElementById('catBanner').value.trim() || 'images/cat_banner_watches.jpg';

  if (!storeData.categories) storeData.categories = [];

  if (editId) {
    const idx = storeData.categories.findIndex(x => x.id === editId);
    if (idx !== -1) {
      storeData.categories[idx] = {
        id: slug,
        name, icon, banner, title, description
      };
    }
    showAdminToast('تم حفظ تعديل القسم والبانر العريض بنجاح! 📸');
  } else {
    storeData.categories.push({
      id: slug,
      name, icon, banner, title, description
    });
    showAdminToast('تمت إضافة القسم الجديد بنجاح! ✨');
  }

  saveStoreState();
  closeCategoryModal();
  renderCategoriesGrid();
  populateProductsCategoryFilter();
}

// 6. CMS PAGES CONTROLLER
function populateAllCMSForms() {
  const p = storeData.pages || {};
  const home = p.home || {};
  const prodPage = p.productPage || {};
  const about = p.about || {};
  const contact = p.contact || {};

  // Home Page
  document.getElementById('cmsHeroTitle').value = home.heroTitle || '';
  document.getElementById('cmsHeroBadge').value = home.heroBadge || '';
  document.getElementById('cmsHeroSubtitle').value = home.heroSubtitle || '';
  document.getElementById('cmsHeroBtnText').value = home.heroBtnText || 'تسوق أحدث الأجهزة الذكية';
  document.getElementById('cmsHeroImage').value = home.heroImage || 'images/hero_banner.jpg';
  if (home.heroImage) {
    document.getElementById('cmsHeroImgPreview').src = home.heroImage.startsWith('http') || home.heroImage.startsWith('data:') ? home.heroImage : '../' + home.heroImage;
  }

  // Trust Features
  const tf = home.trustFeatures || [];
  if (tf[0]) { document.getElementById('cmsTrust1Title').value = tf[0].title || ''; document.getElementById('cmsTrust1Desc').value = tf[0].desc || ''; }
  if (tf[1]) { document.getElementById('cmsTrust2Title').value = tf[1].title || ''; document.getElementById('cmsTrust2Desc').value = tf[1].desc || ''; }
  if (tf[2]) { document.getElementById('cmsTrust3Title').value = tf[2].title || ''; document.getElementById('cmsTrust3Desc').value = tf[2].desc || ''; }
  if (tf[3]) { document.getElementById('cmsTrust4Title').value = tf[3].title || ''; document.getElementById('cmsTrust4Desc').value = tf[3].desc || ''; }

  // Spotlight
  const sp = home.spotlight || {};
  document.getElementById('cmsSpotlightTitle').value = sp.title || '';
  document.getElementById('cmsSpotlightBadge').value = sp.badge || '';
  document.getElementById('cmsSpotlightPrice').value = sp.price || '';
  document.getElementById('cmsSpotlightSubtitle').value = sp.subtitle || '';
  document.getElementById('cmsSpotlightImage').value = sp.image || 'images/prod_smart_drone.jpg';
  if (sp.image) {
    document.getElementById('cmsSpotlightImgPreview').src = sp.image.startsWith('http') || sp.image.startsWith('data:') ? sp.image : '../' + sp.image;
  }

  // Product Page
  document.getElementById('cmsProdDelivery').value = prodPage.deliveryBadge || '';
  document.getElementById('cmsProdWarranty').value = prodPage.warrantyBadge || '';
  document.getElementById('cmsProdReturn').value = prodPage.returnBadge || '';
  document.getElementById('cmsProdAuthentic').value = prodPage.authenticityBadge || '';
  document.getElementById('cmsProdWaNote').value = prodPage.whatsappNote || '';

  // About Page
  document.getElementById('cmsAboutTitle').value = about.title || '';
  document.getElementById('cmsAboutSub').value = about.subtitle || '';
  document.getElementById('cmsAboutStory').value = about.story || '';
  document.getElementById('cmsAboutMission').value = about.mission || '';
  document.getElementById('cmsAboutImage').value = about.image || 'images/hero_banner.jpg';
  if (about.image) {
    document.getElementById('cmsAboutImgPreview').src = about.image.startsWith('http') || about.image.startsWith('data:') ? about.image : '../' + about.image;
  }

  // Contact Page
  document.getElementById('cmsContactTitle').value = contact.title || '';
  document.getElementById('cmsContactSub').value = contact.subtitle || '';
  document.getElementById('cmsContactPhone').value = contact.phone || '';
  document.getElementById('cmsContactWhatsapp').value = contact.whatsapp || '';
  document.getElementById('cmsContactEmail').value = contact.email || '';
  document.getElementById('cmsContactAddress').value = contact.address || '';
  document.getElementById('cmsContactHours').value = contact.hours || '';
}

function saveHomeCMS(e) {
  e.preventDefault();
  if (!storeData.pages) storeData.pages = {};
  if (!storeData.pages.home) storeData.pages.home = {};

  const h = storeData.pages.home;
  h.heroTitle = document.getElementById('cmsHeroTitle').value.trim();
  h.heroBadge = document.getElementById('cmsHeroBadge').value.trim();
  h.heroSubtitle = document.getElementById('cmsHeroSubtitle').value.trim();
  h.heroBtnText = document.getElementById('cmsHeroBtnText').value.trim();
  h.heroImage = document.getElementById('cmsHeroImage').value.trim();

  // Trust Features
  h.trustFeatures = [
    { icon: 'fa-truck-fast', title: document.getElementById('cmsTrust1Title').value.trim(), desc: document.getElementById('cmsTrust1Desc').value.trim() },
    { icon: 'fa-shield-halved', title: document.getElementById('cmsTrust2Title').value.trim(), desc: document.getElementById('cmsTrust2Desc').value.trim() },
    { icon: 'fa-headset', title: document.getElementById('cmsTrust3Title').value.trim(), desc: document.getElementById('cmsTrust3Desc').value.trim() },
    { icon: 'fa-credit-card', title: document.getElementById('cmsTrust4Title').value.trim(), desc: document.getElementById('cmsTrust4Desc').value.trim() }
  ];

  // Spotlight
  if (!h.spotlight) h.spotlight = {};
  h.spotlight.title = document.getElementById('cmsSpotlightTitle').value.trim();
  h.spotlight.badge = document.getElementById('cmsSpotlightBadge').value.trim();
  h.spotlight.price = parseFloat(document.getElementById('cmsSpotlightPrice').value) || 1850;
  h.spotlight.subtitle = document.getElementById('cmsSpotlightSubtitle').value.trim();
  h.spotlight.image = document.getElementById('cmsSpotlightImage').value.trim();

  saveStoreState();
  showAdminToast('تم حفظ كافة تعديلات وصور الصفحة الرئيسية بنجاح! 🚀');
}

function saveProductPageCMS(e) {
  e.preventDefault();
  if (!storeData.pages) storeData.pages = {};
  storeData.pages.productPage = {
    deliveryBadge: document.getElementById('cmsProdDelivery').value.trim(),
    warrantyBadge: document.getElementById('cmsProdWarranty').value.trim(),
    returnBadge: document.getElementById('cmsProdReturn').value.trim(),
    authenticityBadge: document.getElementById('cmsProdAuthentic').value.trim(),
    whatsappNote: document.getElementById('cmsProdWaNote').value.trim()
  };

  saveStoreState();
  showAdminToast('تم حفظ إعدادات وسياسات صفحة المنتج بنجاح! 🛡️');
}

function saveAboutCMS(e) {
  e.preventDefault();
  if (!storeData.pages) storeData.pages = {};
  if (!storeData.pages.about) storeData.pages.about = {};

  storeData.pages.about = {
    ...storeData.pages.about,
    title: document.getElementById('cmsAboutTitle').value.trim(),
    subtitle: document.getElementById('cmsAboutSub').value.trim(),
    story: document.getElementById('cmsAboutStory').value.trim(),
    mission: document.getElementById('cmsAboutMission').value.trim(),
    image: document.getElementById('cmsAboutImage').value.trim()
  };

  saveStoreState();
  showAdminToast('تم حفظ محتوى صفحة من نحن بنجاح! 🏢');
}

function saveContactCMS(e) {
  e.preventDefault();
  if (!storeData.pages) storeData.pages = {};
  storeData.pages.contact = {
    title: document.getElementById('cmsContactTitle').value.trim(),
    subtitle: document.getElementById('cmsContactSub').value.trim(),
    phone: document.getElementById('cmsContactPhone').value.trim(),
    whatsapp: document.getElementById('cmsContactWhatsapp').value.trim(),
    email: document.getElementById('cmsContactEmail').value.trim(),
    address: document.getElementById('cmsContactAddress').value.trim(),
    hours: document.getElementById('cmsContactHours').value.trim()
  };

  saveStoreState();
  showAdminToast('تم حفظ بيانات صفحة اتصل بنا بنجاح! 📞');
}

// 7. STORE SETTINGS CONTROLLER
function populateSettingsForm() {
  const s = storeData.settings || {};
  document.getElementById('setStoreName').value = s.storeName || 'تكنو نوفا';
  document.getElementById('setStoreSubtitle').value = s.storeSubtitle || 'TECHNOVA STORE';
  document.getElementById('setWhatsapp').value = s.whatsapp || '01027093535';
  document.getElementById('setPhone').value = s.phone || '800-TECH-NOVA';
  document.getElementById('setCurrency').value = s.currency || 'ر.س';
  document.getElementById('setAdminPin').value = s.adminPin || '1234';
  document.getElementById('setTopbarAnnouncement').value = s.topbarAnnouncement || '';
}

function saveStoreSettings(e) {
  e.preventDefault();
  if (!storeData.settings) storeData.settings = {};

  const waRaw = document.getElementById('setWhatsapp').value.trim();
  let waClean = waRaw.replace(/\D/g, '');
  if (waClean.startsWith('0')) waClean = '2' + waClean;

  storeData.settings = {
    ...storeData.settings,
    storeName: document.getElementById('setStoreName').value.trim(),
    storeSubtitle: document.getElementById('setStoreSubtitle').value.trim(),
    whatsapp: waRaw,
    whatsappFormatted: waClean,
    phone: document.getElementById('setPhone').value.trim(),
    currency: document.getElementById('setCurrency').value.trim(),
    adminPin: document.getElementById('setAdminPin').value.trim(),
    topbarAnnouncement: document.getElementById('setTopbarAnnouncement').value.trim()
  };

  saveStoreState();
  showAdminToast('تم حفظ وتحديث إعدادات المتجر وهوية البراند بنجاح! ⚙️');
}

// 8. ORDERS LOG
function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  const orders = JSON.parse(localStorage.getItem('techno_orders') || '[]');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 15px;">لا توجد طلبات واردة حتى الآن. عندما يضغط العملاء على إتمام الطلب ستظهر تفاصيلها هنا.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="font-weight: 800; color: var(--primary);">${o.orderNum || 'TECH-ORDER'}</td>
      <td style="color: var(--text-muted);">${o.date || 'اليوم'}</td>
      <td style="font-size: 13.5px; line-height: 1.5;">${o.summary || 'أجهزة ذكية'}</td>
      <td style="font-weight: 900; color: var(--success);">${o.total} ر.س</td>
      <td style="text-align: center;">
        <button onclick="alert('تفاصيل الطلب:\\n\\n' + '${(o.fullText || '').replace(/'/g, "\\'")}')" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12.5px;">
          <i class="fa-solid fa-eye"></i> عرض
        </button>
      </td>
    </tr>
  `).join('');
}

function clearOrdersLog() {
  if (!confirm('هل تريد بالتأكيد مسح سجل كافة الطلبات الواردة؟')) return;
  localStorage.removeItem('techno_orders');
  renderOrdersTable();
  showAdminToast('تم مسح سجل الطلبات بنجاح.');
}

// 9. BACKUP & RESTORE
function exportStoreJSON() {
  const jsonStr = JSON.stringify(storeData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `technova_store_backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('تم تحميل ملف النسخة الاحتياطية بنجاح! 💾');
}

function importStoreJSON(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.products || imported.categories || imported.pages) {
        storeData = imported;
        saveStoreState();
        initAdminUI();
        showAdminToast('تم استيراد النسخة الاحتياطية وتطبيقها بنجاح! 🚀');
      } else {
        alert('ملف غير صالح! يجب أن يحتوي الملف على بنية بيانات متجر تكنو نوفا.');
      }
    } catch(err) {
      alert('حدث خطأ في قراءة ملف JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

async function resetToDefaultData() {
  if (!confirm('تحذير: سيتم حذف كافة التعديلات واستعادة النسخة الأصلية للمتجر. هل تريد المتابعة؟')) return;
  try {
    const res = await fetch('../data/products.json?v=' + Date.now());
    storeData = await res.json();
    saveStoreState();
    initAdminUI();
    showAdminToast('تمت استعادة الإعدادات الافتراضية بنجاح! 🔄');
  } catch(e) {
    alert('تعذر استرجاع الملف الافتراضي: ' + e.message);
  }
}

// 10. PERSISTENCE & TOAST
function saveStoreState() {
  localStorage.setItem('techno_store_data', JSON.stringify(storeData));
}

function showAdminToast(msg) {
  const toast = document.getElementById('adminToast');
  const msgEl = document.getElementById('adminToastMsg');
  if (toast && msgEl) {
    msgEl.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
}

// Global Startup
document.addEventListener('DOMContentLoaded', async () => {
  await loadStoreData();
  checkAuth();
});
