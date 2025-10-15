// Script to update IMAP passwords for email accounts
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateIMAPPasswords() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 IMAP Password Configuration Helper');
    console.log('');
    
    // Get all email accounts that need IMAP passwords
    const accounts = await client.query(`
      SELECT id, username, imap_host, imap_username
      FROM email_accounts 
      WHERE imap_host IS NOT NULL 
      AND (imap_password IS NULL OR imap_password = 'YOUR_APP_PASSWORD_HERE')
    `);
    
    if (accounts.rows.length === 0) {
      console.log('✅ All IMAP passwords are already configured!');
      return;
    }
    
    console.log('📧 Email accounts needing IMAP passwords:');
    accounts.rows.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.username} (ID: ${account.id})`);
    });
    
    console.log('');
    console.log('🔐 Gmail App Password Setup Instructions:');
    console.log('');
    console.log('1. Go to https://myaccount.google.com/security');
    console.log('2. Enable 2-Factor Authentication if not already enabled');
    console.log('3. Go to "App passwords" section');
    console.log('4. Generate a new app password for "Mail"');
    console.log('5. Copy the 16-character password (e.g., "abcd efgh ijkl mnop")');
    console.log('');
    console.log('6. Run this command to update passwords:');
    console.log('   node scripts/set-imap-password.js <account_id> <app_password>');
    console.log('');
    console.log('📋 Example commands:');
    accounts.rows.forEach(account => {
      console.log(`   node scripts/set-imap-password.js ${account.id} "your_app_password_here"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateIMAPPasswords().catch(console.error);
