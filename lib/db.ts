import { sql } from '@vercel/postgres';

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export async function initializeDatabase() {
  try {
    // Create categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        currency TEXT NOT NULL DEFAULT 'PHP',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create varieties table
    await sql`
      CREATE TABLE IF NOT EXISTS varieties (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price_per_kg REAL NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(category_id, name)
      )
    `;

    // Create packaging_types table
    await sql`
      CREATE TABLE IF NOT EXISTS packaging_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        size REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        price_per_package REAL NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create category_packaging_prices table
    await sql`
      CREATE TABLE IF NOT EXISTS category_packaging_prices (
        category_id TEXT NOT NULL,
        packaging_id TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (category_id, packaging_id),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (packaging_id) REFERENCES packaging_types(id) ON DELETE CASCADE
      )
    `;

    // Create inventory table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        batch_code TEXT NOT NULL UNIQUE,
        category_id TEXT NOT NULL,
        variety_id TEXT NOT NULL,
        packaging_id TEXT NOT NULL,
        quantity_packages INTEGER NOT NULL,
        total_weight REAL NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (variety_id) REFERENCES varieties(id),
        FOREIGN KEY (packaging_id) REFERENCES packaging_types(id)
      )
    `;

    // Create history table
    await sql`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        details TEXT,
        old_values TEXT,
        new_values TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_history_entity_type ON history(entity_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_history_action ON history(action)`;

    // Ensure default Rice category exists
    const riceCheck = await sql`SELECT id FROM categories WHERE name = 'Rice' LIMIT 1`;
    if (!riceCheck.rows.length) {
      await sql`INSERT INTO categories (id, name, description, currency) VALUES ('rice-default', 'Rice', 'Default rice category', 'PHP')`;
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export { sql };
