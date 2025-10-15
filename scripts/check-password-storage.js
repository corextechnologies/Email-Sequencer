// Check how passwords are stored in the database
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkPasswordStorage() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking password storage format...');
    
    const result = await client.query(`
      SELECT id, username, encrypted_password, imap_password
      FROM email_accounts 
      WHERE username IN ('roaan.tech@gmail.com', 'thecorextech@gmail.com')
    `);
    
    result.rows.forEach(account => {
      console.log(`📧 Account: ${account.username}`);
      console.log(`   • encrypted_password: ${account.encrypted_password ? account.encrypted_password.substring(0, 20) + '...' : 'NULL'}`);
      console.log(`   • imap_password: ${account.imap_password ? account.imap_password.substring(0, 20) + '...' : 'NULL'}`);
      console.log(`   • encrypted_password length: ${account.encrypted_password ? account.encrypted_password.length : 0}`);
      console.log(`   • imap_password length: ${account.imap_password ? account.imap_password.length : 0}`);
      console.log('');
    });
    
    // Check if passwords look encrypted (base64 or hex)
    const firstAccount = result.rows[0];
    if (firstAccount && firstAccount.encrypted_password) {
      const password = firstAccount.encrypted_password;
      const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(password);
      const isHex = /^[0-9a-fA-F]+$/.test(password);
      
      console.log('🔐 Password format analysis:');
      console.log(`   • Looks like Base64: ${isBase64}`);
      console.log(`   • Looks like Hex: ${isHex}`);
      console.log(`   • Length: ${password.length}`);
      
      if (password.length > 20) {
        console.log('   • Likely encrypted/hashed');
      } else {
        console.log('   • Might be plain text');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPasswordStorage().catch(console.error);
