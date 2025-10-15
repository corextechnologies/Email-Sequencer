// Test IMAP connection with decrypted passwords
const { Pool } = require('pg');
const Imap = require('imap');
require('dotenv').config();

// Import the encryption helper
const { EncryptionHelper } = require('../dist/utils/encryption');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testIMAPWithDecryption() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing IMAP connection with decrypted passwords...');
    
    const result = await client.query(`
      SELECT id, username, imap_host, imap_port, imap_secure, 
             COALESCE(imap_username, username) as imap_username, 
             COALESCE(imap_password, encrypted_password) as imap_password
      FROM email_accounts 
      WHERE imap_host IS NOT NULL 
      AND username IS NOT NULL 
      AND (imap_password IS NOT NULL OR encrypted_password IS NOT NULL)
      AND imap_password != 'YOUR_APP_PASSWORD_HERE'
    `);
    
    for (const account of result.rows) {
      console.log(`📧 Testing IMAP connection for ${account.username}...`);
      
      try {
        // Decrypt the password
        const decryptedPassword = EncryptionHelper.decrypt(account.imap_password);
        
        // Test IMAP connection
        const imap = new Imap({
          host: account.imap_host,
          port: account.imap_port,
          tls: account.imap_secure,
          user: account.imap_username,
          password: decryptedPassword,
          tlsOptions: { rejectUnauthorized: false }
        });
        
        imap.once('ready', () => {
          console.log(`   ✅ IMAP connection successful!`);
          imap.openBox('INBOX', false, (err, box) => {
            if (err) {
              console.log(`   ❌ Failed to open INBOX: ${err.message}`);
            } else {
              console.log(`   ✅ INBOX opened successfully!`);
              console.log(`   📊 Total messages: ${box.messages.total}`);
            }
            imap.end();
          });
        });
        
        imap.once('error', (err) => {
          console.log(`   ❌ IMAP connection failed: ${err.message}`);
          if (err.textCode === 'AUTHENTICATIONFAILED') {
            console.log(`   🔐 Authentication failed - check your app password`);
          }
        });
        
        imap.connect();
        
        // Wait a bit for the connection to establish
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testIMAPWithDecryption().catch(console.error);
