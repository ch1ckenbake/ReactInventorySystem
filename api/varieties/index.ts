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
    console.error('[Varieties] Supabase init error:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  addCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    console.error('[Varieties] Supabase not initialized');
    return res.status(503).json({ 
      error: 'Database not configured',
      details: 'SUPABASE_URL or SUPABASE_ANON_KEY not set'
    });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('varieties')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    } catch (error) {
      console.error('[Varieties GET] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      // Convert camelCase to snake_case for database
      const body = req.body;
      const dbPayload = {
        category_id: body.categoryId,
        name: body.name,
        description: body.description,
        packagingPrices: body.packagingPrices || {} // Store as JSONB
      };

      const { data, error } = await supabase
        .from('varieties')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        console.error('[Varieties POST] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('[Varieties POST] Unhandled error:', error);
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

      // Convert camelCase to snake_case for database
      const body = req.body;
      const dbPayload = {
        category_id: body.categoryId,
        name: body.name,
        description: body.description,
        packagingPrices: body.packagingPrices || {} // Store as JSONB
      };

      const { data, error } = await supabase
        .from('varieties')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('[Varieties PUT] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { error } = await supabase
        .from('varieties')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Varieties DELETE] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
