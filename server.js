const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'nova-clone-secret-2024-production';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const db = new Database(path.join(dbDir, 'nova.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf-8');
db.exec(schema);

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

// ===== AUTH =====
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hash);
    const token = jwt.sign({ id: result.lastInsertRowid, name, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, name, email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

// ===== PRODUCTS =====
app.get('/api/products', (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];
    if (category && category !== 'all') { query += ' WHERE category = ?'; params.push(category); }
    if (search) {
      query += params.length ? ' AND (name LIKE ? OR tagline LIKE ? OR description LIKE ?)' : ' WHERE (name LIKE ? OR tagline LIKE ? OR description LIKE ?)';
      const t = `%${search}%`; params.push(t, t, t);
    }
    query += ' ORDER BY sort_order ASC';
    const products = db.prepare(query).all(...params);
    products.forEach(p => { try { p.specs = JSON.parse(p.specs); } catch { p.specs = []; } });
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    try { product.specs = JSON.parse(product.specs); } catch { product.specs = []; }
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/categories', (req, res) => {
  res.json(db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all().map(r => r.category));
});

// ===== CART =====
app.get('/api/cart', auth, (req, res) => {
  try {
    const items = db.prepare(`SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.subtitle, p.price, p.image_seed, p.color_scheme FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ? ORDER BY ci.id`).all(req.user.id);
    res.json({ items, total: items.reduce((s, i) => s + i.price * i.quantity, 0), count: items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/cart', auth, (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    if (!db.prepare('SELECT id FROM products WHERE id = ?').get(product_id)) return res.status(404).json({ error: 'Product not found' });
    const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
    else db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product_id, quantity);
    const items = db.prepare(`SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image_seed FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`).all(req.user.id);
    res.json({ items, total: items.reduce((s, i) => s + i.price * i.quantity, 0), count: items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/cart/:id', auth, (req, res) => {
  try {
    const { quantity } = req.body;
    const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (quantity <= 0) db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
    else db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
    const items = db.prepare(`SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image_seed FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`).all(req.user.id);
    res.json({ items, total: items.reduce((s, i) => s + i.price * i.quantity, 0), count: items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/cart/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    const items = db.prepare(`SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image_seed FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`).all(req.user.id);
    res.json({ items, total: items.reduce((s, i) => s + i.price * i.quantity, 0), count: items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== ORDERS =====
app.post('/api/orders', auth, (req, res) => {
  try {
    const cartItems = db.prepare(`SELECT ci.*, p.name, p.price FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`).all(req.user.id);
    if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const orderResult = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(req.user.id, total);
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity) VALUES (?, ?, ?, ?, ?)');
    cartItems.forEach(i => insertItem.run(orderResult.lastInsertRowid, i.product_id, i.name, i.price, i.quantity));
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.status(201).json({ order: db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResult.lastInsertRowid), items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderResult.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', auth, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    orders.forEach(o => { o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id); });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== SEO =====
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: https://novatech.com/sitemap.xml');
});

app.get('/sitemap.xml', (req, res) => {
  const products = db.prepare('SELECT id FROM products').all();
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://novatech.com/</loc><priority>1.0</priority></url>${products.map(p => `<url><loc>https://novatech.com/product/${p.id}</loc><priority>0.8</priority></url>`).join('')}</urlset>`);
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Nova Tech running at http://localhost:${PORT}`));