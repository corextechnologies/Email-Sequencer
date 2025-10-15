import { Router } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthenticatedRequest } from '../../../middleware/auth';
import { CampaignService } from '../services/campaignService';
import { updateCampaignStatusSchema } from '../validators';
import { AuthenticatedRequest as AR } from '../../../middleware/auth';
import { ContactTargetService } from '../services/contactTargetService';
import { CampaignStateMachine } from '../services/stateMachine';

export function createCampaignRoutes(db: Pool): Router {
	const router = Router();
	const service = new CampaignService(db);
	const targeting = new ContactTargetService(db);
    const fsm = new CampaignStateMachine(db);

	// All routes require authentication
	router.use(authMiddleware);

	// GET /api/campaigns
	router.get('/', async (req: AuthenticatedRequest, res) => {
		try {
			const userId = req.user!.userId;
			const campaigns = await service.list(userId);
			res.json({ success: true, data: campaigns });
		} catch (error) {
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list campaigns' } });
		}
	});

	// POST /api/campaigns
	router.post('/', async (req: AuthenticatedRequest, res) => {
		try {
			const userId = req.user!.userId;
			const created = await service.create(userId, req.body);
			res.status(201).json({ success: true, data: created });
		} catch (e: any) {
			if (e?.name === 'ZodError') {
				res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message } });
				return;
			}
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create campaign' } });
		}
	});

	// ===== State machine endpoints =====
	router.post('/:id/validate', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } }); return; }
			const userId = req.user!.userId;
			
			console.log(`🔍 Validating campaign ${campaignId} for user ${userId}`);
			const result = await fsm.validate(userId, campaignId);
			console.log(`✅ Validation result:`, result);
			
			res.json({ success: true, data: result });
		} catch (e: any) {
			console.error(`❌ Validation error for campaign ${req.params.id}:`, e);
			console.error('Error details:', { message: e?.message, stack: e?.stack });
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to validate' } });
		}
	});

	router.post('/:id/launch', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } }); return; }
			const userId = req.user!.userId;
			const updated = await fsm.launch(userId, campaignId);
			res.json({ success: true, data: updated });
		} catch (e: any) {
			if (String(e?.message).startsWith('VALIDATION_FAILED')) { res.status(400).json({ success: false, error: { code: 'VALIDATION_FAILED', message: e.message } }); return; }
			if (String(e?.message) === 'ILLEGAL_TRANSITION') { res.status(409).json({ success: false, error: { code: 'ILLEGAL_TRANSITION', message: 'Not allowed' } }); return; }
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to launch' } });
		}
	});

	router.post('/:id/pause', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } }); return; }
			const userId = req.user!.userId;
			const updated = await fsm.pause(userId, campaignId);
			res.json({ success: true, data: updated });
		} catch (e: any) {
			if (String(e?.message) === 'ILLEGAL_TRANSITION') { res.status(409).json({ success: false, error: { code: 'ILLEGAL_TRANSITION', message: 'Not allowed' } }); return; }
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to pause' } });
		}
	});

	router.post('/:id/resume', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } }); return; }
			const userId = req.user!.userId;
			const updated = await fsm.resume(userId, campaignId);
			res.json({ success: true, data: updated });
		} catch (e: any) {
			if (String(e?.message) === 'ILLEGAL_TRANSITION') { res.status(409).json({ success: false, error: { code: 'ILLEGAL_TRANSITION', message: 'Not allowed' } }); return; }
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to resume' } });
		}
	});

	router.post('/:id/cancel', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } }); return; }
			const userId = req.user!.userId;
			const updated = await fsm.cancel(userId, campaignId);
			res.json({ success: true, data: updated });
		} catch (e: any) {
			if (String(e?.message) === 'ILLEGAL_TRANSITION') { res.status(409).json({ success: false, error: { code: 'ILLEGAL_TRANSITION', message: 'Not allowed' } }); return; }
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel' } });
		}
	});

	router.post('/:id/complete', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } }); return; }
			const userId = req.user!.userId;
			const updated = await fsm.complete(userId, campaignId);
			res.json({ success: true, data: updated });
		} catch (e: any) {
			if (String(e?.message) === 'ILLEGAL_TRANSITION') { res.status(409).json({ success: false, error: { code: 'ILLEGAL_TRANSITION', message: 'Not allowed' } }); return; }
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to complete' } });
		}
	});

	// GET /api/campaigns/:id
	router.get('/:id', async (req: AuthenticatedRequest, res) => {
		try {
			const id = parseInt(req.params.id, 10);
			if (Number.isNaN(id)) {
				res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } });
				return;
			}
			const userId = req.user!.userId;
			const campaign = await service.get(userId, id);
			if (!campaign) {
				res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
				return;
			}
			res.json({ success: true, data: campaign });
		} catch (e) {
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get campaign' } });
		}
	});

	// GET /api/campaigns/:id/metrics
	router.get('/:id/metrics', async (req: AuthenticatedRequest, res) => {
		try {
			const id = parseInt(req.params.id, 10);
			if (Number.isNaN(id)) {
				res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } });
				return;
			}
			const userId = req.user!.userId;
			const metrics = await service.getCampaignMetrics(userId, id);
			if (!metrics) {
				res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
				return;
			}
			res.json({ success: true, data: metrics });
		} catch (error) {
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get campaign metrics' } });
		}
	});

	// PUT /api/campaigns/:id
	router.put('/:id', async (req: AuthenticatedRequest, res) => {
		try {
			const id = parseInt(req.params.id, 10);
			if (Number.isNaN(id)) {
				res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } });
				return;
			}
			const userId = req.user!.userId;
			
			console.log(`📥 PUT /api/campaigns/${id} - User: ${userId}`);
			console.log('📦 Request body:', req.body);
			
			const updated = await service.update(userId, id, req.body);
			
			console.log('✅ Campaign updated:', updated);
			
			if (!updated) {
				res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
				return;
			}
			res.json({ success: true, data: updated });
		} catch (e: any) {
			console.error('❌ Update error:', e);
			if (e?.name === 'ZodError') {
				console.error('❌ Validation errors:', e.errors);
				res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message, details: e.errors } });
				return;
			}
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update campaign' } });
		}
	});

	// DELETE /api/campaigns/:id
	router.delete('/:id', async (req: AuthenticatedRequest, res) => {
		try {
			const id = parseInt(req.params.id, 10);
			if (Number.isNaN(id)) {
				res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } });
				return;
			}
			const userId = req.user!.userId;
			const ok = await service.delete(userId, id);
			if (!ok) {
				res.status(400).json({ success: false, error: { code: 'DELETE_NOT_ALLOWED', message: 'Campaign cannot be deleted. Only draft, paused, or completed campaigns can be deleted.' } });
				return;
			}
			res.status(204).send();
		} catch (e) {
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete campaign' } });
		}
	});

	// ===== Targeting endpoints =====
	// POST /api/campaigns/:id/contacts (attach)
	router.post('/:id/contacts', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } }); return; }
			const userId = req.user!.userId;
			const inserted = await targeting.attach(userId, campaignId, req.body);
			res.status(201).json({ success: true, data: { inserted } });
		} catch (e: any) {
			if (e?.name === 'ZodError') { res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message } }); return; }
			if (String(e?.message) === 'NOT_FOUND') { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } }); return; }
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to attach contacts' } });
		}
	});

	// GET /api/campaigns/:id/contacts
	router.get('/:id/contacts', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } }); return; }
			const userId = req.user!.userId;
			const result = await targeting.list(userId, campaignId, req.query as any);
			res.json({ success: true, ...result });
		} catch (e) {
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list contacts' } });
		}
	});

	// PATCH /api/campaigns/:id/contacts/:contactId/persona
	router.patch('/:id/contacts/:contactId/persona', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			const contactId = parseInt(req.params.contactId, 10);
			const { personaId } = req.body || {};
			
			if (Number.isNaN(campaignId) || Number.isNaN(contactId)) {
				res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } });
				return;
			}

			const userId = req.user!.userId;

			// Update persona_id in campaign_contacts
			const result = await targeting.updatePersona(userId, campaignId, contactId, personaId);
			res.json({ success: true, data: result });
		} catch (e: any) {
			if (String(e?.message) === 'NOT_FOUND') {
				res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign contact not found' } });
				return;
			}
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update persona' } });
		}
	});

	// DELETE /api/campaigns/:id/contacts/:contactId
	router.delete('/:id/contacts/:contactId', async (req: AR, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			const contactId = parseInt(req.params.contactId, 10);
			if (Number.isNaN(campaignId) || Number.isNaN(contactId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid id' } }); return; }
			const userId = req.user!.userId;
			const ok = await targeting.remove(userId, campaignId, contactId);
			if (!ok) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }); return; }
			res.status(204).send();
		} catch (e) {
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete contact' } });
		}
	});

	// PATCH /api/campaigns/:id/status
	router.patch('/:id/status', async (req: AuthenticatedRequest, res) => {
		try {
			const id = parseInt(req.params.id, 10);
			if (Number.isNaN(id)) {
				res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } });
				return;
			}
			const parsed = updateCampaignStatusSchema.safeParse(req.body);
			if (!parsed.success) {
				res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
				return;
			}
			const userId = req.user!.userId;
			const updated = await service.updateStatus(userId, id, parsed.data.status);
			if (!updated) {
				res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
				return;
			}
			res.json({ success: true, data: updated });
		} catch (e) {
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update status' } });
		}
	});

	// GET /api/campaigns/:id/replies
	router.get('/:id/replies', async (req: AuthenticatedRequest, res) => {
		try {
			const campaignId = parseInt(req.params.id, 10);
			if (Number.isNaN(campaignId)) {
				res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid campaign id' } });
				return;
			}
			
			const userId = req.user!.userId;
			
			// Verify campaign belongs to user
			const campaign = await service.get(userId, campaignId);
			if (!campaign) {
				res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
				return;
			}
			
			// Get replies for this campaign
			const replies = await db.query(`
				SELECT 
					er.id,
					er.campaign_id,
					er.contact_id,
					er.reply_subject,
					er.reply_content,
					er.reply_sender_email,
					er.reply_received_at,
					er.processed_at,
					c.first_name || ' ' || c.last_name as contact_name,
					c.email as contact_email
				FROM email_replies er
				JOIN contacts c ON er.contact_id = c.id
				WHERE er.campaign_id = $1
				ORDER BY er.reply_received_at DESC
			`, [campaignId]);
			
			res.json({ 
				success: true, 
				data: { 
					replies: replies.rows,
					total: replies.rows.length
				}
			});
		} catch (error) {
			console.error('Error fetching campaign replies:', error);
			res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch replies' } });
		}
	});

	// ===== Steps endpoints (DISABLED - Steps functionality removed) =====
	// Steps functionality has been removed in favor of immediate email sending
	// These endpoints are kept for backwards compatibility but return 410 Gone

	return router;
}


