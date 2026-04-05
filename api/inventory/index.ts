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
      try {
        // First, get all inventory items with related data
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select('*')
          .order('created_at', { ascending: false });

        if (inventoryError) {
          console.error('[Inventory GET] Inventory error:', inventoryError);
          return res.status(500).json({ error: inventoryError.message });
        }

        if (!inventoryData || inventoryData.length === 0) {
          return res.status(200).json([]);
        }

        console.log('[Inventory GET] Found', inventoryData.length, 'inventory items');

        // Get all unique IDs
        const categoryIds = [...new Set(inventoryData.map(item => item.category_id).filter(Boolean))];
        const varietyIds = [...new Set(inventoryData.map(item => item.variety_id).filter(Boolean))];
        const packagingIds = [...new Set(inventoryData.map(item => item.packaging_id).filter(Boolean))];

        console.log('[Inventory GET] IDs to fetch:', { categoryIds: categoryIds.length, varietyIds: varietyIds.length, packagingIds: packagingIds.length });

        // Fetch all related data in parallel
        const [categoriesResult, varietiesResult, packagingResult] = await Promise.all([
          categoryIds.length > 0 
            ? supabase.from('categories').select('id, name').in('id', categoryIds)
            : Promise.resolve({ data: [] }),
          varietyIds.length > 0
            ? supabase.from('varieties').select('*').in('id', varietyIds)
            : Promise.resolve({ data: [] }),
          packagingIds.length > 0
            ? supabase.from('packaging').select('*').in('id', packagingIds)
            : Promise.resolve({ data: [] })
        ]);

        const categories = categoriesResult.data || [];
        const varieties = varietiesResult.data || [];
        const packaging = packagingResult.data || [];

        console.log('[Inventory GET] Fetched data:', {
          categories: categories.length,
          varieties: varieties.length,
          packaging: packaging.length
        });

        // Create lookup maps
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const varietyMap = new Map(varieties.map(v => [v.id, {
          name: v.name,
          packagingPrices: v.packagingPrices || {}
        }]));
        const packagingMap = new Map(packaging.map(p => [p.id, {
          name: p.name,
          size: p.size,
          unit: p.unit,
          pricePerPackage: p.price_per_package || p.pricePerPackage || 0
        }]));

        console.log('[Inventory GET] Maps created successfully');

        // Enrich inventory data with all related information
        const enrichedData = inventoryData.map(item => {
          const varietyData = varietyMap.get(item.variety_id);
          const packagingData = packagingMap.get(item.packaging_id);
          
          // Determine price per package:
          // 1. Check if variety has specific price for this packaging
          // 2. Fall back to packaging's general price
          let finalPrice = 0;
          if (varietyData?.packagingPrices && item.packaging_id) {
            const varietyPrice = varietyData.packagingPrices[item.packaging_id];
            if (typeof varietyPrice === 'number' && varietyPrice > 0) {
              finalPrice = varietyPrice;
            }
          }
          if (finalPrice === 0 && packagingData) {
            finalPrice = packagingData.pricePerPackage;
          }

          const itemValue = finalPrice * (item.quantity_packages || 0);

          return {
            ...item,
            category_name: categoryMap.get(item.category_id) || null,
            variety_name: varietyData?.name || null,
            packaging_name: packagingData?.name || null,
            packaging_size: packagingData?.size || null,
            packaging_unit: packagingData?.unit || null,
            price_per_package: finalPrice,
            calculated_value: itemValue
          };
        });

        console.log('[Inventory GET] Enriched data with', enrichedData.length, 'items');
        return res.status(200).json(enrichedData);
      } catch (error) {
        console.error('[Inventory GET] Unhandled error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
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
