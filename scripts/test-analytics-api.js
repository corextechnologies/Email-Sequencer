// Test the analytics API endpoint
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testAnalyticsAPI() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing analytics API endpoint...');
    
    const userId = 3; // Test user ID
    
    // Test the query that the API will use
    const totalRepliesResult = await client.query(`
      SELECT COUNT(*) as total_replies
      FROM email_replies er
      JOIN campaigns c ON er.campaign_id = c.id
      WHERE c.user_id = $1
    `, [userId]);
    
    const totalCampaignsResult = await client.query(`
      SELECT COUNT(*) as total_campaigns
      FROM campaigns
      WHERE user_id = $1
    `, [userId]);
    
    const totalSentResult = await client.query(`
      SELECT COUNT(*) as total_sent
      FROM messages m
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE c.user_id = $1 AND m.status = 'sent'
    `, [userId]);
    
    const recentRepliesResult = await client.query(`
      SELECT COUNT(*) as recent_replies
      FROM email_replies er
      JOIN campaigns c ON er.campaign_id = c.id
      WHERE c.user_id = $1 
      AND er.reply_received_at >= NOW() - INTERVAL '7 days'
    `, [userId]);
    
    const topCampaignResult = await client.query(`
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
    
    console.log('📊 Analytics Results:');
    console.log(`   Total Replies: ${totalRepliesResult.rows[0]?.total_replies || 0}`);
    console.log(`   Total Campaigns: ${totalCampaignsResult.rows[0]?.total_campaigns || 0}`);
    console.log(`   Total Sent: ${totalSentResult.rows[0]?.total_sent || 0}`);
    console.log(`   Recent Replies (7 days): ${recentRepliesResult.rows[0]?.recent_replies || 0}`);
    
    if (topCampaignResult.rows.length > 0) {
      const campaign = topCampaignResult.rows[0];
      console.log(`   Top Campaign: ${campaign.name}`);
      console.log(`   Top Campaign Replies: ${campaign.replies}`);
      console.log(`   Top Campaign Reply Rate: ${parseFloat(campaign.reply_rate).toFixed(1)}%`);
    } else {
      console.log('   No campaigns with sent emails found');
    }
    
    console.log('✅ Analytics API queries are working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testAnalyticsAPI().catch(console.error);
