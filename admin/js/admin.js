/**
 * Techno Nova - Admin Dashboard Logic
 */

let storeData = null;
let currentUploadedImageBase64 = '';

document.addEventListener('DOMContentLoaded', async () => {
  await loadStoreData();
  checkAuth();
});

async function loadStoreData() {
  const local = localStorage.getItem('techno_store_data');
  if (local) {
    storeData = JSON.parse(local);
  } else {
    try {
      const res = await fetch('../data/products.json');
      storeData = await res.json();
    } catch (e) {
      console.error(e);
    }
  }
}

function checkAuth() {
  const authScreen = document.getElementById('authScreen');
  const authed = sessionStorage.getItem('techno_admin_authed');
  if (authed === 'true') {
    authScreen.style.display = 'none';
    initAdminUI();
  } else {
    authScreen.style.display = 'flex';
  }
}

function handleAuth(e) {
  e.preventDefault();
  const enteredPin = document.getElementById('pinInput').value.trim();
  const validPin = (storeData && storeData.settings && storeData.settings.adminPin) || '1234';

  if (enteredPin === validPin) {
    sessionStorage.setItem('techno_admin_authed', 'true');
    document.getElementById('authScreen').style.display = 'none';
    initAdminUI();
  } else {
    alert('رمز الأمان (PIN) غير صحيح! يرجى المحاولة مرة أخرى.');
    document.getElementById('pinInput').value = '';
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('techno_admin_authed');
  location.reload();
}

function initAdminUI() {
  renderProductsTable();
  renderOrdersTable();
  populateCMSForm();
  populateSettingsForm();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.style.display = 'block';

  const tabTitles = {
    productsTab: 'إدارة المنتجات',
    ordersTab: 'سجل الطلبات الواردة',
    cmsTab: 'إدارة المحتوى والصفحات',
    settingsTab: 'إعدادات المتجر والواتساب',
    backupTab: 'النسخ الاحتياطي واستعادة البيانات'
  };

  const titleEl = document.getElementById('currentTabTitle');
  if (titleEl && tabTitles[tabId]) titleEl.textContent = tabTitles[tabId];

  // Set active button
  const buttons = document.querySelectorAll('.menu-btn');
  buttons.forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId)) {
      b.classList.add('active');
    }
  });
}

// Products Table & CRUD
function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  const countEl = document.getElementById('prodsCount');
  if (!tbody || !storeData) return;

  const prods = storeData.products || [];
  if (countEl) countEl.textContent = prods.length;

  const currency = storeData.settings.currency || 'ر.س';

  if (prods.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 30px;">لا توجد منتجات مسجلة حالياً</td></tr>`;
    return;
  }

  tbody.innerHTML = prods.map(p => `
    <tr>
      <td><img src="${p.image.startsWith('http') || p.image.startsWith('data:') ? p.image : '../' + p.image}" class="prod-thumb-sm" alt="${p.name}"></td>
      <td><strong>${p.name}</strong></td>
      <td><span style="background: #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem;">${p.categoryName || p.category}</span></td>
      <td><strong style="color: #2563eb;">${p.price} ${currency}</strong></td>
      <td><span style="color: #94a3b8; text-decoration: line-through;">${p.oldPrice ? p.oldPrice + ' ' + currency : '-'}</span></td>
      <td><span style="background: #eff6ff; color: #2563eb; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">${p.badge || '-'}</span></td>
      <td>⭐ ${p.rating || 5.0}</td>
      <td>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.82rem;" onclick="editProduct(${p.id})">
          <i class="fas fa-edit"></i> تعديل
        </button>
        <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.82rem;" onclick="deleteProduct(${p.id})">
          <i class="fas fa-trash-alt"></i> حذف
        </button>
      </td>
    </tr>
  `).join('');
}

function openAddProductModal() {
  document.getElementById('modalProductTitle').textContent = 'إضافة منتج جديد';
  document.getElementById('prodEditId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('imagePreviewContainer').style.display = 'none';
  currentUploadedImageBase64 = '';
  document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
}

function previewProductImageFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    currentUploadedImageBase64 = e.target.result;
    const preview = document.getElementById('imagePreview');
    preview.src = currentUploadedImageBase64;
    document.getElementById('imagePreviewContainer').style.display = 'block';
    document.getElementById('prodImageUrl').value = '';
  };
  reader.readAsDataURL(file);
}

function handleProductSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('prodEditId').value;
  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value;
  const badge = document.getElementById('prodBadge').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const oldPriceVal = document.getElementById('prodOldPrice').value;
  const oldPrice = oldPriceVal ? parseFloat(oldPriceVal) : null;
  const urlVal = document.getElementById('prodImageUrl').value.trim();
  const desc = document.getElementById('prodDesc').value.trim();
  const specsRaw = document.getElementById('prodSpecs').value.trim();
  const specs = specsRaw ? specsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

  let image = currentUploadedImageBase64 || urlVal;
  if (!image) {
    if (editId) {
      const existing = storeData.products.find(p => p.id == editId);
      if (existing) image = existing.image;
    }
  }

  if (!image) {
    alert('يرجى وضع رابط لصورة المنتج أو رفع صورة من جهازك');
    return;
  }

  const categoryNames = {
    watches: 'ساعات ذكية ورياضية',
    audio: 'سماعات وصوتيات',
    chargers: 'شواحن ومنصات MagSafe',
    drones: 'درون وتصوير 4K',
    home: 'أجهزة منزل ذكي'
  };

  if (editId) {
    const prod = storeData.products.find(p => p.id == editId);
    if (prod) {
      prod.name = name;
      prod.category = category;
      prod.categoryName = categoryNames[category] || category;
      prod.badge = badge;
      prod.price = price;
      prod.oldPrice = oldPrice;
      prod.image = image;
      prod.description = desc;
      prod.specs = specs;
    }
  } else {
    const newId = storeData.products.length > 0 ? Math.max(...storeData.products.map(p => p.id)) + 1 : 1;
    storeData.products.unshift({
      id: newId,
      name: name,
      category: category,
      categoryName: categoryNames[category] || category,
      badge: badge,
      price: price,
      oldPrice: oldPrice,
      image: image,
      description: desc,
      specs: specs,
      rating: 5.0,
      reviewsCount: 1
    });
  }

  saveStoreState();
  renderProductsTable();
  closeProductModal();
  alert('تم حفظ المنتج بنجاح!');
}

function editProduct(id) {
  const prod = storeData.products.find(p => p.id == id);
  if (!prod) return;

  document.getElementById('modalProductTitle').textContent = 'تعديل بيانات المنتج';
  document.getElementById('prodEditId').value = prod.id;
  document.getElementById('prodName').value = prod.name;
  document.getElementById('prodCategory').value = prod.category;
  document.getElementById('prodBadge').value = prod.badge || '';
  document.getElementById('prodPrice').value = prod.price;
  document.getElementById('prodOldPrice').value = prod.oldPrice || '';
  document.getElementById('prodImageUrl').value = prod.image.startsWith('data:') ? '' : prod.image;
  document.getElementById('prodDesc').value = prod.description || '';
  document.getElementById('prodSpecs').value = (prod.specs || []).join('\n');

  if (prod.image) {
    const preview = document.getElementById('imagePreview');
    preview.src = prod.image;
    document.getElementById('imagePreviewContainer').style.display = 'block';
  } else {
    document.getElementById('imagePreviewContainer').style.display = 'none';
  }

  currentUploadedImageBase64 = prod.image.startsWith('data:') ? prod.image : '';
  document.getElementById('productModal').classList.add('active');
}

function deleteProduct(id) {
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من المتجر؟')) return;
  storeData.products = storeData.products.filter(p => p.id != id);
  saveStoreState();
  renderProductsTable();
}

// Orders Table
function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  const orders = JSON.parse(localStorage.getItem('techno_orders') || '[]');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 30px;">لا توجد طلبات جديدة حتى الآن</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(ord => `
    <tr>
      <td><strong>${ord.id}</strong></td>
      <td>${ord.customerName}</td>
      <td><a href="tel:${ord.customerPhone}" style="color: #2563eb; font-weight: 700;">${ord.customerPhone}</a></td>
      <td>${ord.city}</td>
      <td><strong style="color: #10b981;">${ord.total} ${ord.currency}</strong></td>
      <td style="font-size: 0.82rem; color: #64748b;">${ord.date}</td>
      <td><span style="background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">${ord.status || 'جديد'}</span></td>
      <td>
        <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="viewOrderDetails('${ord.id}')">
          <i class="fas fa-eye"></i> عرض
        </button>
      </td>
    </tr>
  `).join('');
}

function viewOrderDetails(orderId) {
  const orders = JSON.parse(localStorage.getItem('techno_orders') || '[]');
  const ord = orders.find(o => o.id === orderId);
  if (!ord) return;

  let details = `تفاصيل الطلب: ${ord.id}\n`;
  details += `العميل: ${ord.customerName} (${ord.customerPhone})\n`;
  details += `المدينة: ${ord.city} - ${ord.address || ''}\n\n`;
  details += `المنتجات:\n`;
  ord.items.forEach(it => {
    details += `- ${it.name} (${it.qty} × ${it.price} = ${it.qty * it.price} ${ord.currency})\n`;
  });
  details += `\nالإجمالي: ${ord.total} ${ord.currency}\n`;
  if (ord.notes) details += `ملاحظات: ${ord.notes}\n`;

  alert(details);
}

function clearOrdersLog() {
  if (!confirm('هل تريد مسح سجل الطلبات بالكامل؟')) return;
  localStorage.removeItem('techno_orders');
  renderOrdersTable();
}

// CMS & Content
function populateCMSForm() {
  if (!storeData || !storeData.settings) return;
  const s = storeData.settings;
  document.getElementById('cmsHeroTitle').value = s.heroTitle || '';
  document.getElementById('cmsHeroBadge').value = s.heroBadge || '';
  document.getElementById('cmsHeroSubtitle').value = s.heroSubtitle || '';
}

function saveCMSContent(e) {
  e.preventDefault();
  storeData.settings.heroTitle = document.getElementById('cmsHeroTitle').value.trim();
  storeData.settings.heroBadge = document.getElementById('cmsHeroBadge').value.trim();
  storeData.settings.heroSubtitle = document.getElementById('cmsHeroSubtitle').value.trim();
  saveStoreState();
  alert('تم تحديث محتوى الواجهة بنجاح!');
}

// Store Settings
function populateSettingsForm() {
  if (!storeData || !storeData.settings) return;
  const s = storeData.settings;
  document.getElementById('setStoreName').value = s.storeName || '';
  document.getElementById('setCurrency').value = s.currency || 'ر.س';
  document.getElementById('setPhone').value = s.phone || '01027093535';
  document.getElementById('setWhatsapp').value = s.whatsapp || '201027093535';
}

function saveStoreSettings(e) {
  e.preventDefault();
  storeData.settings.storeName = document.getElementById('setStoreName').value.trim();
  storeData.settings.currency = document.getElementById('setCurrency').value.trim();
  storeData.settings.phone = document.getElementById('setPhone').value.trim();
  storeData.settings.whatsapp = document.getElementById('setWhatsapp').value.trim();
  
  const newPin = document.getElementById('setPin').value.trim();
  if (newPin) {
    storeData.settings.adminPin = newPin;
  }

  saveStoreState();
  alert('تم حفظ إعدادات المتجر ورقم الواتساب بنجاح!');
}

// Backup & Export / Import
function exportStoreJSON() {
  const jsonStr = JSON.stringify(storeData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `techno_nova_backup_${Date.now()}.json`;
  a.click();
}

function importStoreJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed.products && parsed.settings) {
        storeData = parsed;
        saveStoreState();
        initAdminUI();
        alert('تمت استعادة النسخة الاحتياطية بنجاح!');
      } else {
        alert('الملف غير صالح، يجب أن يحتوي على منتجات وإعدادات المتجر.');
      }
    } catch (err) {
      alert('حدث خطأ أثناء قراءة الملف: ' + err.message);
    }
  };
  reader.readAsText(file);
}

async function resetToDefaultData() {
  if (!confirm('هل أنت متأكد من رغبتك في استعادة البيانات الأصلية وإلغاء أي تعديلات محلية؟')) return;
  localStorage.removeItem('techno_store_data');
  const res = await fetch('../data/products.json');
  storeData = await res.json();
  initAdminUI();
  alert('تمت استعادة البيانات الأصلية بنجاح!');
}

function saveStoreState() {
  localStorage.setItem('techno_store_data', JSON.stringify(storeData));
}
