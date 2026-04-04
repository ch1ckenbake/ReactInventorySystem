import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { batch_code, quantity_packages, total_weight, status } = req.body;

      const result = await sql`
        UPDATE inventory 
        SET batch_code = COALESCE(${batch_code || null}, batch_code),
            quantity_packages = COALESCE(${quantity_packages || null}, quantity_packages),
            total_weight = COALESCE(${total_weight || null}, total_weight),
            status = COALESCE(${status || null}, status),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      return res.status(200).json(result.rows[0]);
    } catch (error: any) {
      console.error('PUT /api/inventory/[id] error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`DELETE FROM inventory WHERE id = ${id} RETURNING *`;

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      return res.status(200).json({ message: 'Inventory item deleted', inventory: result.rows[0] });
    } catch (error: any) {
      console.error('DELETE /api/inventory/[id] error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
