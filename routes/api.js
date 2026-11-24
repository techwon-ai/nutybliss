const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { products, bundles } = require('../data/products');
const { reviews } = require('../data/reviews');
const { faqs } = require('../data/faq');
const { logToSheet } = require('../lib/sheets');

// In-memory store for newsletter subscribers, orders, contact messages
const subscribers = [];
const orders = [];
const messages = [];

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

// GET /api/products  — list all, optional ?flavor=classic&size=500g
router.get('/products', (req, res) => {
  let result = [...products];
  if (req.query.flavor) result = result.filter(p => p.slug === req.query.flavor);
  if (req.query.size)   result = result.filter(p => p.size  === req.query.size);
  if (req.query.popular) result = result.filter(p => p.popular);
  res.json({ success: true, data: result });
});

// GET /api/products/hot — hot selling (popular or first 6)
router.get('/products/hot', (req, res) => {
  const hot = products.filter(p => p.popular || p.badge === 'BESTSELLER' || p.badge === 'GYM FAV');
  res.json({ success: true, data: hot.slice(0, 6) });
});

// GET /api/products/flavors — unique flavors
router.get('/products/flavors', (req, res) => {
  const seen = new Set();
  const flavors = products.reduce((acc, p) => {
    if (!seen.has(p.slug)) {
      seen.add(p.slug);
      acc.push({ slug: p.slug, flavor: p.flavor, name: p.name.split(' ')[0] + ' ' + (p.name.split(' ')[1] || '') });
    }
    return acc;
  }, []);
  res.json({ success: true, data: flavors });
});

// GET /api/products/:id
router.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  // Include size variants for same slug
  const variants = products.filter(p => p.slug === product.slug);
  res.json({ success: true, data: product, variants });
});

// ─── CART ────────────────────────────────────────────────────────────────────

function getCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

// GET /api/cart
router.get('/cart', (req, res) => {
  const cart = getCart(req);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  res.json({ success: true, data: cart, total, count: cart.reduce((s, i) => s + i.qty, 0) });
});

// POST /api/cart — body: { productId, qty }
router.post('/cart', (req, res) => {
  const { productId, qty = 1 } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const cart = getCart(req);
  const existing = cart.find(i => i.productId === productId);
  if (existing) {
    existing.qty += Number(qty);
  } else {
    cart.push({
      cartItemId: uuidv4(),
      productId,
      name: product.name,
      size: product.size,
      price: product.price,
      originalPrice: product.original,
      flavor: product.flavor,
      qty: Number(qty)
    });
  }
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  res.json({ success: true, data: cart, total, count: cart.reduce((s, i) => s + i.qty, 0) });
});

// PUT /api/cart/:cartItemId — body: { qty }
router.put('/cart/:cartItemId', (req, res) => {
  const cart = getCart(req);
  const item = cart.find(i => i.cartItemId === req.params.cartItemId);
  if (!item) return res.status(404).json({ success: false, message: 'Cart item not found' });

  const qty = Number(req.body.qty);
  if (qty <= 0) {
    const idx = cart.indexOf(item);
    cart.splice(idx, 1);
  } else {
    item.qty = qty;
  }
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  res.json({ success: true, data: cart, total, count: cart.reduce((s, i) => s + i.qty, 0) });
});

// DELETE /api/cart/:cartItemId
router.delete('/cart/:cartItemId', (req, res) => {
  const cart = getCart(req);
  const idx = cart.findIndex(i => i.cartItemId === req.params.cartItemId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Cart item not found' });
  cart.splice(idx, 1);
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  res.json({ success: true, data: cart, total, count: cart.reduce((s, i) => s + i.qty, 0) });
});

// DELETE /api/cart — clear cart
router.delete('/cart', (req, res) => {
  req.session.cart = [];
  res.json({ success: true, data: [], total: 0, count: 0 });
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────

// POST /api/orders — body: { name, email, phone, address, pincode, city, state }
router.post('/orders', (req, res) => {
  const cart = getCart(req);
  if (!cart.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

  const { name, email, phone, address, pincode, city, state } = req.body;
  if (!name || !email || !phone || !address || !pincode || !city || !state) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = total >= 999 ? 0 : 79;
  const order = {
    orderId: 'NB' + Date.now(),
    items: [...cart],
    subtotal: total,
    shipping,
    total: total + shipping,
    customer: { name, email, phone, address, pincode, city, state },
    status: 'confirmed',
    placedAt: new Date().toISOString()
  };
  orders.push(order);
  logToSheet('Orders', [
    order.orderId, order.placedAt, name, email, phone, address, city, state, pincode,
    order.items.map(i => `${i.name} ${i.size} x${i.qty}`).join(', '),
    order.subtotal, order.shipping, order.total, order.status
  ]);
  req.session.cart = [];
  res.json({ success: true, data: order, message: 'Order placed successfully!' });
});

// GET /api/orders/:orderId — track order
router.get('/orders/:orderId', (req, res) => {
  const order = orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data: order });
});

// ─── BUNDLES ─────────────────────────────────────────────────────────────────

router.get('/bundles', (req, res) => {
  res.json({ success: true, data: bundles });
});

// ─── REVIEWS ────────────────────────────────────────────────────────────────

// GET /api/reviews
router.get('/reviews', (req, res) => {
  res.json({ success: true, data: reviews, count: reviews.length });
});

// POST /api/reviews — submit a review
router.post('/reviews', (req, res) => {
  const { name, role, stars, text, product } = req.body;
  if (!name || !stars || !text) {
    return res.status(400).json({ success: false, message: 'Name, rating and review text are required' });
  }
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#5b2a8a', '#f57e2a', '#2f7a3a', '#d83a26', '#e8b62a'];
  const newReview = {
    id: 'r' + uuidv4().slice(0, 8),
    stars: Math.min(5, Math.max(1, Number(stars))),
    name, role: role || 'Verified Buyer',
    avatar: initials,
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    text, product: product || 'Classic Smooth',
    date: new Date().toISOString().split('T')[0],
    verified: false
  };
  reviews.push(newReview);
  logToSheet('Reviews', [newReview.id, newReview.date, name, newReview.role, newReview.stars, newReview.product, text, 'pending']);
  res.json({ success: true, data: newReview, message: 'Review submitted! It will appear after moderation.' });
});

// ─── FAQ ────────────────────────────────────────────────────────────────────

router.get('/faq', (req, res) => {
  res.json({ success: true, data: faqs });
});

// ─── NEWSLETTER ─────────────────────────────────────────────────────────────

router.post('/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email required' });
  }
  if (subscribers.find(s => s.email === email)) {
    return res.json({ success: true, message: "You're already on the list! 🥜" });
  }
  const subscribedAt = new Date().toISOString();
  subscribers.push({ email, subscribedAt });
  logToSheet('Newsletter', [email, subscribedAt]);
  res.json({ success: true, message: "You're in! Expect pure peanut joy in your inbox." });
});

// ─── CONTACT ────────────────────────────────────────────────────────────────

router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required' });
  }
  const msg = { id: uuidv4(), name, email, subject, message, receivedAt: new Date().toISOString() };
  messages.push(msg);
  logToSheet('Contact', [msg.id, msg.receivedAt, name, email, subject || '', message]);
  res.json({ success: true, message: "Got it! We'll get back to you within 24 hours. 🥜" });
});

module.exports = router;
