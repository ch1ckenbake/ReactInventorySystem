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
      // Fetch all varieties
      const { data: varietiesData, error: varietiesError } = await supabase
        .from('varieties')
        .select('*')
        .order('id', { ascending: true });

      if (varietiesError) {
        return res.status(500).json({ error: varietiesError.message });
      }

      if (!varietiesData || varietiesData.length === 0) {
        return res.status(200).json([]);
      }

      // Fetch all variety-packaging prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('variety_packaging_prices')
        .select('*');

      if (pricesError) {
        console.warn('[Varieties GET] Prices error (non-blocking):', pricesError);
        // Still return varieties even if prices fail
      }

      // Build packagingPrices map for each variety
      const enrichedData = varietiesData.map(variety => {
        const packagingPrices: Record<string, number> = {};
        if (pricesData) {
          pricesData
            .filter(p => p.variety_id === variety.id)
            .forEach(p => {
              packagingPrices[p.packaging_id] = p.price || 0;
            });
        }
        return {
          ...variety,
          packagingPrices
        };
      });

      return res.status(200).json(enrichedData);
    } catch (error) {
      console.error('[Varieties GET] Unhandled error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const { packagingPrices, ...varietyData } = body;
      
      // Insert the variety
      const { data: varietyInserted, error: insertError } = await supabase
        .from('varieties')
        .insert([{
          category_id: varietyData.categoryId,
          name: varietyData.name,
          description: varietyData.description
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[Varieties POST] Insert error:', insertError);
        return res.status(500).json({ error: insertError.message });
      }

      // Insert packaging prices if provided
      if (packagingPrices && Object.keys(packagingPrices).length > 0 && varietyInserted?.id) {
        const priceRecords = Object.entries(packagingPrices).map(([packagingId, price]) => ({
          variety_id: varietyInserted.id,
          packaging_id: packagingId,
          price: Number(price) || 0
        }));

        const { error: pricesError } = await supabase
          .from('variety_packaging_prices')
          .insert(priceRecords);

        if (pricesError) {
          console.warn('[Varieties POST] Prices insert warning (non-blocking):', pricesError);
          // Don't fail the whole request if prices fail
        }
      }

      // Return enriched variety with prices
      const enrichedVariety = {
        ...varietyInserted,
        packagingPrices: packagingPrices || {}
      };

      return res.status(201).json(enrichedVariety);
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

      const body = req.body;
      const { packagingPrices, ...varietyData } = body;
      
      // Update the variety record
      const dbPayload = {
        category_id: varietyData.categoryId,
        name: varietyData.name,
        description: varietyData.description
      };

      const { data: varietyUpdated, error: varietyError } = await supabase
        .from('varieties')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (varietyError) {
        return res.status(500).json({ error: varietyError.message });
      }

      // Update packaging prices if provided
      if (packagingPrices && Object.keys(packagingPrices).length > 0) {
        // Delete existing prices for this variety
        const { error: deleteError } = await supabase
          .from('variety_packaging_prices')
          .delete()
          .eq('variety_id', id);

        if (deleteError) {
          console.warn('[Varieties PUT] Delete prices error:', deleteError);
        }

        // Insert new prices
        const priceRecords = Object.entries(packagingPrices).map(([packagingId, price]) => ({
          variety_id: id,
          packaging_id: packagingId,
          price: Number(price) || 0
        }));

        const { error: insertError } = await supabase
          .from('variety_packaging_prices')
          .insert(priceRecords);

        if (insertError) {
          console.warn('[Varieties PUT] Insert prices error:', insertError);
        }
      } else if (packagingPrices !== undefined) {
        // If packagingPrices is provided but empty, delete all existing prices
        const { error: deleteError } = await supabase
          .from('variety_packaging_prices')
          .delete()
          .eq('variety_id', id);

        if (deleteError) {
          console.warn('[Varieties PUT] Delete prices error:', deleteError);
        }
      }

      // Return enriched variety with prices
      const enrichedVariety = {
        ...varietyUpdated,
        packagingPrices: packagingPrices || {}
      };

      return res.status(200).json(enrichedVariety);
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
