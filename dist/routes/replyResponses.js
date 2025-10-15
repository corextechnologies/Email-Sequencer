"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReplyResponseRoutes = createReplyResponseRoutes;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const replyResponseService_1 = require("../services/replyResponseService");
function createReplyResponseRoutes(db) {
    const router = (0, express_1.Router)();
    const replyResponseService = new replyResponseService_1.ReplyResponseService();
    // All routes require authentication
    router.use(auth_1.authMiddleware);
    // POST /api/replies/:replyId/respond
    router.post('/:replyId/respond', async (req, res) => {
        try {
            const { replyId } = req.params;
            const { subject, content } = req.body;
            const userId = req.user.userId;
            // Validate input
            if (!subject || !content) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_FIELDS', message: 'Subject and content are required' }
                });
            }
            // Get the original reply
            const reply = await db.query(`
        SELECT er.*, c.user_id as campaign_user_id
        FROM email_replies er
        JOIN campaigns c ON er.campaign_id = c.id
        WHERE er.id = $1 AND c.user_id = $2
      `, [replyId, userId]);
            if (reply.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Reply not found' }
                });
            }
            const replyData = reply.rows[0];
            // Send the response
            const response = await replyResponseService.sendReplyResponse(replyData, subject, content, userId);
            return res.json({
                success: true,
                data: { response }
            });
        }
        catch (error) {
            console.error('Error sending reply response:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to send response' }
            });
        }
    });
    // GET /api/replies/:replyId/responses
    router.get('/:replyId/responses', async (req, res) => {
        try {
            const { replyId } = req.params;
            const userId = req.user.userId;
            const responses = await replyResponseService.getReplyResponses(parseInt(replyId), userId);
            return res.json({
                success: true,
                data: { responses }
            });
        }
        catch (error) {
            console.error('Error fetching reply responses:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch responses' }
            });
        }
    });
    // GET /api/replies/:replyId/with-responses
    router.get('/:replyId/with-responses', async (req, res) => {
        try {
            const { replyId } = req.params;
            const userId = req.user.userId;
            const replyWithResponses = await replyResponseService.getReplyWithResponses(parseInt(replyId), userId);
            if (!replyWithResponses) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Reply not found' }
                });
            }
            return res.json({
                success: true,
                data: { reply: replyWithResponses }
            });
        }
        catch (error) {
            console.error('Error fetching reply with responses:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reply' }
            });
        }
    });
    return router;
}
//# sourceMappingURL=replyResponses.js.map