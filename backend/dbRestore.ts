import fs from 'fs';
// @ts-ignore - better-sqlite3 lacks types but works fine
// @ts-ignore - better-sqlite3 lacks types but works fine
import Database from 'better-sqlite3';
import path from 'path';
import { runMigrationsAndBackfills, validateRequiredSchema, SCHEMA_VERSION, getDbUserVersion } from './dbSchema.js';

export type RestoreResult = {
  success: boolean;
  message?: string;
  missing?: string[];
  preRestoreBackupPath?: string;
};

/**
 * Restore a local DB file from the provided backup file path.
 * - creates a pre-restore backup of the current DB (if present)
 * - replaces the DB file with the provided backup
 * - re-opens DB, runs migrations/backfills and validates schema
 * - on failure, attempts rollback to pre-restore backup
 */
export function restoreDatabaseFromFile(backupPath: string, dbPath: string): RestoreResult {
  if (!fs.existsSync(backupPath)) {
    return { success: false, message: `Backup file not found: ${backupPath}` };
  }

  const preRestoreBackup = `${dbPath}.pre-restore-${Date.now()}.bak`;
  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, preRestoreBackup);
    }
  } catch (bkErr) {
    // continue even if pre-restore backup could not be created
    console.warn('Could not create pre-restore backup:', bkErr);
  }

  try {
    // Replace DB file
    fs.copyFileSync(backupPath, dbPath);

    // Re-open and validate
    let tmpDb: any | null = null;
    try {
      tmpDb = new Database(dbPath);
      tmpDb.pragma('foreign_keys = ON');

      // Run post-restore migrations/backfills and set user_version
      runMigrationsAndBackfills(tmpDb);

      const schemaCheck = validateRequiredSchema(tmpDb);
      if (!schemaCheck.ok) {
        try { tmpDb.close(); } catch (e) { /* ignore */ }
        // rollback
        if (fs.existsSync(preRestoreBackup)) {
          fs.copyFileSync(preRestoreBackup, dbPath);
        }
        return { success: false, message: 'Restored DB incompatible with current app schema; rollback performed', missing: schemaCheck.missing, preRestoreBackupPath: preRestoreBackup };
      }

      // Optionally verify user_version is set and compatible
      const ver = getDbUserVersion(tmpDb);
      if (ver > SCHEMA_VERSION) {
        try { tmpDb.close(); } catch (e) { /* ignore */ }
        if (fs.existsSync(preRestoreBackup)) fs.copyFileSync(preRestoreBackup, dbPath);
        return { success: false, message: `Restored DB schema version (${ver}) is newer than app schema version (${SCHEMA_VERSION}); rollback performed`, preRestoreBackupPath: preRestoreBackup };
      }

      try { tmpDb.close(); } catch (e) { /* ignore */ }

      return { success: true, message: 'Database restored and validated', preRestoreBackupPath: preRestoreBackup };
    } catch (reopenErr) {
      try { if (tmpDb) tmpDb.close(); } catch (e) { /* ignore */ }
      // rollback
      if (fs.existsSync(preRestoreBackup)) {
        fs.copyFileSync(preRestoreBackup, dbPath);
      }
      return { success: false, message: `Failed to open/migrate restored DB: ${reopenErr}` };
    }
  } catch (replaceErr) {
    // attempt rollback
    if (fs.existsSync(preRestoreBackup)) {
      try { fs.copyFileSync(preRestoreBackup, dbPath); } catch (e) { /* ignore */ }
    }
    return { success: false, message: `Error replacing DB file during restore: ${replaceErr}` };
  }
}
