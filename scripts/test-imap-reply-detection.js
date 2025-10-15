// Test the IMAP reply detection system
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testIMAPReplyDetection() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing IMAP Reply Detection System...');
    
    // Test the query that the worker will use
    const accounts = await client.query(`
      SELECT id, username, imap_host, imap_port, imap_secure, 
             COALESCE(imap_username, username) as imap_username, 
             COALESCE(imap_password, encrypted_password) as imap_password
      FROM email_accounts 
      WHERE imap_host IS NOT NULL 
      AND username IS NOT NULL 
      AND (imap_password IS NOT NULL OR encrypted_password IS NOT NULL)
      AND imap_password != 'YOUR_APP_PASSWORD_HERE'
    `);
    
    console.log(`📧 Found ${accounts.rows.length} accounts ready for IMAP:`);
    
    accounts.rows.forEach(account => {
      console.log(`   • ${account.username}`);
      console.log(`     IMAP: ${account.imap_host}:${account.imap_port}`);
      console.log(`     Username: ${account.imap_username}`);
      console.log(`     Password: ${account.imap_password ? 'SET' : 'NOT SET'}`);
      console.log(`     Secure: ${account.imap_secure}`);
    });
    
    if (accounts.rows.length > 0) {
      console.log('');
      console.log('✅ IMAP Reply Detection System is ready!');
      console.log('');
      console.log('🚀 Next Steps:');
      console.log('1. Start the worker: npm start');
      console.log('2. Send test emails through campaigns');
      console.log('3. Reply to those emails from the recipient inbox');
      console.log('4. Check the email_replies table for detected replies');
      console.log('');
      console.log('📊 To check for replies:');
      console.log('   SELECT * FROM email_replies ORDER BY created_at DESC;');
    } else {
      console.log('❌ No accounts are ready for IMAP reply detection');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testIMAPReplyDetection().catch(console.error);
