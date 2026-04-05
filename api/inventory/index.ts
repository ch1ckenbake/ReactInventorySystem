import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Add CORS headers helper
function addCorsHeaders(res: VercelResponse, req?: VercelRequest) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req?.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

// Initialize Supabase safely
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('[Inventory] Supabase init error:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    console.error('[Inventory] Supabase not initialized');
    return res.status(503).json({ 
      error: 'Database not configured',
      details: 'SUPABASE_URL or SUPABASE_ANON_KEY not set'
    });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('[Inventory GET] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { data, error } = await supabase
        .from('inventory')
        .insert([req.body])
        .select()
        .single();

      if (error) {
        console.error('[Inventory POST] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { data, error } = await supabase
        .from('inventory')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Inventory PUT] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Inventory DELETE] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Inventory] Unhandled error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
