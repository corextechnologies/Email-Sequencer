// Check if the reply was detected and stored
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkDetectedReplies() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking detected replies...');
    
    // Check email_replies table
    const replies = await client.query(`
      SELECT id, campaign_id, contact_id, reply_subject, reply_sender_email, 
             reply_received_at, processed_at, created_at
      FROM email_replies 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`📧 Found ${replies.rows.length} replies in email_replies table:`);
    replies.rows.forEach(reply => {
      console.log(`   • Reply ${reply.id}:`);
      console.log(`     Campaign: ${reply.campaign_id}, Contact: ${reply.contact_id}`);
      console.log(`     From: ${reply.reply_sender_email}`);
      console.log(`     Subject: ${reply.reply_subject}`);
      console.log(`     Received: ${reply.reply_received_at}`);
      console.log(`     Processed: ${reply.processed_at || 'Not processed'}`);
      console.log('');
    });
    
    // Check campaign_contacts for replied status
    const repliedContacts = await client.query(`
      SELECT cc.campaign_id, cc.contact_id, cc.status, cc.last_email_replied_at,
             c.first_name, c.last_name, c.email
      FROM campaign_contacts cc
      JOIN contacts c ON cc.contact_id = c.id
      WHERE cc.status = 'replied' OR cc.last_email_replied_at IS NOT NULL
      ORDER BY cc.last_email_replied_at DESC
      LIMIT 5
    `);
    
    console.log(`👥 Found ${repliedContacts.rows.length} contacts with replied status:`);
    repliedContacts.rows.forEach(contact => {
      console.log(`   • ${contact.first_name} ${contact.last_name} (${contact.email})`);
      console.log(`     Campaign: ${contact.campaign_id}, Status: ${contact.status}`);
      console.log(`     Replied at: ${contact.last_email_replied_at}`);
      console.log('');
    });
    
    // Check recent events
    const recentEvents = await client.query(`
      SELECT type, COUNT(*) as count, MAX(occurred_at) as latest
      FROM events 
      WHERE type = 'replied' AND occurred_at > NOW() - INTERVAL '1 hour'
      GROUP BY type
    `);
    
    console.log('📊 Recent reply events:');
    if (recentEvents.rows.length === 0) {
      console.log('   • No recent reply events found');
    } else {
      recentEvents.rows.forEach(event => {
        console.log(`   • ${event.type}: ${event.count} (latest: ${event.latest})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDetectedReplies().catch(console.error);
