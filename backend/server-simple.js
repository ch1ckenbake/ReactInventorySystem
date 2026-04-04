import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Simple in-memory database (resets on server restart)
const db = {
  categories: [],
  varieties: [],
  packaging_types: [],
  inventory: [],
  history: []
};

// API endpoints
app.get('/api/categories', (req, res) => {
  res.json(db.categories);
});

app.post('/api/categories', (req, res) => {
  const newCategory = { id: Date.now().toString(), ...req.body, created_at: new Date() };
  db.categories.push(newCategory);
  res.status(201).json(newCategory);
});

app.get('/api/varieties', (req, res) => {
  res.json(db.varieties);
});

app.post('/api/varieties', (req, res) => {
  const newVariety = { id: Date.now().toString(), ...req.body, created_at: new Date() };
  db.varieties.push(newVariety);
  res.status(201).json(newVariety);
});

app.get('/api/packaging', (req, res) => {
  res.json(db.packaging_types);
});

app.post('/api/packaging', (req, res) => {
  const newPackaging = { id: Date.now().toString(), ...req.body, created_at: new Date() };
  db.packaging_types.push(newPackaging);
  res.status(201).json(newPackaging);
});

app.get('/api/inventory', (req, res) => {
  res.json(db.inventory);
});

app.post('/api/inventory', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body, created_at: new Date() };
  db.inventory.push(newItem);
  res.status(201).json(newItem);
});

app.get('/api/history', (req, res) => {
  res.json(db.history);
});

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
