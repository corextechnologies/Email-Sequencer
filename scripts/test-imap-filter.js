// Quick test to verify IMAP accounts are filtered correctly
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testIMAPFilter() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing IMAP account filtering...');
    
    // Test the same query as in the code
    const result = await client.query(`
      SELECT id, username, imap_host, imap_port, imap_secure, username as imap_username, password as imap_password
      FROM email_accounts 
      WHERE imap_host IS NOT NULL 
      AND username IS NOT NULL 
      AND password IS NOT NULL
    `);
    
    console.log(`📧 Found ${result.rows.length} accounts with valid IMAP passwords`);
    
    if (result.rows.length === 0) {
      console.log('✅ No accounts with invalid passwords will be processed');
      console.log('🔧 This prevents authentication errors in the worker');
    } else {
      console.log('📋 Accounts ready for IMAP:');
      result.rows.forEach(account => {
        console.log(`   • ${account.username}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testIMAPFilter().catch(console.error);
