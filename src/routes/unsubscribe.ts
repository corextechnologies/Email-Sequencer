import { Router } from 'express';
import { Database } from '../database/connection';

const router = Router();

// GET /api/unsubscribe/:token
router.get('/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const db = Database.getPool();
    const row = await db.query(`SELECT campaign_id, contact_id FROM unsubscribe_tokens WHERE token = $1 AND (expires_at IS NULL OR expires_at > NOW())`, [token]);
    if (row.rowCount === 0) {
      res.status(400).send('Invalid or expired unsubscribe token');
      return;
    }
    const { campaign_id, contact_id } = row.rows[0];
    // mark unsubscribed
    await db.query(`UPDATE contacts SET status='unsubscribed' WHERE id = $1`, [contact_id]);
    await db.query(`INSERT INTO events (campaign_id, contact_id, type, meta, occurred_at) VALUES ($1,$2,'unsubscribed','{}',NOW())`, [campaign_id, contact_id]);
    res.send('You have been unsubscribed.');
  } catch (e) {
    res.status(500).send('Unsubscribe failed');
  }
});

export { router as unsubscribeRoutes };


