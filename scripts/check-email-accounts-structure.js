// Check the actual email_accounts table structure
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkEmailAccountsStructure() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking email_accounts table structure...');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'email_accounts'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 email_accounts table columns:');
    result.rows.forEach(col => {
      console.log(`   • ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('');
    console.log('📧 Current email accounts:');
    const accounts = await client.query(`
      SELECT id, username, smtp_host, smtp_port, imap_host, imap_port, imap_secure, imap_username, imap_password
      FROM email_accounts
    `);
    
    accounts.rows.forEach(account => {
      console.log(`   • ID: ${account.id}, Username: ${account.username}`);
      console.log(`     SMTP: ${account.smtp_host}:${account.smtp_port}`);
      console.log(`     IMAP: ${account.imap_host}:${account.imap_port}`);
      console.log(`     IMAP Username: ${account.imap_username || 'NULL'}`);
      console.log(`     IMAP Password: ${account.imap_password || 'NULL'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkEmailAccountsStructure().catch(console.error);
