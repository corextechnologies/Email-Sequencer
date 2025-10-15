// Script to set IMAP password for a specific account
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setIMAPPassword() {
  const accountId = process.argv[2];
  const appPassword = process.argv[3];
  
  if (!accountId || !appPassword) {
    console.log('❌ Usage: node scripts/set-imap-password.js <account_id> <app_password>');
    console.log('');
    console.log('📋 Example:');
    console.log('   node scripts/set-imap-password.js 8 "abcd efgh ijkl mnop"');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    console.log(`🔐 Setting IMAP password for account ID: ${accountId}`);
    
    // Get account details
    const account = await client.query(`
      SELECT id, username, imap_host, imap_username
      FROM email_accounts 
      WHERE id = $1
    `, [accountId]);
    
    if (account.rows.length === 0) {
      console.log('❌ Account not found!');
      return;
    }
    
    const accountInfo = account.rows[0];
    console.log(`📧 Account: ${accountInfo.username}`);
    console.log(`🔗 IMAP Host: ${accountInfo.imap_host}`);
    
    // Update the password
    await client.query(`
      UPDATE email_accounts 
      SET imap_password = $1
      WHERE id = $2
    `, [appPassword, accountId]);
    
    console.log('✅ IMAP password updated successfully!');
    console.log('');
    console.log('🧪 Test the connection:');
    console.log('   node scripts/test-imap-connection.js ' + accountId);
    
  } catch (error) {
    console.error('❌ Error updating password:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setIMAPPassword().catch(console.error);
