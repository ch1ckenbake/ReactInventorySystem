import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client directly
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[API] Supabase initialized successfully');
  } catch (error) {
    console.error('[API] Failed to initialize Supabase:', error);
  }
} else {
  console.warn('[API] Supabase credentials not found in environment variables');
}

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

  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;
  const method = req.method || 'GET';

  console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

  try {
    // Health check endpoint
    if (pathname === '/api/health') {
      return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'API is running',
        supabaseReady: !!supabase,
        googleClientId: process.env.GOOGLE_CLIENT_ID ? 'set' : 'not set'
      });
    }

    // ============================================
    // AUTHENTICATION ROUTES
    // ============================================

    if (pathname === '/api/auth/google/url' && method === 'GET') {
      console.log('[API] Getting Google auth URL');
      const clientId = process.env.GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.error('[API] Google Client ID not configured');
        return res.status(500).json({ error: 'Google Client ID not configured' });
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
      
      console.log(`[API] Redirect URI: ${redirectUri}`);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/drive&access_type=offline`;
      
      return res.status(200).json({ authUrl, redirectUri });
    }

    // ============================================
    // INVENTORY ROUTES
    // ============================================

    if (pathname === '/api/inventory' && method === 'GET') {
      if (!supabase) {
        console.error('[API] Supabase not available for inventory GET');
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('inventory').select('*');
      if (error) {
        console.error('[API] Inventory fetch error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log(`[API] Fetched ${data?.length || 0} inventory items`);
      return res.status(200).json(data || []);
    }

    if (pathname === '/api/inventory' && method === 'POST') {
      if (!supabase) {
        console.error('[API] Supabase not available for inventory POST');
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('inventory').insert([req.body]).select();
      if (error) {
        console.error('[API] Inventory insert error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('[API] Created inventory item');
      return res.status(201).json(data?.[0] || {});
    }

    // Handle /api/inventory/:id
    const inventoryIdMatch = pathname.match(/^\/api\/inventory\/([^/]+)$/);
    if (inventoryIdMatch) {
      const id = inventoryIdMatch[1];
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
          console.error('[API] Inventory update error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data?.[0] || {});
      }

      if (method === 'DELETE') {
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) {
          console.error('[API] Inventory delete error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ success: true, id });
      }
    }

    // ============================================
    // CATEGORIES ROUTES
    // ============================================

    if (pathname === '/api/categories' && method === 'GET') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('categories').select('*');
      if (error) {
        console.error('[API] Categories fetch error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    }

    if (pathname === '/api/categories' && method === 'POST') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('categories').insert([req.body]).select();
      if (error) {
        console.error('[API] Categories insert error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json(data?.[0] || {});
    }

    // Handle /api/categories/:id
    const categoryIdMatch = pathname.match(/^\/api\/categories\/([^/]+)$/);
    if (categoryIdMatch) {
      const id = categoryIdMatch[1];
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
          console.error('[API] Categories update error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data?.[0] || {});
      }

      if (method === 'DELETE') {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
          console.error('[API] Categories delete error:', error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ success: true, id });
      }
    }

    // ============================================
    // VARIETIES ROUTES
    // ============================================

    if (pathname === '/api/varieties' && method === 'GET') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('varieties').select('*');
      if (error) {
        console.error('[API] Varieties fetch error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    }

    if (pathname === '/api/varieties' && method === 'POST') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('varieties').insert([req.body]).select();
      if (error) {
        console.error('[API] Varieties insert error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json(data?.[0] || {});
    }

    // ============================================
    // PACKAGING ROUTES
    // ============================================

    if (pathname === '/api/packaging' && method === 'GET') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('packaging').select('*');
      if (error) {
        console.error('[API] Packaging fetch error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    }

    if (pathname === '/api/packaging' && method === 'POST') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('packaging').insert([req.body]).select();
      if (error) {
        console.error('[API] Packaging insert error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json(data?.[0] || {});
    }

    // ============================================
    // HISTORY ROUTES
    // ============================================

    if (pathname === '/api/history' && method === 'GET') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('history').select('*');
      if (error) {
        console.error('[API] History fetch error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    }

    if (pathname === '/api/history' && method === 'POST') {
      if (!supabase) {
        return res.status(503).json({ error: 'Database not configured' });
      }

      const { data, error } = await supabase.from('history').insert([req.body]).select();
      if (error) {
        console.error('[API] History insert error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json(data?.[0] || {});
    }

    // 404 - Unknown endpoint
    console.warn(`[API] 404 - Unknown endpoint: ${pathname}`);
    return res.status(404).json({ 
      error: 'Endpoint not found', 
      path: pathname,
      method: method,
      availableEndpoints: [
        '/api/health',
        '/api/auth/google/url',
        '/api/inventory',
        '/api/categories'
      ]
    });

  } catch (error) {
    console.error('[API] Unhandled error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
