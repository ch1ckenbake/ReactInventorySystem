import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
let db = null;

async function initDb() {
  db = await open({
    filename: path.join(__dirname, '../inventory.db'),
    driver: sqlite3.Database
  });
  await db.exec('PRAGMA foreign_keys = ON');
}

// API endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const result = await db.all('SELECT * FROM categories');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, currency } = req.body;
    const id = Date.now().toString();
    await db.run(
      'INSERT INTO categories (id, name, description, currency) VALUES (?, ?, ?, ?)',
      [id, name, description, currency || 'PHP']
    );
    res.status(201).json({ id, name, description, currency: currency || 'PHP' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/varieties', async (req, res) => {
  try {
    const result = await db.all('SELECT * FROM varieties');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/varieties', async (req, res) => {
  try {
    const { category_id, name, price_per_kg, description } = req.body;
    const id = Date.now().toString();
    await db.run(
      'INSERT INTO varieties (id, category_id, name, price_per_kg, description) VALUES (?, ?, ?, ?, ?)',
      [id, category_id, name, price_per_kg || 0, description]
    );
    res.status(201).json({ id, category_id, name, price_per_kg: price_per_kg || 0, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/packaging', async (req, res) => {
  try {
    const result = await db.all('SELECT * FROM packaging_types');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/packaging', async (req, res) => {
  try {
    const { name, size, unit, price_per_package, description } = req.body;
    const id = Date.now().toString();
    await db.run(
      'INSERT INTO packaging_types (id, name, size, unit, price_per_package, description) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, size, unit || 'kg', price_per_package || 0, description]
    );
    res.status(201).json({ id, name, size, unit: unit || 'kg', price_per_package: price_per_package || 0, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const result = await db.all('SELECT * FROM inventory');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { batch_code, category_id, variety_id, packaging_id, quantity_packages, total_weight, status } = req.body;
    const id = Date.now().toString();
    await db.run(
      'INSERT INTO inventory (id, batch_code, category_id, variety_id, packaging_id, quantity_packages, total_weight, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, batch_code, category_id, variety_id, packaging_id, quantity_packages, total_weight, status]
    );
    res.status(201).json({ id, batch_code, category_id, variety_id, packaging_id, quantity_packages, total_weight, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const result = await db.all('SELECT * FROM history ORDER BY created_at DESC');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Connected to database at ${path.join(__dirname, '../inventory.db')}`);
});
