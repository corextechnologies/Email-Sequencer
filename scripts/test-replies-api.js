// Test the replies API endpoint
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testRepliesAPI() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing replies API endpoint...');
    
    // Get campaign 134 (the one with replies)
    const campaignId = 134;
    const userId = 1; // Assuming user ID 1
    
    // Test the query that the API will use
    const replies = await client.query(`
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
    
    console.log(`📧 Found ${replies.rows.length} replies for campaign ${campaignId}:`);
    
    replies.rows.forEach(reply => {
      console.log(`   • Reply ${reply.id}:`);
      console.log(`     From: ${reply.contact_name} (${reply.contact_email})`);
      console.log(`     Subject: ${reply.reply_subject}`);
      console.log(`     Received: ${reply.reply_received_at}`);
      console.log(`     Content: ${reply.reply_content.substring(0, 100)}...`);
      console.log('');
    });
    
    console.log('✅ API endpoint query is working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testRepliesAPI().catch(console.error);
