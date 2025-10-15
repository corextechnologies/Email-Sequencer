// Manually process the detected reply
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function processDetectedReply() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Processing the detected reply...');
    
    // Get the reply that was detected
    const reply = await client.query(`
      SELECT id, campaign_id, contact_id, reply_subject, reply_sender_email, 
             reply_received_at, processed_at
      FROM email_replies 
      WHERE processed_at IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (reply.rows.length === 0) {
      console.log('❌ No processed replies found');
      return;
    }
    
    const replyData = reply.rows[0];
    console.log(`📧 Processing reply from ${replyData.reply_sender_email}`);
    
    // Update contact status to 'replied'
    const updateResult = await client.query(`
      UPDATE campaign_contacts 
      SET status = 'replied', last_email_replied_at = $1
      WHERE campaign_id = $2 AND contact_id = $3
    `, [replyData.reply_received_at, replyData.campaign_id, replyData.contact_id]);
    
    console.log(`✅ Updated ${updateResult.rowCount} contact(s) to replied status`);
    
    // Log reply event
    await client.query(`
      INSERT INTO events (campaign_id, contact_id, type, meta, occurred_at)
      VALUES ($1, $2, 'replied', $3, NOW())
    `, [
      replyData.campaign_id,
      replyData.contact_id,
      JSON.stringify({
        reply_subject: replyData.reply_subject,
        reply_sender: replyData.reply_sender_email,
        reply_id: replyData.id
      })
    ]);
    
    console.log('✅ Logged reply event');
    
    // Check the updated status
    const updatedContact = await client.query(`
      SELECT cc.status, cc.last_email_replied_at, c.first_name, c.last_name, c.email
      FROM campaign_contacts cc
      JOIN contacts c ON cc.contact_id = c.id
      WHERE cc.campaign_id = $1 AND cc.contact_id = $2
    `, [replyData.campaign_id, replyData.contact_id]);
    
    if (updatedContact.rows.length > 0) {
      const contact = updatedContact.rows[0];
      console.log('');
      console.log('🎉 Reply processing completed!');
      console.log(`   Contact: ${contact.first_name} ${contact.last_name} (${contact.email})`);
      console.log(`   Status: ${contact.status}`);
      console.log(`   Replied at: ${contact.last_email_replied_at}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

processDetectedReply().catch(console.error);
