// Check current IMAP password status
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkIMAPPasswords() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking IMAP password status...');
    
    const result = await client.query(`
      SELECT id, username, imap_host, imap_username, 
             CASE 
               WHEN imap_password = 'YOUR_APP_PASSWORD_HERE' THEN 'NOT_SET'
               WHEN imap_password IS NULL THEN 'NULL'
               ELSE 'SET'
             END as password_status
      FROM email_accounts 
      WHERE imap_host IS NOT NULL
    `);
    
    console.log('📧 IMAP Password Status:');
    result.rows.forEach(account => {
      console.log(`   • ${account.username}: ${account.password_status}`);
    });
    
    if (result.rows.some(r => r.password_status === 'NOT_SET' || r.password_status === 'NULL')) {
      console.log('');
      console.log('⚠️  IMAP passwords need to be configured!');
      console.log('');
      console.log('📋 For Gmail accounts:');
      console.log('   1. Go to Google Account settings');
      console.log('   2. Enable 2-Factor Authentication');
      console.log('   3. Generate an App Password');
      console.log('   4. Update the database with the app password');
    }
    
  } catch (error) {
    console.error('❌ Error checking passwords:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkIMAPPasswords().catch(console.error);
