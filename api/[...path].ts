import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client directly
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { pathname } = new URL(req.url || '/', 'http://localhost');
  const method = req.method || 'GET';

  console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

  try {
    // Health check endpoint
    if (pathname === '/api/health' || pathname === '/health') {
      return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'API is running',
        supabaseConnected: !!supabase
      });
    }

    // ============================================
    // AUTHENTICATION ROUTES
    // ============================================

    if (pathname === '/api/auth/google/url') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: 'Google Client ID not configured' });
      }

      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost';
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/drive&access_type=offline`;
      
      return res.status(200).json({ authUrl, redirectUri });
    }

    // ============================================
    // INVENTORY ROUTES
    // ============================================

    if (pathname === '/api/inventory') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      if (method === 'GET') {
        const { data, error } = await supabase.from('inventory').select('*');
        if (error) {
          console.error('Inventory fetch error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data || []);
      }

      if (method === 'POST') {
        const { data, error } = await supabase.from('inventory').insert([req.body]).select();
        if (error) {
          console.error('Inventory insert error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(201).json(data?.[0] || {});
      }
    }

    if (pathname.match(/^\/api\/inventory\/[^/]+$/)) {
      const id = pathname.split('/').pop();
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      if (method === 'PUT') {
        const { data, error } = await supabase
          .from('inventory')
          .update(req.body)
          .eq('id', id)
          .select();
        if (error) {
          console.error('Inventory update error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data?.[0] || {});
      }

      if (method === 'DELETE') {
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) {
          console.error('Inventory delete error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ success: true, id });
      }
    }

    // ============================================
    // CATEGORIES ROUTES
    // ============================================

    if (pathname === '/api/categories') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      if (method === 'GET') {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) {
          console.error('Categories fetch error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data || []);
      }

      if (method === 'POST') {
        const { data, error } = await supabase.from('categories').insert([req.body]).select();
        if (error) {
          console.error('Categories insert error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(201).json(data?.[0] || {});
      }
    }

    if (pathname.match(/^\/api\/categories\/[^/]+$/)) {
      const id = pathname.split('/').pop();
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      if (method === 'PUT') {
        const { data, error } = await supabase
          .from('categories')
          .update(req.body)
          .eq('id', id)
          .select();
        if (error) {
          console.error('Categories update error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data?.[0] || {});
      }

      if (method === 'DELETE') {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
          console.error('Categories delete error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ success: true, id });
      }
    }

    // 404 - Unknown endpoint
    return res.status(404).json({ error: 'Endpoint not found', path: pathname });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
