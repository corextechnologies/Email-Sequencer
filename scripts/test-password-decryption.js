// Test password decryption
const { Pool } = require('pg');
require('dotenv').config();

// Import the encryption helper
const { EncryptionHelper } = require('../dist/utils/encryption');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testPasswordDecryption() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Testing password decryption...');
    
    const result = await client.query(`
      SELECT id, username, encrypted_password, imap_password
      FROM email_accounts 
      WHERE username IN ('roaan.tech@gmail.com', 'thecorextech@gmail.com')
    `);
    
    for (const account of result.rows) {
      console.log(`📧 Testing ${account.username}:`);
      
      try {
        const decryptedPassword = EncryptionHelper.decrypt(account.imap_password);
        console.log(`   ✅ Password decrypted successfully`);
        console.log(`   📏 Decrypted length: ${decryptedPassword.length}`);
        console.log(`   🔍 First 5 chars: ${decryptedPassword.substring(0, 5)}...`);
      } catch (error) {
        console.log(`   ❌ Decryption failed: ${error.message}`);
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

testPasswordDecryption().catch(console.error);
