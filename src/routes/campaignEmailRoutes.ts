import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { Database } from '../database/connection';

export const campaignEmailRoutes = Router();

campaignEmailRoutes.use(authMiddleware);

// POST /api/campaigns/:campaignId/emails/save-sequence
// Save multiple emails for a contact in a campaign
campaignEmailRoutes.post('/campaigns/:campaignId/emails/save-sequence', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const campaignId = parseInt(req.params.campaignId);
    const { contactId, emails } = req.body || {};

    if (isNaN(campaignId)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_CAMPAIGN_ID', message: 'Invalid campaign ID' }
      });
    }

    if (!contactId || !emails || !Array.isArray(emails)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'contactId and emails array are required' }
      });
    }

    // Verify campaign belongs to user
    const campaignCheck = await Database.query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Campaign not found' }
      });
    }

    // Verify contact belongs to user
    const contactCheck = await Database.query(
      'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    // Delete existing emails for this campaign/contact combination
    await Database.query(
      'DELETE FROM campaign_emails WHERE campaign_id = $1 AND contact_id = $2',
      [campaignId, contactId]
    );

    // Insert new emails
    const savedEmails = [];
    for (const email of emails) {
      const result = await Database.query(
        `INSERT INTO campaign_emails (campaign_id, user_id, contact_id, email_number, day, subject, body)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          campaignId,
          userId,
          contactId,
          email.email_number,
          email.day,
          email.subject,
          email.body
        ]
      );
      savedEmails.push(result.rows[0].id);
    }

    console.log(`✅ Saved ${savedEmails.length} emails for campaign ${campaignId}, contact ${contactId}`);

    return res.json({ 
      success: true, 
      data: { 
        saved: savedEmails.length,
        emailIds: savedEmails
      }
    });

  } catch (err: any) {
    console.error('❌ Save campaign emails error:', err);
    return res.status(500).json({ 
      success: false, 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to save emails. Please try again.' 
      }
    });
  }
});

// GET /api/campaigns/:campaignId/emails/contact/:contactId
// Get all emails for a specific contact in a campaign
campaignEmailRoutes.get('/campaigns/:campaignId/emails/contact/:contactId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const campaignId = parseInt(req.params.campaignId);
    const contactId = parseInt(req.params.contactId);

    if (isNaN(campaignId) || isNaN(contactId)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_ID', message: 'Invalid campaign or contact ID' }
      });
    }

    const result = await Database.query(
      `SELECT id, email_number, day, subject, body, created_at, updated_at
       FROM campaign_emails
       WHERE campaign_id = $1 AND contact_id = $2 AND user_id = $3
       ORDER BY email_number ASC`,
      [campaignId, contactId, userId]
    );

    return res.json({ 
      success: true, 
      data: { 
        emails: result.rows,
        count: result.rows.length
      }
    });

  } catch (err: any) {
    console.error('❌ Get campaign emails error:', err);
    return res.status(500).json({ 
      success: false, 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch emails.' 
      }
    });
  }
});

export default campaignEmailRoutes;

