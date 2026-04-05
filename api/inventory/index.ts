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
      // First, get all inventory items
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (inventoryError) {
        console.error('[Inventory GET] Error:', inventoryError);
        return res.status(500).json({ error: inventoryError.message });
      }

      if (!inventoryData || inventoryData.length === 0) {
        return res.status(200).json([]);
      }

      // Get all unique category, variety, and packaging IDs (filter out null/undefined)
      const categoryIds = [...new Set(inventoryData.map(item => item.category_id).filter(Boolean))];
      const varietyIds = [...new Set(inventoryData.map(item => item.variety_id).filter(Boolean))];
      const packagingIds = [...new Set(inventoryData.map(item => item.packaging_id).filter(Boolean))];

      // Fetch related data in parallel
      const promises = [];
      
      if (categoryIds.length > 0) {
        promises.push(supabase.from('categories').select('id, name').in('id', categoryIds));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }
      
      if (varietyIds.length > 0) {
        promises.push(supabase.from('varieties').select('id, name').in('id', varietyIds));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }
      
      if (packagingIds.length > 0) {
        promises.push(supabase.from('packaging').select('id, name, size, unit, pricePerPackage').in('id', packagingIds));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      const results = await Promise.all(promises);
      const categories = results[0].data || [];
      const varieties = results[1].data || [];
      const packaging = results[2].data || [];

      console.log('[Inventory GET] Fetched:', { categoryCount: categories.length, varietyCount: varieties.length, packagingCount: packaging.length });

      // Map the data to create lookup objects
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      const varietyMap = new Map(varieties.map(v => [v.id, v.name]));
      const packagingMap = new Map(packaging.map(p => [p.id, { name: p.name, size: p.size, unit: p.unit, pricePerPackage: p.pricePerPackage || 0 }]));

      // Enrich inventory data with names
      const enrichedData = inventoryData.map(item => ({
        ...item,
        category_name: categoryMap.get(item.category_id) || null,
        variety_name: varietyMap.get(item.variety_id) || null,
        packaging_name: packagingMap.get(item.packaging_id)?.name || null,
        packaging_size: packagingMap.get(item.packaging_id)?.size || null,
        packaging_unit: packagingMap.get(item.packaging_id)?.unit || null,
        packaging_price: packagingMap.get(item.packaging_id)?.pricePerPackage || 0
      }));

      return res.status(200).json(enrichedData);
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
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
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
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
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
