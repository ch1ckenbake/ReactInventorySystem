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
    console.error('[Packaging] Supabase init error:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    console.error('[Packaging] Supabase not initialized');
    return res.status(503).json({ 
      error: 'Database not configured',
      details: 'SUPABASE_URL or SUPABASE_ANON_KEY not set'
    });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('packaging_types')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    } catch (error) {
      console.error('[Packaging GET] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { data, error } = await supabase
        .from('packaging_types')
        .insert([req.body])
        .select()
        .single();

      if (error) {
        console.error('[Packaging POST] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('[Packaging POST] Unhandled error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { data, error } = await supabase
        .from('packaging_types')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Packaging PUT] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('[Packaging PUT] Unhandled error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { error } = await supabase
        .from('packaging_types')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Packaging DELETE] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
