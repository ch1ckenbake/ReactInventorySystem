import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';
import { randomUUID } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM inventory ORDER BY created_at DESC`;
      return res.status(200).json(result.rows);
    } catch (error: any) {
      console.error('GET /api/inventory error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { batch_code, category_id, variety_id, packaging_id, quantity_packages, total_weight, status } = req.body;

      if (!batch_code || !category_id || !variety_id || !packaging_id || quantity_packages === undefined || total_weight === undefined || !status) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const id = randomUUID();
      const result = await sql`
        INSERT INTO inventory (id, batch_code, category_id, variety_id, packaging_id, quantity_packages, total_weight, status)
        VALUES (${id}, ${batch_code}, ${category_id}, ${variety_id}, ${packaging_id}, ${quantity_packages}, ${total_weight}, ${status})
        RETURNING *
      `;

      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('POST /api/inventory error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
