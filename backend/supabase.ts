import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = 'https://ikzajcuqqjnvowmbawgr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTAzMzcsImV4cCI6MjA5MDUyNjMzN30.6OfD5s71ZF2BlBT_UWEpzDAsO3R9ROXvAjJq_LHhgm0';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1MDMzNywiZXhwIjoyMDkwNTI2MzM3fQ.CrdYmIm_HceDhADzImfPJxmmcl6dIRWxc0leRAtb4UY';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const supabaseUrl_config = supabaseUrl;
export const supabaseAnonKey_config = supabaseAnonKey;

/**
 * Initialize database schema and default data
 * This runs once on server startup
 */
export async function initializeSupabaseSchema() {
  try {
    console.log('[Supabase] Initializing schema...');

    // Tables are created directly in Supabase dashboard or via migrations
    // But we can verify they exist

    // Ensure default Rice category exists
    try {
      const { data: riceCategory, error } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Rice')
        .single();

      if (error || !riceCategory) {
        console.log('[Supabase] Creating default Rice category...');
        await supabase
          .from('categories')
          .insert({
            name: 'Rice',
            description: 'Rice and rice-based products',
            currency: 'PHP'
          });
      }
    } catch (err) {
      console.log('[Supabase] Could not verify Rice category:', err);
    }

    // Ensure default packaging types exist
    const defaultPackaging = [
      { name: 'Sack', size: 50, unit: 'kg', description: 'Standard 50kg sack' },
      { name: 'Bag', size: 25, unit: 'kg', description: 'Medium 25kg bag' },
      { name: 'Small Bag', size: 10, unit: 'kg', description: 'Small 10kg bag' },
      { name: 'Retail Pack', size: 5, unit: 'kg', description: 'Retail 5kg pack' }
    ];

    for (const pkg of defaultPackaging) {
      try {
        const { data: existing, error } = await supabase
          .from('packaging_types')
          .select('id')
          .eq('name', pkg.name)
          .single();

        if (error || !existing) {
          await supabase
            .from('packaging_types')
            .insert(pkg);
        }
      } catch (err) {
        console.log(`[Supabase] Could not verify packaging ${pkg.name}:`, err);
      }
    }

    console.log('[Supabase] Schema initialization complete');
  } catch (err) {
    console.error('[Supabase] Schema initialization error:', err);
    throw err;
  }
}

export default supabase;
