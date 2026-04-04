import express from "express";
import cors from "cors";
// @ts-ignore - better-sqlite3 lacks types but works fine
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), ".env") });

/* =======================
   DATABASE
======================= */

const DB_PATH = path.join(process.cwd(), "inventory.db");
let db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
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

  CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_history_entity_type ON history(entity_type);
  CREATE INDEX IF NOT EXISTS idx_history_action ON history(action);
`);

// Ensure default Rice category exists
const riceCategory = db.prepare("SELECT id FROM categories WHERE name = 'Rice'").get();
if (!riceCategory) {
  const riceId = randomUUID();
  db.prepare("INSERT INTO categories (id, name, description, currency) VALUES (?, ?, ?, ?)").run(
    riceId,
    "Rice",
    "Rice and rice-based products",
    'PHP'
  );
  console.log("[OK] Default 'Rice' category created");
}

// Ensure default packaging types exist
const defaultPackaging = [
  { name: "Sack", size: 50, unit: "kg", price_per_package: 0, description: "Standard 50kg sack" },
  { name: "Bag", size: 25, unit: "kg", price_per_package: 0, description: "Medium 25kg bag" },
  { name: "Small Bag", size: 10, unit: "kg", price_per_package: 0, description: "Small 10kg bag" },
  { name: "Retail Pack", size: 5, unit: "kg", price_per_package: 0, description: "Retail 5kg pack" }
];

for (const pkg of defaultPackaging) {
  const existing = db.prepare("SELECT id FROM packaging_types WHERE name = ?").get(pkg.name);
  if (!existing) {
    const pkgId = randomUUID();
    db.prepare("INSERT INTO packaging_types (id, name, size, unit, price_per_package, description) VALUES (?, ?, ?, ?, ?, ?)").run(
      pkgId, pkg.name, pkg.size, pkg.unit, pkg.price_per_package || 0, pkg.description
    );
  }
}

// Backfill: add currency column to categories if missing (safe for existing DBs)
try {
  db.prepare("ALTER TABLE categories ADD COLUMN currency TEXT DEFAULT 'PHP'").run();
  console.log('[OK] Added missing categories.currency column (if it did not exist)');
} catch (err) {
  // ignore if column already exists
}

// Backfill: add price_per_package column to packaging_types if missing
try {
  db.prepare("ALTER TABLE packaging_types ADD COLUMN price_per_package REAL DEFAULT 0").run();
  console.log('[OK] Added missing packaging_types.price_per_package column (if it did not exist)');
} catch (err) {
  // ignore if column already exists
}

console.log("[OK] Database ready:", DB_PATH);

/* =======================
   SCHEMA MIGRATIONS / VALIDATION (shared helpers)
   - delegated to backend/dbSchema.ts
======================= */
import { runMigrationsAndBackfills, validateRequiredSchema, SCHEMA_VERSION, getDbUserVersion } from './dbSchema.js';

// Run migrations on startup (safe/idempotent)
try {
  runMigrationsAndBackfills(db);
  const schemaCheck = validateRequiredSchema(db);
  if (!schemaCheck.ok) {
    console.warn('Schema validation warnings on startup — missing items:', schemaCheck.missing);
  }

  const currentVer = getDbUserVersion(db);
  if (currentVer > SCHEMA_VERSION) {
    console.warn(`[WARNING] Database file schema version (${currentVer}) is newer than application schema version (${SCHEMA_VERSION}). This may be incompatible.`);
  }
} catch (err) {
  console.error('Error running startup migrations/validation:', err);
}

/* =======================
   HISTORY HELPER
======================= */

function logHistory(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: 'INVENTORY' | 'CATEGORY' | 'VARIETY' | 'PACKAGING',
  entityId: string,
  entityName: string,
  details?: string,
  oldValues?: any,
  newValues?: any
) {
  try {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO history (id, action, entity_type, entity_id, entity_name, details, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      action,
      entityType,
      entityId,
      entityName,
      details || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null
    );
    console.log(`[LOG] History logged: ${action} ${entityType} - ${entityName}`);
  } catch (err) {
    console.error("[ERROR] Failed to log history:", err);
  }
}

/* =======================
   SERVER
======================= */

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Backend is running");
});

/* ===========================
   HISTORY ENDPOINTS
=========================== */

app.get("/history", (_req, res) => {
  const rows = db.prepare(`
    SELECT * FROM history 
    ORDER BY created_at DESC
    LIMIT 100
  `).all();
  
  console.log(`[GET] /history - Returned ${rows.length} history records`);
  res.json(rows);
});

app.get("/history/:entityType", (req, res) => {
  const { entityType } = req.params;
  const rows = db.prepare(`
    SELECT * FROM history 
    WHERE entity_type = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(entityType.toUpperCase());
  
  console.log(` GET /history/${entityType} - Returned ${rows.length} records`);
  res.json(rows);
});

app.delete("/history/:id", (req, res) => {
  const { id } = req.params;
  
  console.log(" DELETE /history/:id - Deleting history record ID:", id);

  try {
    const result = db.prepare("DELETE FROM history WHERE id = ?").run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: "History record not found" });
    }

    console.log(" History record deleted");
    res.json({ success: true, deleted: result.changes });
  } catch (err: any) {
    console.error(" Error deleting history record:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/history", (_req, res) => {
  console.log(" DELETE /history - Clearing all history");

  try {
    const result = db.prepare("DELETE FROM history").run();

    console.log(`[OK] All history cleared - ${result.changes} records deleted`);
    res.json({ success: true, deleted: result.changes });
  } catch (err: any) {
    console.error("[ERROR] Error clearing history:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ===========================
   CATEGORIES ENDPOINTS
=========================== */

app.get("/categories", (_req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
  const categoriesWithPrices = rows.map((cat: any) => {
    const prices = db.prepare("SELECT packaging_id, price FROM category_packaging_prices WHERE category_id = ?").all(cat.id);
    const packagingPrices: Record<string, number> = {};
    for (const p of prices) packagingPrices[p.packaging_id] = p.price;
    return { ...cat, packagingPrices };
  });
  console.log(`[GET] /categories - Returned ${rows.length} categories (with packaging prices)`);
  res.json(categoriesWithPrices);
});

app.post("/categories", (req, res) => {
  const { name, description, packagingPrices } = req.body;
  const id = randomUUID();
  
  console.log("[ADD] POST /categories - Adding new category:", name);

  try {
    db.prepare(`
      INSERT INTO categories (id, name, description)
      VALUES (?, ?, ?)
    `).run(id, name, description || null);

    // Persist per-category packaging prices (if provided)
    if (packagingPrices && typeof packagingPrices === 'object') {
      for (const [pkgId, price] of Object.entries(packagingPrices)) {
        db.prepare(`INSERT OR REPLACE INTO category_packaging_prices (category_id, packaging_id, price) VALUES (?, ?, ?)`)
          .run(id, pkgId, Number(price) || 0);
      }
    }

    logHistory('CREATE', 'CATEGORY', id, name, `Category "${name}" created`, null, { name, description, packagingPrices });
    
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("[ERROR] Error adding category:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/categories/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, packagingPrices } = req.body;

  console.log("[UPDATE] PUT /categories/:id - Updating category ID:", id);

  try {
    const oldCategory: any = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
    
    if (!oldCategory) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    const result = db.prepare(`
      UPDATE categories
      SET name = ?, description = ?
      WHERE id = ?
    `).run(name, description || null, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    // Replace packaging prices for this category (if provided)
    if (packagingPrices && typeof packagingPrices === 'object') {
      db.prepare('DELETE FROM category_packaging_prices WHERE category_id = ?').run(id);
      for (const [pkgId, price] of Object.entries(packagingPrices)) {
        db.prepare('INSERT INTO category_packaging_prices (category_id, packaging_id, price) VALUES (?, ?, ?)')
          .run(id, pkgId, Number(price) || 0);
      }
    }

    logHistory('UPDATE', 'CATEGORY', id, name, `Category updated from "${oldCategory.name}" to "${name}"`, 
      { name: oldCategory.name, description: oldCategory.description },
      { name, description, packagingPrices }
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("[ERROR] Error updating category:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/categories/:id", (req, res) => {
  const { id } = req.params;

  console.log("[DELETE] DELETE /categories/:id - Deleting category ID:", id);

  try {
    const existing: any = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    const result = db.prepare("DELETE FROM categories WHERE id = ?").run(id);

    logHistory('DELETE', 'CATEGORY', id, existing.name, `Category "${existing.name}" deleted`, 
      { name: existing.name, description: existing.description },
      null
    );

    console.log("[OK] Category deleted, rows affected:", result.changes);
    res.json({ success: true, deleted: result.changes });
  } catch (err: any) {
    console.error("[ERROR] Error deleting category:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ===========================
   VARIETIES ENDPOINTS
=========================== */

app.get("/varieties", (_req, res) => {
  const rows = db.prepare(`
    SELECT 
      v.*,
      c.name as category_name
    FROM varieties v
    LEFT JOIN categories c ON v.category_id = c.id
    ORDER BY c.name, v.name ASC
  `).all();
  
  console.log(`[GET] /varieties - Returned ${rows.length} varieties`);
  res.json(rows);
});

app.post("/varieties", (req, res) => {
  const { categoryId, name, pricePerKg, description } = req.body;
  const id = randomUUID();
  
  console.log("[ADD] POST /varieties - Adding new variety:", name);

  try {
    db.prepare(`
      INSERT INTO varieties (id, category_id, name, price_per_kg, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, categoryId, name, pricePerKg || 0, description || null);

    logHistory('CREATE', 'VARIETY', id, name, `Variety "${name}" created with price ₱${pricePerKg}/kg`, 
      null, 
      { categoryId, name, pricePerKg, description }
    );

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("[ERROR] Error adding variety:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/varieties/:id", (req, res) => {
  const { id } = req.params;
  const { categoryId, name, pricePerKg, description } = req.body;

  console.log("[UPDATE] PUT /varieties/:id - Updating variety ID:", id);

  try {
    const oldVariety: any = db.prepare("SELECT * FROM varieties WHERE id = ?").get(id);
    
    if (!oldVariety) {
      return res.status(404).json({ success: false, error: "Variety not found" });
    }

    const result = db.prepare(`
      UPDATE varieties
      SET category_id = ?, name = ?, price_per_kg = ?, description = ?
      WHERE id = ?
    `).run(categoryId, name, pricePerKg || 0, description || null, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: "Variety not found" });
    }

    logHistory('UPDATE', 'VARIETY', id, name, 
      `Variety "${oldVariety.name}" updated (Price: ₱${oldVariety.price_per_kg} → ₱${pricePerKg})`, 
      { categoryId: oldVariety.category_id, name: oldVariety.name, pricePerKg: oldVariety.price_per_kg, description: oldVariety.description },
      { categoryId, name, pricePerKg, description }
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("[ERROR] Error updating variety:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/varieties/:id", (req, res) => {
  const { id } = req.params;

  console.log("[DELETE] DELETE /varieties/:id - Deleting variety ID:", id);

  try {
    const existing: any = db.prepare("SELECT * FROM varieties WHERE id = ?").get(id);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: "Variety not found" });
    }

    const result = db.prepare("DELETE FROM varieties WHERE id = ?").run(id);

    logHistory('DELETE', 'VARIETY', id, existing.name, 
      `Variety "${existing.name}" deleted (Price: ₱${existing.price_per_kg}/kg)`, 
      { categoryId: existing.category_id, name: existing.name, pricePerKg: existing.price_per_kg, description: existing.description },
      null
    );

    console.log("[OK] Variety deleted, rows affected:", result.changes);
    res.json({ success: true, deleted: result.changes });
  } catch (err: any) {
    console.error("[ERROR] Error deleting variety:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ===========================
   PACKAGING ENDPOINTS
=========================== */

app.get("/packaging", (_req, res) => {
  const rows = db.prepare("SELECT * FROM packaging_types ORDER BY size DESC").all();
  console.log(`[GET] /packaging - Returned ${rows.length} packaging types`);
  res.json(rows);
});

app.post("/packaging", (req, res) => {
  const { name, size, unit, pricePerPackage, description } = req.body;
  const id = randomUUID();
  
  console.log("[ADD] POST /packaging - Adding new packaging:", name);

  try {
    db.prepare(`
      INSERT INTO packaging_types (id, name, size, unit, price_per_package, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, size, unit || 'kg', pricePerPackage || 0, description || null);

    logHistory('CREATE', 'PACKAGING', id, name, `Packaging "${name}" (${size}${unit}) created`, 
      null, 
      { name, size, unit, pricePerPackage, description }
    );

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("[ERROR] Error adding packaging:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/packaging/:id", (req, res) => {
  const { id } = req.params;
  const { name, size, unit, pricePerPackage, description } = req.body;

  console.log("[UPDATE] PUT /packaging/:id - Updating packaging ID:", id);

  try {
    const oldPackaging: any = db.prepare("SELECT * FROM packaging_types WHERE id = ?").get(id);
    
    if (!oldPackaging) {
      return res.status(404).json({ success: false, error: "Packaging not found" });
    }

    const result = db.prepare(`
      UPDATE packaging_types
      SET name = ?, size = ?, unit = ?, price_per_package = ?, description = ?
      WHERE id = ?
    `).run(name, size, unit || 'kg', pricePerPackage || 0, description || null, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: "Packaging not found" });
    }

    logHistory('UPDATE', 'PACKAGING', id, name, 
      `Packaging updated from "${oldPackaging.name}" (${oldPackaging.size}${oldPackaging.unit}) to "${name}" (${size}${unit})`, 
      { name: oldPackaging.name, size: oldPackaging.size, unit: oldPackaging.unit, pricePerPackage: oldPackaging.price_per_package, description: oldPackaging.description },
      { name, size, unit, pricePerPackage, description }
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("[ERROR] Error updating packaging:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/packaging/:id", (req, res) => {
  const { id } = req.params;

  console.log("[DELETE] DELETE /packaging/:id - Deleting packaging ID:", id);

  try {
    const existing: any = db.prepare("SELECT * FROM packaging_types WHERE id = ?").get(id);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: "Packaging not found" });
    }

    const result = db.prepare("DELETE FROM packaging_types WHERE id = ?").run(id);

    logHistory('DELETE', 'PACKAGING', id, existing.name, 
      `Packaging "${existing.name}" (${existing.size}${existing.unit}) deleted`, 
      { name: existing.name, size: existing.size, unit: existing.unit, description: existing.description },
      null
    );

    console.log("[OK] Packaging deleted, rows affected:", result.changes);
    res.json({ success: true, deleted: result.changes });
  } catch (err: any) {
    console.error("[ERROR] Error deleting packaging:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ===========================
   INVENTORY ENDPOINTS
=========================== */

// GET all inventory items
app.get("/inventory", (_req, res) => {
  try {
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
    
    console.log(`[GET] /inventory - Returned ${rows.length} items`);
    res.json(rows);
  } catch (err: any) {
    console.error("[ERROR] Error fetching inventory:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE new inventory item
app.post("/inventory", (req, res) => {
  const {
    batchCode,
    categoryId,
    varietyId,
    packagingId,
    quantityPackages,
    totalWeight,
    status,
    createdAt
  } = req.body;

  const id = randomUUID();
  
  console.log("[ADD] POST /inventory - Adding new item with ID:", id);

  try {
    db.prepare(`
      INSERT INTO inventory (
        id,
        batch_code,
        category_id,
        variety_id,
        packaging_id,
        quantity_packages,
        total_weight,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      batchCode,
      categoryId,
      varietyId,
      packagingId,
      quantityPackages,
      totalWeight,
      status,
      createdAt || new Date().toISOString()
    );

    logHistory('CREATE', 'INVENTORY', id, batchCode, 
      `Inventory "${batchCode}" added: ${quantityPackages} packages (${totalWeight}kg) - ${status}`, 
      null,
      { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt }
    );

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("[ERROR] Error adding inventory:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// UPDATE inventory item
app.put("/inventory/:id", (req, res) => {
  const { id } = req.params;
  const {
    batchCode,
    categoryId,
    varietyId,
    packagingId,
    quantityPackages,
    totalWeight,
    status,
    createdAt
  } = req.body;

  console.log("[UPDATE] PUT /inventory/:id - Updating item ID:", id);

  try {
    const oldInventory: any = db.prepare("SELECT * FROM inventory WHERE id = ?").get(id);
    
    if (!oldInventory) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const result = db.prepare(`
      UPDATE inventory
      SET
        batch_code = ?,
        category_id = ?,
        variety_id = ?,
        packaging_id = ?,
        quantity_packages = ?,
        total_weight = ?,
        status = ?,
        created_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      batchCode,
      categoryId,
      varietyId,
      packagingId,
      quantityPackages,
      totalWeight,
      status,
      createdAt || oldInventory.created_at,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    logHistory('UPDATE', 'INVENTORY', id, batchCode, 
      `Inventory "${batchCode}" updated: Qty ${oldInventory.quantity_packages} → ${quantityPackages} packages, Status: ${oldInventory.status} → ${status}`, 
      { 
        batchCode: oldInventory.batch_code, 
        categoryId: oldInventory.category_id, 
        varietyId: oldInventory.variety_id,
        packagingId: oldInventory.packaging_id,
        quantityPackages: oldInventory.quantity_packages, 
        totalWeight: oldInventory.total_weight, 
        status: oldInventory.status,
        createdAt: oldInventory.created_at
      },
      { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt }
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("[ERROR] Error updating inventory:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE inventory item
app.delete("/inventory/:id", (req, res) => {
  const { id } = req.params;

  console.log("[DELETE] DELETE /inventory/:id - Request to delete ID:", id);

  try {
    const existing: any = db.prepare("SELECT * FROM inventory WHERE id = ?").get(id);
    
    if (!existing) {
      console.error("[ERROR] Item not found with ID:", id);
      return res.status(404).json({ 
        success: false, 
        error: "Item not found"
      });
    }

    const result = db.prepare("DELETE FROM inventory WHERE id = ?").run(id);

    logHistory('DELETE', 'INVENTORY', id, existing.batch_code, 
      `Inventory "${existing.batch_code}" deleted: ${existing.quantity_packages} packages (${existing.total_weight}kg)`, 
      { 
        batchCode: existing.batch_code, 
        categoryId: existing.category_id, 
        varietyId: existing.variety_id,
        packagingId: existing.packaging_id,
        quantityPackages: existing.quantity_packages, 
        totalWeight: existing.total_weight, 
        status: existing.status 
      },
      null
    );

    console.log("[OK] Delete successful, rows affected:", result.changes);
    res.json({ success: true, deleted: result.changes });
  } catch (err: any) {
    console.error("[ERROR] Error deleting inventory:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/* =======================
   GOOGLE AUTH & SYNC ROUTES
======================= */

import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserInfo,
  uploadDatabaseToGoogleDrive,
  downloadDatabaseFromGoogleDrive,
  getBackupFileMetadata,
} from "./googleDrive.js";

// Store tokens in memory (in production, use a database)
const userTokens = new Map<string, any>();

/**
 * GET /auth/google/url - Get Google OAuth authorization URL
 */
app.get("/auth/google/url", (req, res) => {
  try {
    const authUrl = getAuthorizationUrl();
    console.log('[server] /auth/google/url ->', authUrl);
    res.json({ url: authUrl });
  } catch (err: any) {
    console.error("Error getting auth URL:", err);
    res.status(500).json({ error: err.message });
  }
});

// Server-side redirect endpoint (safer than client building the Google URL)
app.get('/auth/google/redirect', (req, res) => {
  try {
    const authUrl = getAuthorizationUrl();
    console.log('[server] Redirecting browser to Google OAuth endpoint');
    res.redirect(authUrl);
  } catch (err: any) {
    console.error('Error redirecting to Google:', err);
    res.status(500).send('Failed to start Google authentication');
  }
});

/**
 * GET /auth/google/callback - Handle OAuth callback from Google
 */
app.get("/auth/google/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`<html><body><h1>Authentication Error</h1><p>${error}</p></body></html>`);
  }

  if (!code) {
    return res.status(400).send(`<html><body><h1>Missing Authorization Code</h1></body></html>`);
  }

  try {
    const tokens = await exchangeCodeForToken(code as string);
    
    if (!tokens.access_token) {
      throw new Error("Failed to obtain access token");
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Store tokens for this user
    userTokens.set(userInfo.email, tokens);

    // Create a simple token string that can be decoded in the browser
    const tokenStr = JSON.stringify({
      access_token: tokens.access_token,
      token_type: tokens.token_type || "Bearer",
      expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
    });

    // URL encode the token
    const encodedToken = encodeURIComponent(tokenStr);

    res.redirect(`http://localhost:5173/?auth_token=${encodedToken}`);
  } catch (err: any) {
    // Log detailed error response from Google (if present)
    console.error('[server] OAuth callback error:', err?.response?.data || err?.message || err);
    const message = err?.response?.data?.error_description || err?.response?.data?.error || err?.message || 'unknown_error';
    res.status(500).send(`<html><body><h1>Authentication Failed</h1><p>${message}</p></body></html>`);
  }
});

/**
 * POST /auth/google/callback - Handle OAuth callback (for manual code entry)
 */
app.post("/auth/google/callback", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code required" });
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    
    if (!tokens.access_token) {
      throw new Error("Failed to obtain access token");
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Store tokens for this user
    userTokens.set(userInfo.email, tokens);

    res.json({
      access_token: tokens.access_token,
      token_type: tokens.token_type || "Bearer",
      expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      scope: "https://www.googleapis.com/auth/drive",
    });
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /auth/user-info - Get authenticated user info
 */
app.get("/auth/user-info", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const accessToken = authHeader.replace("Bearer ", "");

  try {
    const userInfo = await getUserInfo(accessToken);
    res.json(userInfo);
  } catch (err: any) {
    console.error("Error getting user info:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /sync/google-drive - Sync database to Google Drive
 */
app.post("/sync/google-drive", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const accessToken = authHeader.replace("Bearer ", "");

  try {
    console.log("[sync] Starting Google Drive sync...");
    const result = await uploadDatabaseToGoogleDrive(DB_PATH, accessToken);
    
    if (result) {
      console.log("[sync] [OK] Sync successful:", result);
      res.json({
        success: true,
        message: "Database synced to Google Drive",
        fileId: result.fileId,
        fileName: result.name,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error("[sync] [ERROR] Upload returned falsy result");
      res.status(500).json({
        success: false,
        error: "Failed to upload database",
      });
    }
  } catch (err: any) {
    console.error("[sync] [ERROR] Sync error:", err?.message || err);
    console.error("[sync] Full error:", err);
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
});

/**
 * GET /sync/backup-info - Return Drive backup metadata (id, name, modifiedTime, size)
 */
app.get("/sync/backup-info", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Authorization required" });

  const accessToken = authHeader.replace("Bearer ", "");

  try {
    const meta = await getBackupFileMetadata(accessToken);
    if (!meta) return res.status(404).json({ found: false });
    res.json({ found: true, ...meta });
  } catch (err: any) {
    console.error("/sync/backup-info error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});


/**
 * POST /sync/restore - Restore database from Google Drive
 */
app.post("/sync/restore", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const accessToken = authHeader.replace("Bearer ", "");
  const backupPath = path.join(process.cwd(), "inventory-backup.db");

  try {
    // Download from Google Drive
    const success = await downloadDatabaseFromGoogleDrive(accessToken, backupPath);

    if (!success) {
      return res.status(500).json({ success: false, error: "Failed to download backup from Drive" });
    }

    // Use restore helper (creates pre-restore backup, runs migrations and validates schema)
    try {
      // dynamic import to avoid circular issues in some runtimes
      const { restoreDatabaseFromFile } = await import('./dbRestore.js');
      const result = restoreDatabaseFromFile(backupPath, DB_PATH);

      if (!result.success) {
        console.error('[ERROR] Restore failed:', result.message, result.missing || '');
        return res.status(500).json({ success: false, error: result.message || 'Restore failed', missing: result.missing });
      }

      // Re-open database connection and enable foreign keys
      try { db.close(); } catch (closeErr) { /* ignore */ }
      db = new Database(DB_PATH);
      db.pragma('foreign_keys = ON');

      console.log('[OK] Database restored, migrated and re-opened from Drive backup');

      res.json({
        success: true,
        message: "Database restored from Google Drive and validated",
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[ERROR] Restore helper error:', err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  } catch (err: any) {
    console.error("Restore error:", err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * GET /db/download - Download current local DB file
 */
app.get('/db/download', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) return res.status(404).send('Database file not found');
    res.download(DB_PATH, 'inventory.db', (err) => {
      if (err) console.error('Error sending DB file:', err);
    });
  } catch (err: any) {
    console.error('/db/download error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* =======================
   START SERVER
======================= */

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`[RUNNING] Backend running at http://localhost:${PORT}`);
});