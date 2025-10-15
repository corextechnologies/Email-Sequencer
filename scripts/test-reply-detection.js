// Test script to verify reply detection system
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testReplyDetection() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Reply Detection System...');
    
    // Check if email_replies table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_replies'
      );
    `);
    
    console.log('✅ email_replies table exists:', tableCheck.rows[0].exists);
    
    // Check if IMAP columns were added to email_accounts
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_accounts' 
      AND column_name IN ('imap_host', 'imap_port', 'imap_secure', 'imap_username', 'imap_password');
    `);
    
    console.log('✅ IMAP columns added:', columnCheck.rows.map(r => r.column_name));
    
    // Check indexes
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'email_replies';
    `);
    
    console.log('✅ Indexes created:', indexCheck.rows.map(r => r.indexname));
    
    console.log('🎉 Reply Detection System is ready!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Add IMAP settings to your email accounts in the database');
    console.log('2. Start the worker: npm start');
    console.log('3. Send test emails and reply to them');
    console.log('4. Check the email_replies table for detected replies');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testReplyDetection().catch(console.error);
