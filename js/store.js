
    /* ==========================================================================
       1. FLASH DEALS 4-CARD SLIDESHOW WITH AUTOPLAY & SMOOTH CONTROLS
       ========================================================================== */
    var sliderCurrentIndex = 0;
    var sliderTotalItems = 6;
    var sliderAutoPlayTimer = null;

    function getVisibleCardsCount() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 4; // Exactly 4 cards on desktop!
    }

    function updateSliderPosition() {
        var track = document.getElementById('sliderTrack');
        if (!track) return;
        var visibleCards = getVisibleCardsCount();
        var maxIndex = Math.max(0, sliderTotalItems - visibleCards);
        if (sliderCurrentIndex > maxIndex) sliderCurrentIndex = maxIndex;
        if (sliderCurrentIndex < 0) sliderCurrentIndex = 0;
        
        // Positive offset moves track in RTL to reveal items smoothly
        var percentagePerCard = 100 / visibleCards;
        var offset = sliderCurrentIndex * percentagePerCard;
        track.style.transform = 'translateX(' + offset + '%)';
    }

    function slideNext() {
        var visibleCards = getVisibleCardsCount();
        var maxIndex = Math.max(0, sliderTotalItems - visibleCards);
        if (sliderCurrentIndex < maxIndex) {
            sliderCurrentIndex = sliderCurrentIndex + 1;
        } else {
            sliderCurrentIndex = 0; // loop back to first
        }
        updateSliderPosition();
    }

    function slidePrev() {
        var visibleCards = getVisibleCardsCount();
        var maxIndex = Math.max(0, sliderTotalItems - visibleCards);
        if (sliderCurrentIndex > 0) {
            sliderCurrentIndex = sliderCurrentIndex - 1;
        } else {
            sliderCurrentIndex = maxIndex; // loop to last
        }
        updateSliderPosition();
    }

    function startSliderAutoPlay() {
        stopSliderAutoPlay();
        sliderAutoPlayTimer = setInterval(function() {
            slideNext();
        }, 3600);
    }

    function stopSliderAutoPlay() {
        if (sliderAutoPlayTimer) {
            clearInterval(sliderAutoPlayTimer);
            sliderAutoPlayTimer = null;
        }
    }

    // Attach pause on mouse hover
    var sliderViewport = document.querySelector('.tech-slider-viewport');
    if (sliderViewport) {
        sliderViewport.addEventListener('mouseenter', stopSliderAutoPlay);
        sliderViewport.addEventListener('mouseleave', startSliderAutoPlay);
    }

    window.addEventListener('resize', function() {
        updateSliderPosition();
    });

    /* ==========================================================================
       2. CATALOG CATEGORIES & DYNAMIC FILTERING (WITH AUTO-SCROLL TO PRODUCTS)
       ========================================================================== */
    var currentCategory = 'all';
    var currentSort = 'featured';
    var maxPriceFilter = 2500;

    function filterCategory(cat, btn) {
        currentCategory = cat;

        // Highlight sidebar button
        var sideBtns = document.querySelectorAll('.tech-filter-cat-btn');
        sideBtns.forEach(function(b) {
            b.classList.remove('active');
            var onclickAttr = b.getAttribute('onclick') || '';
            if (onclickAttr.indexOf("'" + cat + "'") !== -1) {
                b.classList.add('active');
            }
        });

        // Highlight navbar tab
        var navItems = document.querySelectorAll('.tech-nav-item');
        navItems.forEach(function(item) {
            item.classList.remove('active');
            var link = item.querySelector('a');
            if (link) {
                var onclickAttr = link.getAttribute('onclick') || '';
                if (cat !== 'all') {
                    if (onclickAttr.indexOf("'" + cat + "'") !== -1) {
                        item.classList.add('active');
                    }
                }
            }
        });

        // Apply filters
        applyFilters();

        // Smooth scroll to catalog so user sees the filtered devices!
        var catalogEl = document.getElementById('catalog');
        if (catalogEl) {
            catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function sortProducts(sortType, btn) {
        currentSort = sortType;
        if (btn) {
            document.querySelectorAll('.tech-sort-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
        }
        applyFilters();
    }

    function filterByPrice(val) {
        maxPriceFilter = parseInt(val);
        var display = document.getElementById('priceDisplay');
        if (display) {
            display.textContent = parseInt(val).toLocaleString() + ' ر.س';
        }
        applyFilters();
    }

    function searchProducts() {
        applyFilters();
        var catalogEl = document.getElementById('catalog');
        if (catalogEl) {
            catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function applyFilters() {
        var searchInput = document.getElementById('searchInput');
        var query = '';
        if (searchInput) {
            query = (searchInput.value || '').trim().toLowerCase();
        }
        var items = Array.from(document.querySelectorAll('.prod-item'));
        var grid = document.getElementById('productsGrid');
        if (!grid) return;
        if (!items.length) return;

        var visibleItems = [];

        items.forEach(function(item) {
            var cat = item.getAttribute('data-cat') || '';
            var price = parseInt(item.getAttribute('data-price') || '0');
            var name = (item.getAttribute('data-name') || '').toLowerCase();

            var isMatch = true;

            // Category test
            if (currentCategory !== 'all') {
                if (cat !== currentCategory) {
                    isMatch = false;
                }
            }

            // Price test
            if (price > maxPriceFilter) {
                isMatch = false;
            }

            // Search query test
            if (query.length > 0) {
                if (name.indexOf(query) === -1) {
                    if (cat.indexOf(query) === -1) {
                        isMatch = false;
                    }
                }
            }

            if (isMatch) {
                item.style.display = 'flex';
                visibleItems.push(item);
            } else {
                item.style.display = 'none';
            }
        });

        // Update count
        var countEl = document.getElementById('visibleCount');
        if (countEl) {
            countEl.textContent = visibleItems.length;
        }

        // Sorting
        visibleItems.sort(function(a, b) {
            var pA = parseInt(a.getAttribute('data-price') || '0');
            var pB = parseInt(b.getAttribute('data-price') || '0');
            var sA = parseInt(a.getAttribute('data-sales') || '0');
            var sB = parseInt(b.getAttribute('data-sales') || '0');
            var fA = parseInt(a.getAttribute('data-featured') || '0');
            var fB = parseInt(b.getAttribute('data-featured') || '0');

            if (currentSort === 'price-asc') return pA - pB;
            if (currentSort === 'price-desc') return pB - pA;
            if (currentSort === 'bestseller') return sB - sA;
            return fB - fA;
        });

        visibleItems.forEach(function(item) {
            grid.appendChild(item);
        });
    }

    /* ==========================================================================
       3. CART & INTERACTIVE DRAWER
       ========================================================================== */
    var cart = JSON.parse(localStorage.getItem('tech_cart') || '[]');

    function addToCart(title, price, img) {
        cart.push({ title: title, price: price, img: img });
        updateCartUI();
        showToast('تمت إضافة "' + title.substring(0, 25) + '..." إلى سلة المشتريات بنجاح! 🚀');
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        localStorage.setItem('tech_cart', JSON.stringify(cart));
        updateCartUI();
    }

    function updateCartUI() {
        var badge = document.getElementById('cartBadge');
        var headerCount = document.getElementById('cartCountHeader');
        var totalSum = document.getElementById('cartTotalSum');
        var container = document.getElementById('cartItemsContainer');

        if (badge) badge.textContent = cart.length;
        if (headerCount) headerCount.textContent = cart.length;

        var total = 0;
        cart.forEach(function(item) {
            total = total + item.price;
        });
        if (totalSum) totalSum.textContent = total.toLocaleString() + ' ر.س';

        if (!container) return;

        if (cart.length === 0) {
            container.innerHTML = '<div class="tech-cart-empty">' +
                '<i class="fa-solid fa-cart-shopping"></i>' +
                '<h4>سلتك لا تزال فارغة</h4>' +
                '<p>تصفح أحدث الأجهزة الذكية وأضفها لسلتك بسهولة</p>' +
                '</div>';
            return;
        }

        var html = '';
        cart.forEach(function(item, idx) {
            html += '<div class="tech-cart-item">' +
                '<img decoding="async" src="' + item.img + '" alt="' + item.title + '" class="tech-cart-item-img">' +
                '<div class="tech-cart-item-info">' +
                    '<h5 class="tech-cart-item-title">' + item.title + '</h5>' +
                    '<div class="tech-cart-item-price">' + item.price.toLocaleString() + ' ر.س</div>' +
                '</div>' +
                '<button class="tech-cart-remove" onclick="removeFromCart(' + idx + ')" title="حذف">' +
                    '<i class="fa-solid fa-trash-can"></i>' +
                '</button>' +
            '</div>';
        });
        container.innerHTML = html;
    }

    function toggleCartDrawer() {
        var overlay = document.getElementById('cartOverlay');
        var drawer = document.getElementById('cartDrawer');
        if (overlay) {
            if (drawer) {
                overlay.classList.toggle('active');
                drawer.classList.toggle('active');
            }
        }
    }

    function proceedCheckout() {
        if (!cart || cart.length === 0) {
            showToast('السلة فارغة! أضف بعض الأجهزة أولاً للمتابعة.');
            return;
        }
        
        var total = 0;
        var itemsText = "";
        cart.forEach(function(item, idx) {
            var sub = item.price * item.quantity;
            total += sub;
            itemsText += "\n" + (idx + 1) + ") *" + item.name + "*\n   الكمية: " + item.quantity + " × " + item.price + " = " + sub + " ر.س";
        });
        
        var orderId = "TECH-" + Math.floor(100000 + Math.random() * 900000);
        var dateStr = new Date().toLocaleString('ar-EG');
        
        // Save to orders log
        var existingOrders = JSON.parse(localStorage.getItem('techno_orders') || '[]');
        existingOrders.unshift({
            id: orderId,
            customerName: "عميل المتجر (طلب سريع)",
            customerPhone: "واتساب",
            city: "شحن سريع",
            items: cart.slice(),
            total: total,
            currency: "ر.س",
            date: dateStr,
            status: "جديد"
        });
        localStorage.setItem('techno_orders', JSON.stringify(existingOrders));
        
        var msg = "*طلب شراء جديد من متجر تكنو نوفا* 🛍️\n";
        msg += "*رقم الطلب:* " + orderId + "\n";
        msg += "*التاريخ:* " + dateStr + "\n";
        msg += "--------------------------------\n";
        msg += "*المنتجات المطلوبة:*" + itemsText + "\n";
        msg += "--------------------------------\n";
        msg += "💰 *الإجمالي الكلي:* *" + total + " ر.س*\n\n";
        msg += "أرجو تأكيد توفر الطلب والبدء في الشحن والتوصيل فوراً.";
        
        showToast('جاري تحويلك إلى واتساب لتأكيد الطلب والشحن...');
        setTimeout(function() {
            window.open("https://wa.me/201027093535?text=" + encodeURIComponent(msg), "_blank");
        }, 800);
    }

    function showToast(msg) {
        var toast = document.getElementById('techToast');
        var toastMsg = document.getElementById('toastMsg');
        if (toast) {
            if (toastMsg) {
                toastMsg.textContent = msg;
                toast.classList.add('show');
                setTimeout(function() {
                    toast.classList.remove('show');
                }, 3500);
            }
        }
    }

    /* ==========================================================================
       4. MODALS (ORDER TRACKING & 24/7 SUPPORT)
       ========================================================================== */
    function openTrackingModal() {
        var overlay = document.getElementById('trackingOverlay');
        var modal = document.getElementById('trackingModal');
        if (overlay) overlay.classList.add('active');
        if (modal) modal.style.display = 'block';
    }
    function closeTrackingModal() {
        var overlay = document.getElementById('trackingOverlay');
        var modal = document.getElementById('trackingModal');
        if (overlay) overlay.classList.remove('active');
        if (modal) modal.style.display = 'none';
        var res = document.getElementById('trackResult');
        if (res) res.style.display = 'none';
    }
    function trackShipment() {
        var input = document.getElementById('trackInput');
        var res = document.getElementById('trackResult');
        if (input) {
            if (input.value.trim().length === 0) {
                showToast('يرجى إدخال رقم الشحنة للمتابعة');
                return;
            }
        }
        if (res) res.style.display = 'block';
    }

    function openSupportModal() {
        var overlay = document.getElementById('supportOverlay');
        var modal = document.getElementById('supportModal');
        if (overlay) overlay.classList.add('active');
        if (modal) modal.style.display = 'block';
    }
    function closeSupportModal() {
        var overlay = document.getElementById('supportOverlay');
        var modal = document.getElementById('supportModal');
        if (overlay) overlay.classList.remove('active');
        if (modal) modal.style.display = 'none';
    }

    /* ==========================================================================
       5. COUNTDOWN TIMER CONTROLLER
       ========================================================================== */
    function startCountdown() {
        var h = 14, m = 35, s = 20;
        setInterval(function() {
            s = s - 1;
            if (s < 0) { s = 59; m = m - 1; }
            if (m < 0) { m = 59; h = h - 1; }
            if (h < 0) { h = 24; }
            var eh = document.getElementById('cd-hours');
            var em = document.getElementById('cd-minutes');
            var es = document.getElementById('cd-seconds');
            if (eh) eh.textContent = h < 10 ? '0' + h : h;
            if (em) em.textContent = m < 10 ? '0' + m : m;
            if (es) es.textContent = s < 10 ? '0' + s : s;
        }, 1000);
    }

    // Initialize immediately
    updateSliderPosition();
    startSliderAutoPlay();
    startCountdown();
    

// Overridden proceedCheckout with direct WhatsApp routing to 01027093535
function proceedCheckout() {
    if (!cart || cart.length === 0) {
        showToast("سلة المشتريات فارغة حالياً!");
        return;
    }
    
    let total = 0;
    let itemsList = "";
    cart.forEach((item, index) => {
        let itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemsList += `\n${index + 1}) *${item.name}*\n   الكمية: ${item.quantity} × ${item.price} = ${itemTotal} ر.س`;
    });
    
    let orderNum = "TECH-" + Math.floor(100000 + Math.random() * 900000);
    let msg = `*طلب شراء جديد من متجر تكنو نوفا* 🛍️\n`;
    msg += `*رقم الطلب:* ${orderNum}\n`;
    msg += `--------------------------------\n`;
    msg += `*المنتجات المطلوبة:*${itemsList}\n`;
    msg += `--------------------------------\n`;
    msg += `💰 *الإجمالي الكلي:* *${total} ر.س*\n\n`;
    msg += `أود تأكيد الطلب والشحن المباشر.`;
    
    let waUrl = `https://wa.me/201027093535?text=${encodeURIComponent(msg)}`;
    showToast("جاري تحويلك إلى واتساب لإتمام الطلب...");
    setTimeout(() => {
        window.open(waUrl, "_blank");
    }, 800);
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof updateCartUI === 'function') {
        updateCartUI();
    }
});
