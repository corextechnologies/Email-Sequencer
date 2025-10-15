"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../database/connection");
const router = (0, express_1.Router)();
/**
 * Email open tracking endpoint
 * Handles tracking pixel requests and logs email opens
 */
router.get('/open', async (req, res) => {
    try {
        // Properly decode and validate URL parameters
        const campaign_id = decodeURIComponent(req.query.c);
        const contact_id = decodeURIComponent(req.query.ct);
        const timestamp = req.query.t;
        // Validate that parameters are valid integers
        const campaignId = parseInt(campaign_id, 10);
        const contactId = parseInt(contact_id, 10);
        if (isNaN(campaignId) || isNaN(contactId)) {
            console.error('Invalid campaign_id or contact_id:', {
                original_campaign_id: campaign_id,
                original_contact_id: contact_id,
                parsed_campaign_id: campaignId,
                parsed_contact_id: contactId
            });
            return res.status(200)
                .set('Content-Type', 'image/gif')
                .set('Cache-Control', 'no-cache, no-store, must-revalidate')
                .set('Pragma', 'no-cache')
                .set('Expires', '0')
                .send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
        }
        // Log email open using the parsed integers
        await connection_1.Database.query(`
			INSERT INTO email_opens (campaign_id, contact_id, opened_at, user_agent, ip_address)
			VALUES ($1, $2, NOW(), $3, $4)
			ON CONFLICT (campaign_id, contact_id) DO UPDATE SET
				opened_at = NOW(),
				user_agent = EXCLUDED.user_agent,
				ip_address = EXCLUDED.ip_address
		`, [
            campaignId, // Use parsed integer
            contactId, // Use parsed integer
            req.headers['user-agent'] || '',
            req.ip || req.connection.remoteAddress || ''
        ]);
        // Update campaign_contacts status if needed
        await connection_1.Database.query(`
			UPDATE campaign_contacts 
			SET status = CASE 
				WHEN status = 'pending' THEN 'in_progress'
				ELSE status 
			END,
			last_email_opened_at = NOW()
			WHERE campaign_id = $1 AND contact_id = $2
		`, [campaignId, contactId]); // Use parsed integers
        console.log(`📊 Email opened: Campaign ${campaignId}, Contact ${contactId}`);
        // Return 1x1 transparent GIF
        return res.status(200)
            .set('Content-Type', 'image/gif')
            .set('Cache-Control', 'no-cache, no-store, must-revalidate')
            .set('Pragma', 'no-cache')
            .set('Expires', '0')
            .send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }
    catch (error) {
        console.error('Tracking pixel error:', error);
        // Still return pixel to avoid broken images
        return res.status(200)
            .set('Content-Type', 'image/gif')
            .send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }
});
exports.default = router;
//# sourceMappingURL=tracking.js.map