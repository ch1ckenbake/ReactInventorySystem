// @ts-ignore - better-sqlite3 lacks types but works fine
// @ts-ignore - better-sqlite3 lacks types but works fine
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export const SCHEMA_VERSION = 1; // bump when schema changes

export function tableExists(db: any, tableName: string) {
  const row: any = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
  return !!row;
}

export function columnExists(db: any, tableName: string, columnName: string) {
  try {
    const cols: any[] = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return cols.some(c => c.name === columnName);
  } catch (err) {
    return false;
  }
}

/**
 * Idempotent migrations and backfills that bring older DBs up to the expected schema.
 * Always safe to run on startup or immediately after a DB file replace (restore).
 */
export function runMigrationsAndBackfills(db: any) {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS category_packaging_prices (
        category_id TEXT NOT NULL,
        packaging_id TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (category_id, packaging_id),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (packaging_id) REFERENCES packaging_types(id) ON DELETE CASCADE
      )
    `).run();
  } catch (err) {
    console.warn('runMigrations: could not ensure category_packaging_prices table', err);
  }

  try {
    db.prepare("ALTER TABLE categories ADD COLUMN currency TEXT DEFAULT 'PHP'").run();
  } catch (err) {
    // ignore if column exists
  }

  try {
    db.prepare("ALTER TABLE packaging_types ADD COLUMN price_per_package REAL DEFAULT 0").run();
  } catch (err) {
    // ignore if column exists
  }

  // Ensure default packaging types exist (idempotent)
  const defaultPackaging = [
    { name: "Sack", size: 50, unit: "kg", price_per_package: 0, description: "Standard 50kg sack" },
    { name: "Bag", size: 25, unit: "kg", price_per_package: 0, description: "Medium 25kg bag" },
    { name: "Small Bag", size: 10, unit: "kg", price_per_package: 0, description: "Small 10kg bag" },
    { name: "Retail Pack", size: 5, unit: "kg", price_per_package: 0, description: "Retail 5kg pack" }
  ];

  for (const pkg of defaultPackaging) {
    try {
      const existing = db.prepare("SELECT id FROM packaging_types WHERE name = ?").get(pkg.name);
      if (!existing) {
        const pkgId = randomUUID();
        db.prepare("INSERT INTO packaging_types (id, name, size, unit, price_per_package, description) VALUES (?, ?, ?, ?, ?, ?)")
          .run(pkgId, pkg.name, pkg.size, pkg.unit, pkg.price_per_package || 0, pkg.description);
      }
    } catch (err) {
      console.warn('runMigrations: failed to ensure default packaging', pkg.name, err);
    }
  }

  // After successful backfills/migrations, set DB user_version so we can detect compatibility later
  try {
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  } catch (err) {
    // ignore non-critical error
  }
}

export function validateRequiredSchema(db: any) {
  const missing: string[] = [];

  if (!tableExists(db, 'categories')) missing.push('categories table');
  if (!tableExists(db, 'packaging_types')) missing.push('packaging_types table');
  if (!tableExists(db, 'category_packaging_prices')) missing.push('category_packaging_prices table');

  if (!columnExists(db, 'packaging_types', 'price_per_package')) missing.push('packaging_types.price_per_package column');
  if (!columnExists(db, 'categories', 'currency')) missing.push('categories.currency column');

  return { ok: missing.length === 0, missing };
}

export function getDbUserVersion(db: any): number {
  try {
    // better-sqlite3 returns the raw value for simple pragmas
    const v = db.pragma('user_version');
    return typeof v === 'number' ? v : Number(v) || 0;
  } catch (err) {
    return 0;
  }
}

export function isSchemaCompatible(db: any): { compatible: boolean; currentVersion: number; expectedVersion: number } {
  const currentVersion = getDbUserVersion(db);
  return { compatible: currentVersion <= SCHEMA_VERSION, currentVersion, expectedVersion: SCHEMA_VERSION };
}
