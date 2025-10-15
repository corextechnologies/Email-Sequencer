import { Router } from 'express';
import { Pool } from 'pg';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

export function createAnalyticsRoutes(db: Pool): Router {
  const router = Router();

  // All routes require authentication
  router.use(authMiddleware);

  // GET /api/analytics/replies
  router.get('/replies', async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get total replies across all campaigns
      const totalRepliesResult = await db.query(`
        SELECT COUNT(*) as total_replies
        FROM email_replies er
        JOIN campaigns c ON er.campaign_id = c.id
        WHERE c.user_id = $1
      `, [userId]);
      
      // Get total campaigns
      const totalCampaignsResult = await db.query(`
        SELECT COUNT(*) as total_campaigns
        FROM campaigns
        WHERE user_id = $1
      `, [userId]);
      
      // Get total sent emails
      const totalSentResult = await db.query(`
        SELECT COUNT(*) as total_sent
        FROM messages m
        JOIN campaigns c ON m.campaign_id = c.id
        WHERE c.user_id = $1 AND m.status = 'sent'
      `, [userId]);
      
      // Get recent replies (last 7 days)
      const recentRepliesResult = await db.query(`
        SELECT COUNT(*) as recent_replies
        FROM email_replies er
        JOIN campaigns c ON er.campaign_id = c.id
        WHERE c.user_id = $1 
        AND er.reply_received_at >= NOW() - INTERVAL '7 days'
      `, [userId]);
      
      // Get top performing campaign by reply rate
      const topCampaignResult = await db.query(`
        SELECT 
          c.id,
          c.name,
          COUNT(er.id) as replies,
          COUNT(m.id) as sent_emails,
          CASE 
            WHEN COUNT(m.id) > 0 THEN (COUNT(er.id)::float / COUNT(m.id)) * 100
            ELSE 0
          END as reply_rate
        FROM campaigns c
        LEFT JOIN messages m ON c.id = m.campaign_id AND m.status = 'sent'
        LEFT JOIN email_replies er ON c.id = er.campaign_id
        WHERE c.user_id = $1
        GROUP BY c.id, c.name
        HAVING COUNT(m.id) > 0
        ORDER BY reply_rate DESC, replies DESC
        LIMIT 1
      `, [userId]);
      
      // Get reply trends for last 7 days
      const trendsResult = await db.query(`
        SELECT 
          DATE(er.reply_received_at) as date,
          COUNT(*) as replies
        FROM email_replies er
        JOIN campaigns c ON er.campaign_id = c.id
        WHERE c.user_id = $1 
        AND er.reply_received_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(er.reply_received_at)
        ORDER BY date ASC
      `, [userId]);
      
      // Calculate overall reply rate
      const totalReplies = parseInt(totalRepliesResult.rows[0]?.total_replies || '0');
      const totalSent = parseInt(totalSentResult.rows[0]?.total_sent || '0');
      const overallReplyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
      
      // Format trends data
      const trends = trendsResult.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        replies: parseInt(row.replies)
      }));
      
      // Fill missing days with 0 replies
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const existingTrend = trends.find(t => t.date === dateStr);
        last7Days.push({
          date: dateStr,
          replies: existingTrend ? existingTrend.replies : 0
        });
      }
      
      const analytics = {
        totalReplies,
        totalCampaigns: parseInt(totalCampaignsResult.rows[0]?.total_campaigns || '0'),
        totalSentEmails: totalSent,
        overallReplyRate: Math.round(overallReplyRate * 10) / 10,
        recentReplies: parseInt(recentRepliesResult.rows[0]?.recent_replies || '0'),
        topCampaign: topCampaignResult.rows.length > 0 ? {
          id: topCampaignResult.rows[0].id,
          name: topCampaignResult.rows[0].name,
          replyRate: Math.round(parseFloat(topCampaignResult.rows[0].reply_rate) * 10) / 10,
          replies: parseInt(topCampaignResult.rows[0].replies)
        } : null,
        replyTrends: last7Days
      };
      
      res.json({ 
        success: true, 
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching reply analytics:', error);
      res.status(500).json({ 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch analytics' 
        } 
      });
    }
  });

  // GET /api/analytics/overview
  router.get('/overview', async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      
      // Get total campaigns
      const totalCampaignsResult = await db.query(`
        SELECT COUNT(*) as total_campaigns
        FROM campaigns
        WHERE user_id = $1
      `, [userId]);
      
      // Get total contacts
      const totalContactsResult = await db.query(`
        SELECT COUNT(*) as total_contacts
        FROM contacts
        WHERE user_id = $1
      `, [userId]);
      
      // Get total sent emails
      const totalSentResult = await db.query(`
        SELECT COUNT(*) as total_sent
        FROM messages m
        JOIN campaigns c ON m.campaign_id = c.id
        WHERE c.user_id = $1 AND m.status = 'sent'
      `, [userId]);
      
      // Get total replies
      const totalRepliesResult = await db.query(`
        SELECT COUNT(*) as total_replies
        FROM email_replies er
        JOIN campaigns c ON er.campaign_id = c.id
        WHERE c.user_id = $1
      `, [userId]);
      
      // Calculate reply rate
      const totalSent = parseInt(totalSentResult.rows[0]?.total_sent || '0');
      const totalReplies = parseInt(totalRepliesResult.rows[0]?.total_replies || '0');
      const replyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;
      
      const overview = {
        totalCampaigns: parseInt(totalCampaignsResult.rows[0]?.total_campaigns || '0'),
        totalContacts: parseInt(totalContactsResult.rows[0]?.total_contacts || '0'),
        totalEmailsSent: totalSent,
        replyRate: Math.round(replyRate * 10) / 10
      };
      
      res.json({ 
        success: true, 
        data: overview
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      res.status(500).json({ 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch overview stats' 
        } 
      });
    }
  });

  return router;
}
