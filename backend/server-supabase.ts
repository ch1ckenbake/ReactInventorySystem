import express, { Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { supabase, initializeSupabaseSchema } from './supabase.js';
import {
  exchangeCodeForToken,
  getUserInfo,
} from "./googleDrive.js";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Store tokens in memory (in production, use a database)
const userTokens = new Map<string, any>();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase schema on startup
initializeSupabaseSchema().catch((err) => {
  console.error('Failed to initialize Supabase schema:', err);
  process.exit(1);
});

/* =====================
   HISTORY HELPER
===================== */

async function logHistory(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: 'INVENTORY' | 'CATEGORY' | 'VARIETY' | 'PACKAGING',
  entityId: string,
  entityName: string,
  details?: string,
  oldValues?: any,
  newValues?: any,
  createdByEmail?: string | null
) {
  try {
    await supabase.from('history').insert({
      id: randomUUID(),
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details: details || null,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      created_at: new Date().toISOString(),
      created_by_email: createdByEmail || null
    });
  } catch (err) {
    console.error('[ERROR] Failed to log history:', err);
  }
}

/* =====================
   VERIFIED ACCOUNTS ROUTES
===================== */

app.get('/api/verified-accounts', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('verified_accounts')
      .select('email')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json((data || []).map((row: any) => row.email));
  } catch (err) {
    console.error('Error fetching verified accounts:', err);
    res.status(500).json({ error: 'Failed to fetch verified accounts' });
  }
});

app.get('/api/verified-accounts/check', async (req: Request, res: Response) => {
  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const { data, error } = await supabase
      .from('verified_accounts')
      .select('id')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ verified: !!data });
  } catch (err) {
    console.error('Error checking verified account:', err);
    res.status(500).json({ error: 'Failed to check verified account' });
  }
});

app.post('/api/verified-accounts', async (req: Request, res: Response) => {
  const email = (req.body.email as string || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { error } = await supabase
      .from('verified_accounts')
      .insert({ email });

    if (error) throw error;
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating verified account:', err);
    res.status(500).json({ error: 'Failed to create verified account' });
  }
});

app.delete('/api/verified-accounts', async (req: Request, res: Response) => {
  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { error } = await supabase
      .from('verified_accounts')
      .delete()
      .eq('email', email);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting verified account:', err);
    res.status(500).json({ error: 'Failed to delete verified account' });
  }
});

/* =====================
   CATEGORIES ROUTES
===================== */

app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req: Request, res: Response) => {
  try {
    const { name, description, currency } = req.body;
    const id = randomUUID();

    const { error } = await supabase
      .from('categories')
      .insert({
        id,
        name,
        description: description || null,
        currency: currency || 'PHP',
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    await logHistory('CREATE', 'CATEGORY', id, name, JSON.stringify({ description, currency }));

    res.json({ id, name, description, currency });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, currency, packagingPrices } = req.body;

    // Get old values for history
    const { data: oldCategory } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('categories')
      .update({
        name,
        description: description || null,
        currency: currency || 'PHP'
      })
      .eq('id', id);

    if (error) throw error;

    await logHistory('UPDATE', 'CATEGORY', id, name, 'Category updated', oldCategory, { name, description, currency });

    res.json({ id, name, description, currency });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logHistory('DELETE', 'CATEGORY', id, category?.name || 'Unknown');

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/* =====================
   VARIETIES ROUTES
===================== */

app.get('/api/varieties', async (req: Request, res: Response) => {
  try {
    const { data: varieties, error } = await supabase
      .from('varieties')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Attach packaging prices for each variety
    const varietiesWithPrices = await Promise.all(
      (varieties || []).map(async (variety: any) => {
        const { data: prices } = await supabase
          .from('variety_packaging_prices')
          .select('packaging_id, price')
          .eq('variety_id', variety.id);
        
        const packagingPrices: Record<string, number> = {};
        for (const p of prices || []) {
          packagingPrices[p.packaging_id] = p.price;
        }
        return { ...variety, packagingPrices };
      })
    );

    res.json(varietiesWithPrices);
  } catch (err) {
    console.error('Error fetching varieties:', err);
    res.status(500).json({ error: 'Failed to fetch varieties' });
  }
});

app.post('/api/varieties', async (req: Request, res: Response) => {
  try {
    const { categoryId, name, description, packagingPrices } = req.body;
    const id = randomUUID();

    const { error } = await supabase
      .from('varieties')
      .insert({
        id,
        category_id: categoryId,
        name,
        description: description || null,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    // Insert packaging prices if provided
    if (packagingPrices && Object.keys(packagingPrices).length > 0) {
      const priceRecords = Object.entries(packagingPrices).map(([packagingId, price]) => ({
        variety_id: id,
        packaging_id: packagingId,
        price: price || 0
      }));

      await supabase
        .from('variety_packaging_prices')
        .insert(priceRecords);
    }

    await logHistory('CREATE', 'VARIETY', id, name);

    res.json({ id, categoryId, name, description, packagingPrices });
  } catch (err) {
    console.error('Error creating variety:', err);
    res.status(500).json({ error: 'Failed to create variety' });
  }
});

app.put('/api/varieties/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId, name, description, packagingPrices } = req.body;

    const { data: oldVariety } = await supabase
      .from('varieties')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('varieties')
      .update({
        category_id: categoryId,
        name,
        description: description || null
      })
      .eq('id', id);

    if (error) throw error;

    // Update packaging prices if provided
    if (packagingPrices && typeof packagingPrices === 'object') {
      // Delete old prices
      await supabase
        .from('variety_packaging_prices')
        .delete()
        .eq('variety_id', id);

      // Insert new prices
      const priceRecords = Object.entries(packagingPrices).map(([packagingId, price]) => ({
        variety_id: id,
        packaging_id: packagingId,
        price: price || 0
      }));

      if (priceRecords.length > 0) {
        await supabase
          .from('variety_packaging_prices')
          .insert(priceRecords);
      }
    }

    await logHistory('UPDATE', 'VARIETY', id, name, 'Variety updated', oldVariety, { categoryId, name, description, packagingPrices });

    res.json({ id, categoryId, name, description, packagingPrices });
  } catch (err) {
    console.error('Error updating variety:', err);
    res.status(500).json({ error: 'Failed to update variety' });
  }
});

app.delete('/api/varieties/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: variety } = await supabase
      .from('varieties')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('varieties')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logHistory('DELETE', 'VARIETY', id, variety?.name || 'Unknown');

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting variety:', err);
    res.status(500).json({ error: 'Failed to delete variety' });
  }
});

/* =====================
   PACKAGING ROUTES
===================== */

app.get('/api/packaging', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('packaging_types')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching packaging types:', err);
    res.status(500).json({ error: 'Failed to fetch packaging types' });
  }
});

app.post('/api/packaging', async (req: Request, res: Response) => {
  try {
    const { name, size, unit, description } = req.body;
    const id = randomUUID();

    const { error } = await supabase
      .from('packaging_types')
      .insert({
        id,
        name,
        size,
        unit: unit || 'kg',
        description: description || null,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    await logHistory('CREATE', 'PACKAGING', id, name);

    res.json({ id, name, size, unit, description });
  } catch (err) {
    console.error('Error creating packaging type:', err);
    res.status(500).json({ error: 'Failed to create packaging type' });
  }
});

app.put('/api/packaging/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, size, unit, description } = req.body;

    const { data: oldPackaging } = await supabase
      .from('packaging_types')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('packaging_types')
      .update({
        name,
        size,
        unit: unit || 'kg',
        description: description || null
      })
      .eq('id', id);

    if (error) throw error;

    await logHistory('UPDATE', 'PACKAGING', id, name, 'Packaging updated', oldPackaging, { name, size, unit, description });

    res.json({ id, name, size, unit, description });
  } catch (err) {
    console.error('Error updating packaging type:', err);
    res.status(500).json({ error: 'Failed to update packaging type' });
  }
});

app.delete('/api/packaging/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: packaging } = await supabase
      .from('packaging_types')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('packaging_types')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logHistory('DELETE', 'PACKAGING', id, packaging?.name || 'Unknown');

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting packaging type:', err);
    res.status(500).json({ error: 'Failed to delete packaging type' });
  }
});

/* =====================
   INVENTORY ROUTES
===================== */

app.get('/api/inventory', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        id,
        batch_code,
        category_id,
        variety_id,
        packaging_id,
        quantity_packages,
        total_weight,
        status,
        created_at,
        updated_at,
        categories(name),
        varieties(name),
        packaging_types(name, size, unit)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform the nested data into flat structure for frontend
    const transformed = (data || []).map((item: any) => ({
      id: item.id,
      batch_code: item.batch_code,
      category_id: item.category_id,
      category_name: item.categories?.name,
      variety_id: item.variety_id,
      variety_name: item.varieties?.name,
      packaging_id: item.packaging_id,
      packaging_name: item.packaging_types?.name,
      packaging_size: item.packaging_types?.size,
      packaging_unit: item.packaging_types?.unit,
      quantity_packages: item.quantity_packages,
      total_weight: item.total_weight,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
    
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.post('/api/inventory', async (req: Request, res: Response) => {
  try {
    const { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status } = req.body;
    const id = randomUUID();

    const { error } = await supabase
      .from('inventory')
      .insert({
        id,
        batch_code: batchCode,
        category_id: categoryId,
        variety_id: varietyId,
        packaging_id: packagingId,
        quantity_packages: quantityPackages,
        total_weight: totalWeight,
        status: status || 'In Stock',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    await logHistory('CREATE', 'INVENTORY', id, batchCode, JSON.stringify({ categoryId, varietyId, packagingId }));

    res.json({ id, batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status });
  } catch (err) {
    console.error('Error creating inventory item:', err);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

app.put('/api/inventory/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status } = req.body;

    const { data: oldItem } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single();

    const updateData: any = {
      batch_code: batchCode,
      category_id: categoryId,
      variety_id: varietyId,
      packaging_id: packagingId,
      quantity_packages: quantityPackages,
      total_weight: totalWeight,
      status: status || 'In Stock',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('inventory')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    await logHistory('UPDATE', 'INVENTORY', id, batchCode, 'Inventory updated', oldItem, { batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status });

    res.json({ id, batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status });
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

app.delete('/api/inventory/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: item } = await supabase
      .from('inventory')
      .select('batch_code')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logHistory('DELETE', 'INVENTORY', id, item?.batch_code || 'Unknown');

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

/* =====================
   HISTORY ROUTES
===================== */

app.get('/api/history', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/* =====================
   HEALTH CHECK
===================== */

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('categories').select('count(*)').limit(1);
    
    if (error) {
      res.status(503).json({ status: 'error', message: 'Database unavailable' });
    } else {
      res.json({ status: 'ok', message: 'Server is running' });
    }
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

/* =====================
   GOOGLE OAUTH ENDPOINTS
===================== */

// Get Google OAuth URL
app.get('/api/auth/google/url', (req: Request, res: Response) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback';
    
    if (!clientId) {
      console.error('[ERROR] Google Client ID not configured in environment');
      return res.status(400).json({ error: 'Google Client ID not configured' });
    }

    const scope = encodeURIComponent('openid email profile');
    const responseType = 'code';
    const accessType = 'offline';
    const promptType = 'consent';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${scope}&access_type=${accessType}&prompt=${promptType}`;

    res.json({ authUrl });
  } catch (err) {
    console.error('[ERROR] Failed to get Google OAuth URL:', err);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

app.get('/api/auth/user-info', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[user-info] Google userinfo fetch failed', response.status, response.statusText);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userData = await response.json();
    return res.json({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
    });
  } catch (err: any) {
    console.error('[user-info] Error fetching user info:', err);
    return res.status(500).json({ error: err.message || 'Error fetching user info' });
  }
});

/**
 * GET /auth/google/callback - Handle OAuth callback from Google
 */
app.get('/auth/google/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;

  console.log('[callback] Received Google OAuth callback:', { code: !!code, error });

  if (error) {
    console.error('[callback] Google error:', error);
    return res.status(400).send(`<html><body><h1>Authentication Error</h1><p>${error}</p></body></html>`);
  }

  if (!code) {
    console.error('[callback] Missing authorization code');
    return res.status(400).send(`<html><body><h1>Missing Authorization Code</h1></body></html>`);
  }

  try {
    console.log('[callback] Exchanging code for token...');
    const tokens = await exchangeCodeForToken(code as string);
    
    if (!tokens.access_token) {
      throw new Error("Failed to obtain access token");
    }

    console.log('[callback] Token obtained successfully');

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    console.log('[callback] User info obtained:', userInfo.email);
    
    // Store tokens for this user
    userTokens.set(userInfo.email, tokens);

    // Create a simple token string that can be decoded in the browser
    const tokenStr = JSON.stringify({
      access_token: tokens.access_token,
      token_type: tokens.token_type || "Bearer",
      expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
    });

    // URL encode the token
    const encodedToken = encodeURIComponent(tokenStr);

    const redirectURL = `http://localhost:5173/?auth_token=${encodedToken}`;
    console.log('[callback] Final redirect URL:', redirectURL.substring(0, 100) + '...');
    console.log('[callback] Sending 302 redirect response...');
    
    return res.redirect(302, redirectURL);
  } catch (err: any) {
    // Log detailed error response from Google (if present)
    console.error('[server] OAuth callback error:', err?.response?.data || err?.message || err);
    const message = err?.response?.data?.error_description || err?.response?.data?.error || err?.message || 'unknown_error';
    res.status(500).send(`<html><body><h1>Authentication Failed</h1><p>${message}</p></body></html>`);
  }
});

/**
 * POST /auth/google/callback - Handle OAuth callback (for manual code entry)
 */
app.post("/auth/google/callback", async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code required" });
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    
    if (!tokens.access_token) {
      throw new Error("Failed to obtain access token");
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Store tokens for this user
    userTokens.set(userInfo.email, tokens);

    res.json({
      access_token: tokens.access_token,
      token_type: tokens.token_type || "Bearer",
      expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      scope: "https://www.googleapis.com/auth/drive",
    });
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    res.status(500).json({ error: err.message });
  }
});



/* =====================
   START SERVER
===================== */

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log('[Server] Using Supabase for database');
});
