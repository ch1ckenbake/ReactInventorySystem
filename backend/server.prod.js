import express from 'express';
import cors from 'cors';
// @ts-ignore - better-sqlite3 has no TS types here but works fine
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Production-ready minimal backend (JS) — core offline features only (no Google Drive sync)
// Serves built frontend (dist/) and exposes the API the SPA expects (same routes as dev server)

const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(process.cwd(), 'inventory.db');
let db = new Database(DB_PATH);

db.pragma('foreign_keys = ON');

// Create tables (same schema used by the TypeScript server)
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    currency TEXT NOT NULL DEFAULT 'PHP',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS varieties (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price_per_kg REAL NOT NULL DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, name)
  );

  CREATE TABLE IF NOT EXISTS packaging_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    size REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    price_per_package REAL NOT NULL DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS category_packaging_prices (
    category_id TEXT NOT NULL,
    packaging_id TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (category_id, packaging_id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (packaging_id) REFERENCES packaging_types(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    batch_code TEXT NOT NULL UNIQUE,
    category_id TEXT NOT NULL,
    variety_id TEXT NOT NULL,
    packaging_id TEXT NOT NULL,
    quantity_packages INTEGER NOT NULL,
    total_weight REAL NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (variety_id) REFERENCES varieties(id),
    FOREIGN KEY (packaging_id) REFERENCES packaging_types(id)
  );

  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    details TEXT,
    old_values TEXT,
    new_values TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure default Rice category exists
const riceCategory = db.prepare("SELECT id FROM categories WHERE name = 'Rice'").get();
if (!riceCategory) {
  const riceId = randomUUID();
  db.prepare("INSERT INTO categories (id, name, description, currency) VALUES (?, ?, ?, ?)").run(
    riceId,
    'Rice',
    'Rice and rice-based products',
    'PHP'
  );
}

// Ensure default packaging types exist
const defaultPackaging = [
  { name: 'Sack', size: 50, unit: 'kg', price_per_package: 0, description: 'Standard 50kg sack' },
  { name: 'Bag', size: 25, unit: 'kg', price_per_package: 0, description: 'Medium 25kg bag' },
  { name: 'Small Bag', size: 10, unit: 'kg', price_per_package: 0, description: 'Small 10kg bag' },
  { name: 'Retail Pack', size: 5, unit: 'kg', price_per_package: 0, description: 'Retail 5kg pack' }
];

for (const pkg of defaultPackaging) {
  try {
    const existing = db.prepare('SELECT id FROM packaging_types WHERE name = ?').get(pkg.name);
    if (!existing) {
      const pkgId = randomUUID();
      db.prepare('INSERT INTO packaging_types (id, name, size, unit, price_per_package, description) VALUES (?, ?, ?, ?, ?, ?)')
        .run(pkgId, pkg.name, pkg.size, pkg.unit, pkg.price_per_package || 0, pkg.description);
    }
  } catch (err) {
    // ignore
  }
}

// Simple history logger
function logHistory(action, entityType, entityId, entityName, details, oldValues, newValues) {
  try {
    const id = randomUUID();
    db.prepare(`INSERT INTO history (id, action, entity_type, entity_id, entity_name, details, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, action, entityType, entityId, entityName, details || null, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null);
  } catch (err) {
    console.error('Failed to log history:', err);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

/* ==================== HISTORY ==================== */
app.get('/history', (_req, res) => {
  const rows = db.prepare('SELECT * FROM history ORDER BY created_at DESC LIMIT 100').all();
  res.json(rows);
});

app.delete('/history/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM history WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'History record not found' });
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.delete('/history', (_req, res) => {
  try {
    const result = db.prepare('DELETE FROM history').run();
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

/* ==================== CATEGORIES ==================== */
app.get('/categories', (_req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  const categoriesWithPrices = rows.map(cat => {
    const prices = db.prepare('SELECT packaging_id, price FROM category_packaging_prices WHERE category_id = ?').all(cat.id);
    const packagingPrices = {};
    for (const p of prices) packagingPrices[p.packaging_id] = p.price;
    return { ...cat, packagingPrices };
  });
  res.json(categoriesWithPrices);
});

app.post('/categories', (req, res) => {
  const { name, description, packagingPrices } = req.body || {};
  const id = randomUUID();
  try {
    db.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)').run(id, name, description || null);
    if (packagingPrices && typeof packagingPrices === 'object') {
      for (const [pkgId, price] of Object.entries(packagingPrices)) {
        db.prepare('INSERT OR REPLACE INTO category_packaging_prices (category_id, packaging_id, price) VALUES (?, ?, ?)').run(id, pkgId, Number(price) || 0);
      }
    }
    logHistory('CREATE', 'CATEGORY', id, name, `Category \"${name}\" created`, null, { name, description, packagingPrices });
    res.json({ success: true, id });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.put('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, packagingPrices } = req.body || {};
  try {
    const oldCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!oldCategory) return res.status(404).json({ success: false, error: 'Category not found' });
    const result = db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description || null, id);
    if (packagingPrices && typeof packagingPrices === 'object') {
      db.prepare('DELETE FROM category_packaging_prices WHERE category_id = ?').run(id);
      for (const [pkgId, price] of Object.entries(packagingPrices)) {
        db.prepare('INSERT INTO category_packaging_prices (category_id, packaging_id, price) VALUES (?, ?, ?)').run(id, pkgId, Number(price) || 0);
      }
    }
    logHistory('UPDATE', 'CATEGORY', id, name, `Category updated`, { name: oldCategory.name, description: oldCategory.description }, { name, description, packagingPrices });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.delete('/categories/:id', (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Category not found' });
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    logHistory('DELETE', 'CATEGORY', id, existing.name, `Category deleted`, { name: existing.name, description: existing.description }, null);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

/* ==================== VARIETIES ==================== */
app.get('/varieties', (_req, res) => {
  const rows = db.prepare(`SELECT v.*, c.name as category_name FROM varieties v LEFT JOIN categories c ON v.category_id = c.id ORDER BY c.name, v.name ASC`).all();
  res.json(rows);
});

app.post('/varieties', (req, res) => {
  const { categoryId, name, pricePerKg, description } = req.body || {};
  const id = randomUUID();
  try {
    db.prepare('INSERT INTO varieties (id, category_id, name, price_per_kg, description) VALUES (?, ?, ?, ?, ?)').run(id, categoryId, name, pricePerKg || 0, description || null);
    logHistory('CREATE', 'VARIETY', id, name, `Variety created`, null, { categoryId, name, pricePerKg, description });
    res.json({ success: true, id });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.put('/varieties/:id', (req, res) => {
  const { id } = req.params;
  const { categoryId, name, pricePerKg, description } = req.body || {};
  try {
    const oldVariety = db.prepare('SELECT * FROM varieties WHERE id = ?').get(id);
    if (!oldVariety) return res.status(404).json({ success: false, error: 'Variety not found' });
    const result = db.prepare('UPDATE varieties SET category_id = ?, name = ?, price_per_kg = ?, description = ? WHERE id = ?').run(categoryId, name, pricePerKg || 0, description || null, id);
    logHistory('UPDATE', 'VARIETY', id, name, `Variety updated`, { name: oldVariety.name, pricePerKg: oldVariety.price_per_kg }, { name, pricePerKg, description });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.delete('/varieties/:id', (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM varieties WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Variety not found' });
    const result = db.prepare('DELETE FROM varieties WHERE id = ?').run(id);
    logHistory('DELETE', 'VARIETY', id, existing.name, `Variety deleted`, { name: existing.name }, null);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

/* ==================== PACKAGING ==================== */
app.get('/packaging', (_req, res) => {
  const rows = db.prepare('SELECT * FROM packaging_types ORDER BY size DESC').all();
  res.json(rows);
});

app.post('/packaging', (req, res) => {
  const { name, size, unit, pricePerPackage, description } = req.body || {};
  const id = randomUUID();
  try {
    db.prepare('INSERT INTO packaging_types (id, name, size, unit, price_per_package, description) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, size, unit || 'kg', pricePerPackage || 0, description || null);
    logHistory('CREATE', 'PACKAGING', id, name, `Packaging created`, null, { name, size, unit, pricePerPackage, description });
    res.json({ success: true, id });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.put('/packaging/:id', (req, res) => {
  const { id } = req.params;
  const { name, size, unit, pricePerPackage, description } = req.body || {};
  try {
    const oldPackaging = db.prepare('SELECT * FROM packaging_types WHERE id = ?').get(id);
    if (!oldPackaging) return res.status(404).json({ success: false, error: 'Packaging not found' });
    const result = db.prepare('UPDATE packaging_types SET name = ?, size = ?, unit = ?, price_per_package = ?, description = ? WHERE id = ?').run(name, size, unit || 'kg', pricePerPackage || 0, description || null, id);
    logHistory('UPDATE', 'PACKAGING', id, name, `Packaging updated`, { name: oldPackaging.name, size: oldPackaging.size }, { name, size, unit, pricePerPackage, description });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.delete('/packaging/:id', (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM packaging_types WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Packaging not found' });
    const result = db.prepare('DELETE FROM packaging_types WHERE id = ?').run(id);
    logHistory('DELETE', 'PACKAGING', id, existing.name, `Packaging deleted`, { name: existing.name }, null);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

/* ==================== INVENTORY ==================== */
app.get('/inventory', (_req, res) => {
  const rows = db.prepare(`
    SELECT 
      i.*,
      c.name as category_name,
      v.name as variety_name,
      p.name as packaging_name,
      p.size as packaging_size,
      p.unit as packaging_unit
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN varieties v ON i.variety_id = v.id
    LEFT JOIN packaging_types p ON i.packaging_id = p.id
    ORDER BY i.created_at DESC
  `).all();
  res.json(rows);
});

app.post('/inventory', (req, res) => {
  const { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt } = req.body || {};
  const id = randomUUID();
  try {
    db.prepare(`INSERT INTO inventory (id, batch_code, category_id, variety_id, packaging_id, quantity_packages, total_weight, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt || new Date().toISOString());
    logHistory('CREATE', 'INVENTORY', id, batchCode, `Inventory added`, null, { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt });
    res.json({ success: true, id });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.put('/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt } = req.body || {};
  try {
    const oldInventory = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!oldInventory) return res.status(404).json({ success: false, error: 'Item not found' });
    const result = db.prepare(`UPDATE inventory SET batch_code = ?, category_id = ?, variety_id = ?, packaging_id = ?, quantity_packages = ?, total_weight = ?, status = ?, created_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt || oldInventory.created_at, id);
    logHistory('UPDATE', 'INVENTORY', id, batchCode, `Inventory updated`, oldInventory, { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

app.delete('/inventory/:id', (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Item not found' });
    const result = db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
    logHistory('DELETE', 'INVENTORY', id, existing.batch_code, `Inventory deleted`, existing, null);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

/* ==================== STATIC ASSETS (production SPA) ==================== */
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback (let frontend handle client-side routes)
  app.get(/.*/, (req, res, next) => {
    // If request looks like API, skip
    if (req.path.startsWith('/categories') || req.path.startsWith('/inventory') || req.path.startsWith('/packaging') || req.path.startsWith('/varieties') || req.path.startsWith('/history')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Production backend running at http://localhost:${PORT}`);
});
