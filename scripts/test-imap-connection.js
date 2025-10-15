// Script to test IMAP connection for a specific account
const { Pool } = require('pg');
const Imap = require('imap');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testIMAPConnection() {
  const accountId = process.argv[2];
  
  if (!accountId) {
    console.log('❌ Usage: node scripts/test-imap-connection.js <account_id>');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    console.log(`🧪 Testing IMAP connection for account ID: ${accountId}`);
    
    // Get account details
    const account = await client.query(`
      SELECT id, username, imap_host, imap_port, imap_secure, imap_username, imap_password
      FROM email_accounts 
      WHERE id = $1
    `, [accountId]);
    
    if (account.rows.length === 0) {
      console.log('❌ Account not found!');
      return;
    }
    
    const accountInfo = account.rows[0];
    console.log(`📧 Account: ${accountInfo.username}`);
    console.log(`🔗 IMAP Host: ${accountInfo.imap_host}:${accountInfo.imap_port}`);
    console.log(`🔐 IMAP Username: ${accountInfo.imap_username}`);
    console.log(`🔒 IMAP Secure: ${accountInfo.imap_secure}`);
    
    if (!accountInfo.imap_password || accountInfo.imap_password === 'YOUR_APP_PASSWORD_HERE') {
      console.log('❌ IMAP password not set!');
      console.log('Run: node scripts/set-imap-password.js ' + accountId + ' "your_app_password"');
      return;
    }
    
    // Test IMAP connection
    console.log('🔌 Testing IMAP connection...');
    
    const imap = new Imap({
      host: accountInfo.imap_host,
      port: accountInfo.imap_port,
      tls: accountInfo.imap_secure,
      user: accountInfo.imap_username,
      password: accountInfo.imap_password,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    imap.once('ready', () => {
      console.log('✅ IMAP connection successful!');
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.log('❌ Failed to open INBOX:', err.message);
        } else {
          console.log('✅ INBOX opened successfully!');
          console.log(`📊 Total messages: ${box.messages.total}`);
        }
        imap.end();
      });
    });
    
    imap.once('error', (err) => {
      console.log('❌ IMAP connection failed:', err.message);
      if (err.textCode === 'AUTHENTICATIONFAILED') {
        console.log('🔐 Authentication failed - check your app password');
      }
    });
    
    imap.connect();
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testIMAPConnection().catch(console.error);
