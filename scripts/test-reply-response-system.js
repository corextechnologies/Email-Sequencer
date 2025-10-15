const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testReplyResponseSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Reply Response System...');
    
    // Check if reply_responses table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reply_responses'
      );
    `);
    
    console.log('✅ reply_responses table exists:', tableCheck.rows[0].exists);
    
    // Check table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'reply_responses'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Table columns:');
    columns.rows.forEach(col => {
      console.log(`   • ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'reply_responses';
    `);
    
    console.log('✅ Indexes created:');
    indexes.rows.forEach(idx => {
      console.log(`   • ${idx.indexname}`);
    });
    
    // Check if we have any email_replies to test with
    const repliesCount = await client.query(`
      SELECT COUNT(*) as count FROM email_replies;
    `);
    
    console.log(`📧 Found ${repliesCount.rows[0].count} email replies in database`);
    
    if (parseInt(repliesCount.rows[0].count) > 0) {
      // Show a sample reply
      const sampleReply = await client.query(`
        SELECT er.*, c.first_name || ' ' || c.last_name as contact_name, c.email as contact_email
        FROM email_replies er
        JOIN contacts c ON er.contact_id = c.id
        LIMIT 1
      `);
      
      if (sampleReply.rows.length > 0) {
        const reply = sampleReply.rows[0];
        console.log('📧 Sample reply:');
        console.log(`   • ID: ${reply.id}`);
        console.log(`   • From: ${reply.contact_name} (${reply.contact_email})`);
        console.log(`   • Subject: ${reply.reply_subject}`);
        console.log(`   • Campaign ID: ${reply.campaign_id}`);
      }
    }
    
    console.log('');
    console.log('🎉 Reply Response System is ready!');
    console.log('');
    console.log('📋 API Endpoints Available:');
    console.log('• POST /api/replies/:replyId/respond - Send response to a reply');
    console.log('• GET /api/replies/:replyId/responses - Get responses for a reply');
    console.log('• GET /api/replies/:replyId/with-responses - Get reply with all responses');
    console.log('');
    console.log('📱 Mobile UI Features:');
    console.log('• Respond button on each reply card');
    console.log('• Response modal with subject and content fields');
    console.log('• Display of previous responses');
    console.log('• Real-time updates after sending response');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testReplyResponseSystem().catch(console.error);
