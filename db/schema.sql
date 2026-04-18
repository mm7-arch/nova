CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  tagline TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL,
  color_scheme TEXT DEFAULT 'dark',
  image_seed TEXT NOT NULL,
  description TEXT,
  specs TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  UNIQUE(user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'processing',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT OR IGNORE INTO products (id, name, subtitle, tagline, category, price, color_scheme, image_seed, description, specs, sort_order) VALUES
(1, 'Nova Phone Pro', 'Nova Phone Pro', 'Power meets intelligence.', 'phones', 999.00, 'dark', 'nova-phone-pro-titanium', 'Our most advanced phone with on-device AI and a pro-grade camera system.', '["6.7-inch AMOLED 120Hz","Nova X1 chip","108MP triple camera","Titanium frame"]', 1),
(2, 'Nova Phone', 'Nova Phone', 'Seriously capable.', 'phones', 699.00, 'dark', 'nova-phone-midnight', 'All the essentials at an incredible price with smart AI features.', '["6.1-inch AMOLED","Nova X1 chip","48MP camera","All-day battery"]', 2),
(3, 'Nova Air', 'Nova Air', 'Impossibly thin. Impossibly fast.', 'laptops', 1099.00, 'light', 'nova-air-silver-laptop', 'The world''s thinnest laptop with breakthrough performance.', '["14-inch Liquid Retina","Nova M4 chip","22-hour battery","1.13 kg"]', 3),
(4, 'Nova Pro', 'Nova Pro', 'Built for what comes next.', 'laptops', 1799.00, 'light', 'nova-pro-space-black', 'For professionals who demand the absolute best.', '["16-inch Mini-LED","Nova M4 Max chip","Up to 30-hour battery","Thunderbolt 5"]', 4),
(5, 'Nova Tab Pro', 'Nova Tab Pro', 'Redefining thin.', 'tablets', 1199.00, 'light', 'nova-tab-pro-silver', 'The most powerful and thinnest tablet we''ve ever created.', '["13-inch OLED","Nova M4 chip","Nova Stylus Pro","5G ready"]', 5),
(6, 'Nova Tab', 'Nova Tab', 'Your next favorite thing.', 'tablets', 599.00, 'light', 'nova-tab-colorful-fun', 'Versatile, powerful, and now with a stunning display.', '["11-inch LCD","Nova M3 chip","Nova Stylus support","All-day battery"]', 6),
(7, 'Nova Watch', 'Nova Watch', 'Thinness that makes history.', 'watches', 349.00, 'dark', 'nova-watch-starlight', 'Our thinnest watch ever with the largest display.', '["2.1-inch OLED always-on","Nova S10 chip","Sleep tracking","Water resistant 50m"]', 7),
(8, 'Nova Watch Ultra', 'Nova Watch Ultra', 'Built for the extreme.', 'watches', 849.00, 'dark', 'nova-watch-ultra-orange', 'The most rugged watch for the most demanding adventures.', '["2.2-inch sapphire display","Dual-frequency GPS","3000 nits brightness","Titanium case"]', 8),
(9, 'Nova Buds Pro', 'Nova Buds Pro', 'Sound reimagined.', 'audio', 229.00, 'dark', 'nova-buds-pro-white', 'Premium audio with adaptive noise cancellation and spatial sound.', '["Active Noise Cancellation","Spatial Audio","36-hour battery","IP54 dust & water"]', 9),
(10, 'Nova Buds Max', 'Nova Buds Max', 'Over-ear perfection.', 'audio', 549.00, 'light', 'nova-buds-max-midnight', 'Hi-fidelity over-ear headphones for the serious listener.', '["Premium ANC","Hi-Res Audio","40-hour battery","USB-C + 3.5mm"]', 10),
(11, 'Nova Box', 'Nova Box', 'Your living room, elevated.', 'tv', 149.00, 'dark', 'nova-box-black-streaming', 'Stream everything in 4K HDR with cinema-quality sound.', '["Nova A16 chip","4K HDR10+","Dolby Atmos","256GB storage"]', 11),
(12, 'Nova Speaker', 'Nova Speaker', 'Room-filling intelligence.', 'tv', 299.00, 'light', 'nova-speaker-charcoal', 'Rich, immersive sound with a smart assistant built in.', '["360-degree audio","Nova S8 chip","Multi-room support","Matter & Thread"]', 12);