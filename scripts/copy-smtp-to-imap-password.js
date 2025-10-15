// Script to copy SMTP password to IMAP password for existing accounts
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function copySMTPPasswordToIMAP() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Copying SMTP passwords to IMAP passwords...');
    
    // Get accounts that have encrypted_password but imap_password is placeholder
    const accounts = await client.query(`
      SELECT id, username, encrypted_password, imap_password
      FROM email_accounts 
      WHERE encrypted_password IS NOT NULL 
      AND (imap_password IS NULL OR imap_password = 'YOUR_APP_PASSWORD_HERE')
    `);
    
    console.log(`📧 Found ${accounts.rows.length} accounts to update:`);
    
    for (const account of accounts.rows) {
      console.log(`   • ${account.username}`);
      
      // Copy encrypted_password to imap_password
      await client.query(`
        UPDATE email_accounts 
        SET imap_password = $1, imap_username = $2
        WHERE id = $3
      `, [account.encrypted_password, account.username, account.id]);
      
      console.log(`     ✅ Updated IMAP password`);
    }
    
    console.log('');
    console.log('🎉 All SMTP passwords copied to IMAP passwords!');
    console.log('');
    console.log('🧪 Testing IMAP readiness...');
    
    // Test the updated query
    const readyAccounts = await client.query(`
      SELECT id, username, imap_host, imap_port, imap_secure, 
             COALESCE(imap_username, username) as imap_username, 
             COALESCE(imap_password, encrypted_password) as imap_password
      FROM email_accounts 
      WHERE imap_host IS NOT NULL 
      AND username IS NOT NULL 
      AND (imap_password IS NOT NULL OR encrypted_password IS NOT NULL)
      AND imap_password != 'YOUR_APP_PASSWORD_HERE'
    `);
    
    console.log(`✅ ${readyAccounts.rows.length} accounts are now ready for IMAP reply detection`);
    
    if (readyAccounts.rows.length > 0) {
      console.log('🚀 You can now test the reply detection system!');
      console.log('   Run: npm start');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

copySMTPPasswordToIMAP().catch(console.error);
