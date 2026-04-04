import fs from 'fs';
import path from 'path';
// @ts-ignore - better-sqlite3 lacks types but works fine
import Database from 'better-sqlite3';
import { restoreDatabaseFromFile } from './dbRestore.js';

const workspace = process.cwd();
const originalDb = path.join(workspace, 'inventory.db');
const testDb = path.join(workspace, 'inventory.test.db');
const badBackup = path.join(workspace, 'bad-backup.db');
const goodBackup = path.join(workspace, 'good-backup.db');

function ensureFile(src: string) {
  if (!fs.existsSync(src)) throw new Error(`Required file not found: ${src}`);
}

(async () => {
  console.log('Running restore tests (backend)...');

  ensureFile(originalDb);

  // Prepare test DB (copy original)
  fs.copyFileSync(originalDb, testDb);

  // Prepare a good backup (copy of original)
  fs.copyFileSync(originalDb, goodBackup);

  // Prepare a BAD backup: copy original then drop a required table
  fs.copyFileSync(originalDb, badBackup);
  const badDb = new Database(badBackup);
  try {
    // disable foreign key enforcement while we corrupt the schema for testing
    badDb.pragma('foreign_keys = OFF');
    badDb.prepare('DROP TABLE IF EXISTS category_packaging_prices').run();
    badDb.prepare('DROP TABLE IF EXISTS packaging_types').run();
    badDb.pragma('foreign_keys = ON');
  } finally {
    badDb.close();
  }

  // Sanity: test DB initially has categories table
  const before = new Database(testDb);
  try {
    const row = before.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get();
    if (!row) throw new Error('Sanity check failed: test DB does not contain categories table');
  } finally {
    before.close();
  }

  // 1) Attempt restore using BAD backup -> should fail and testDb must remain valid (rollback performed)
  const resBad = restoreDatabaseFromFile(badBackup, testDb);
  if (resBad.success) throw new Error('Expected restore to fail for bad backup, but it succeeded');

  const afterBad = new Database(testDb);
  try {
    const row = afterBad.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get();
    if (!row) throw new Error('Rollback failed: categories table missing after failed restore');
  } finally {
    afterBad.close();
  }

  console.log('[OK] Bad-backup restore correctly failed and rollback kept the original DB');

  // 2) Attempt restore using GOOD backup -> should succeed
  const resGood = restoreDatabaseFromFile(goodBackup, testDb);
  if (!resGood.success) throw new Error(`Expected good restore to succeed but it failed: ${resGood.message}`);

  const afterGood = new Database(testDb);
  try {
    const row = afterGood.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get();
    if (!row) throw new Error('Restore failed: categories table missing after good restore');
  } finally {
    afterGood.close();
  }

  console.log('[OK] Good-backup restore succeeded and DB validated');

  // Cleanup test artifacts
  [testDb, badBackup, goodBackup].forEach(f => { try { fs.unlinkSync(f); } catch (e) { /* ignore */ } });

  console.log('All restore tests passed.');
  process.exit(0);
})().catch(err => {
  console.error('Restore tests failed:', err);
  process.exit(1);
});
