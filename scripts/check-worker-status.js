// Quick test to see if the worker is running and checking for replies
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkWorkerStatus() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking worker status...');
    
    // Check if there are any recent events or messages
    const recentEvents = await client.query(`
      SELECT type, COUNT(*) as count, MAX(occurred_at) as latest
      FROM events 
      WHERE occurred_at > NOW() - INTERVAL '1 hour'
      GROUP BY type
      ORDER BY latest DESC
    `);
    
    console.log('📊 Recent events (last hour):');
    if (recentEvents.rows.length === 0) {
      console.log('   • No recent events found');
    } else {
      recentEvents.rows.forEach(event => {
        console.log(`   • ${event.type}: ${event.count} (latest: ${event.latest})`);
      });
    }
    
    // Check if there are any email replies
    const replies = await client.query(`
      SELECT COUNT(*) as total_replies, MAX(created_at) as latest_reply
      FROM email_replies
    `);
    
    console.log('');
    console.log('📧 Email replies:');
    console.log(`   • Total replies: ${replies.rows[0].total_replies}`);
    console.log(`   • Latest reply: ${replies.rows[0].latest_reply || 'None'}`);
    
    // Check working email accounts
    const workingAccounts = await client.query(`
      SELECT username, imap_host, imap_port
      FROM email_accounts 
      WHERE imap_host IS NOT NULL 
      AND username IS NOT NULL 
      AND (imap_password IS NOT NULL OR encrypted_password IS NOT NULL)
      AND imap_password != 'YOUR_APP_PASSWORD_HERE'
    `);
    
    console.log('');
    console.log('📧 Email accounts ready for IMAP:');
    workingAccounts.rows.forEach(account => {
      console.log(`   • ${account.username} (${account.imap_host}:${account.imap_port})`);
    });
    
    console.log('');
    console.log('🚀 Worker should be checking for replies every 5 minutes...');
    console.log('📱 To test: Send emails through campaigns and reply to them');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkWorkerStatus().catch(console.error);
