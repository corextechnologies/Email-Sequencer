// Check current IMAP settings from mobile app
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkMobileIMAPSettings() {
  const client = await pool.connect();
  
  try {
    console.log('📱 Checking IMAP settings from mobile app...');
    
    const result = await client.query(`
      SELECT id, username, password, imap_host, imap_port, imap_secure, smtp_host, smtp_port
      FROM email_accounts 
      WHERE imap_host IS NOT NULL
    `);
    
    console.log(`📧 Found ${result.rows.length} email accounts with IMAP settings:`);
    console.log('');
    
    result.rows.forEach(account => {
      console.log(`📧 Account: ${account.username}`);
      console.log(`   • IMAP Host: ${account.imap_host}`);
      console.log(`   • IMAP Port: ${account.imap_port}`);
      console.log(`   • IMAP Secure: ${account.imap_secure}`);
      console.log(`   • Password: ${account.password ? 'SET' : 'NOT SET'}`);
      console.log(`   • SMTP Host: ${account.smtp_host}`);
      console.log(`   • SMTP Port: ${account.smtp_port}`);
      console.log('');
    });
    
    // Check if any accounts are ready for IMAP
    const readyAccounts = result.rows.filter(account => 
      account.imap_host && 
      account.username && 
      account.password
    );
    
    console.log(`✅ ${readyAccounts.length} accounts are ready for IMAP reply detection`);
    
    if (readyAccounts.length > 0) {
      console.log('🚀 You can now test the reply detection system!');
    } else {
      console.log('⚠️  No accounts are ready. Make sure passwords are set.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMobileIMAPSettings().catch(console.error);
