// ─── NUTYBLISS shared utilities ───────────────────────────────────────────────

const API = '/api';

// ── Cart helpers ──────────────────────────────────────────────────────────────
const Cart = {
  async get() {
    const r = await fetch(`${API}/cart`, { credentials: 'include' });
    return r.json();
  },
  async add(productId, qty = 1) {
    const r = await fetch(`${API}/cart`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, qty })
    });
    return r.json();
  },
  async update(cartItemId, qty) {
    const r = await fetch(`${API}/cart/${cartItemId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty })
    });
    return r.json();
  },
  async remove(cartItemId) {
    const r = await fetch(`${API}/cart/${cartItemId}`, {
      method: 'DELETE', credentials: 'include'
    });
    return r.json();
  },
  async clear() {
    const r = await fetch(`${API}/cart`, { method: 'DELETE', credentials: 'include' });
    return r.json();
  }
};

// ── Update cart badge in nav ──────────────────────────────────────────────────
async function refreshCartBadge() {
  try {
    const { count } = await Cart.get();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count > 0 ? count : '';
    });
  } catch (_) {}
}

// ── Toast notification ────────────────────────────────────────────────────────
function showToast(msg, duration = 2600) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Add to cart handler ───────────────────────────────────────────────────────
async function handleAddToCart(productId, btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Adding…';
  }
  try {
    const data = await Cart.add(productId, 1);
    if (data.success) {
      showToast('🥜 Added to cart!');
      refreshCartBadge();
      if (btn) {
        btn.textContent = 'Added!';
        btn.classList.add('added');
        setTimeout(() => {
          btn.textContent = 'Add to Cart';
          btn.classList.remove('added');
          btn.disabled = false;
        }, 1800);
      }
    } else {
      showToast('Something went wrong. Try again.');
      if (btn) { btn.disabled = false; btn.textContent = 'Add to Cart'; }
    }
  } catch (e) {
    showToast('Network error. Try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Add to Cart'; }
  }
}

// ── Format price (PKR) ───────────────────────────────────────────────────────
function formatPrice(n) { return 'Rs. ' + Number(n).toLocaleString('en-PK'); }

// ── Jar image by flavor ───────────────────────────────────────────────────────
function jarImg(flavor, size = 200, alt = '') {
  const map = {
    classic:   '/images/jar-classic.png',
    crunchy:   '/images/jar-crunchy.png',
    choco:     '/images/jar-choco.png',
    chocoChip: '/images/jar-chocoChip.png',
    honey:     '/images/jar-honey.png',
    protein:   '/images/jar-classic.png'
  };
  const src = map[flavor] || map.classic;
  return `<img src="${src}" alt="${alt || flavor + ' peanut butter'}" width="${size}" height="${size}" style="object-fit:contain;width:${size}px;height:${size}px;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.18));" loading="lazy" />`;
}

// kept for CSS fallback usage
function jarClass(flavor) {
  const map = {
    classic: 'jar-classic', crunchy: 'jar-crunchy',
    choco: 'jar-choco', chocoChip: 'jar-chocoChip',
    honey: 'jar-honey', protein: 'jar-protein'
  };
  return map[flavor] || 'jar-classic';
}

// ── Render stars ─────────────────────────────────────────────────────────────
function renderStars(n) { return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)); }

// ── Highlight active nav link ─────────────────────────────────────────────────
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '/' && href === '/index.html') || path.includes(href.replace('.html', ''))) {
      a.classList.add('active');
    }
  });
}

// ── FAQ accordion ────────────────────────────────────────────────────────────
function initFaqAccordion(container) {
  container.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      container.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-a').style.display = 'none';
        i.querySelector('.faq-icon').textContent = '+';
      });
      if (!isOpen) {
        item.classList.add('open');
        item.querySelector('.faq-a').style.display = 'block';
        item.querySelector('.faq-icon').textContent = '−';
      }
    });
  });
}

// ── Nav HTML shared ──────────────────────────────────────────────────────────
function renderNav() {
  return `
    <div class="promo-bar">🥜 Free delivery above Rs. 1,999 &nbsp;|&nbsp; Pakistan's cleanest peanut butter &nbsp;|&nbsp; Use code NUTY10 for 10% off</div>
    <nav class="nav">
      <a href="/index.html" class="nav-logo">
        <img src="/images/logo.png" alt="NUTYBLISS" style="height:44px;width:auto;object-fit:contain;" />
      </a>
      <div class="nav-links">
        <a href="/shop.html">Shop</a>
        <a href="/story.html">Story</a>
        <a href="/faq.html">FAQ</a>
        <a href="/reviews.html">Reviews</a>
        <a href="/contact.html">Contact</a>
      </div>
      <div class="nav-right">
        <a href="/cart.html" class="nav-cart">
          🛒 Cart <span class="cart-count"></span>
        </a>
      </div>
    </nav>`;
}

// ── Footer HTML shared ───────────────────────────────────────────────────────
function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-top">
        <div class="footer-badge-item"><div class="footer-badge-icon">🌿</div> No Palm Oil</div>
        <div class="footer-badge-item"><div class="footer-badge-icon">🚫</div> No Added Sugar</div>
        <div class="footer-badge-item"><div class="footer-badge-icon">💪</div> High Protein</div>
        <div class="footer-badge-item"><div class="footer-badge-icon">🌱</div> Non-GMO</div>
        <div class="footer-badge-item"><div class="footer-badge-icon">✅</div> PSQCA Certified</div>
      </div>
      <div class="footer-main">
        <div class="footer-grid">
          <div>
            <img src="/images/logo.png" alt="NUTYBLISS" style="height:60px;width:auto;object-fit:contain;filter:brightness(0) invert(1);margin-bottom:10px;" />
            <div class="footer-brand-sub">Spoonfuls of pure peanut joy. Stone-ground. No junk. No compromises. Just the good stuff.</div>
            <div class="footer-socials">
              <a href="#" class="footer-social">📸</a>
              <a href="#" class="footer-social">▶</a>
              <a href="#" class="footer-social">🐦</a>
              <a href="#" class="footer-social">💼</a>
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="/shop.html?flavor=classic">Classic Smooth</a></li>
              <li><a href="/shop.html?flavor=crunchy">Super Crunchy</a></li>
              <li><a href="/shop.html?flavor=choco">Choco Bliss</a></li>
              <li><a href="/shop.html?flavor=honey">Honey Drip</a></li>
              <li><a href="/shop.html?flavor=protein">Protein+</a></li>
            </ul>
          </div>
          <div>
            <h4>Help</h4>
            <ul>
              <li><a href="/cart.html">Track Order</a></li>
              <li><a href="/story.html">Our Story</a></li>
              <li><a href="/faq.html">Shipping Policy</a></li>
              <li><a href="/faq.html">Return Policy</a></li>
              <li><a href="/contact.html">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <div style="font-size:13px;opacity:0.85;line-height:2;">
              📧 business.nutybliss@gmail.com<br>
              📞 +92 300 1234567<br>
              📍 Lahore, Pakistan
            </div>
            <div style="margin-top:14px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--orange);margin-bottom:8px;">Accepted Payments</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <span style="background:rgba(245,234,208,0.08);border:1px solid rgba(245,234,208,0.25);color:var(--bg);padding:4px 9px;border-radius:5px;font-size:11px;">UPI</span>
              <span style="background:rgba(245,234,208,0.08);border:1px solid rgba(245,234,208,0.25);color:var(--bg);padding:4px 9px;border-radius:5px;font-size:11px;">Visa</span>
              <span style="background:rgba(245,234,208,0.08);border:1px solid rgba(245,234,208,0.25);color:var(--bg);padding:4px 9px;border-radius:5px;font-size:11px;">Mastercard</span>
              <span style="background:rgba(245,234,208,0.08);border:1px solid rgba(245,234,208,0.25);color:var(--bg);padding:4px 9px;border-radius:5px;font-size:11px;">COD</span>
            </div>
          </div>
        </div>
        <div class="footer-base">
          <span>© 2026 NUTYBLISS. All rights reserved.</span>
          <span>Made with 🥜 in Pakistan</span>
          <span>Developed by <a href="https://techwon.co" target="_blank" rel="noopener" style="color:var(--orange);font-weight:700;text-decoration:none;">techwon.co</a></span>
        </div>
      </div>
    </footer>
    <a href="https://wa.me/923001234567" class="wa-float" aria-label="Chat on WhatsApp">💬</a>`;
}

// ── Init on every page ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Inject nav + footer
  const navEl = document.getElementById('site-nav');
  if (navEl) navEl.innerHTML = renderNav();
  const footerEl = document.getElementById('site-footer');
  if (footerEl) footerEl.innerHTML = renderFooter();

  setActiveNav();
  refreshCartBadge();

  // FAQ accordion if present
  const faqList = document.querySelector('.faq-list');
  if (faqList) initFaqAccordion(faqList);
});
