const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runReplyResponsesMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running reply responses migration...');
    
    // Create reply_responses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reply_responses (
        id SERIAL PRIMARY KEY,
        email_reply_id INTEGER NOT NULL REFERENCES email_replies(id) ON DELETE CASCADE,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        response_subject TEXT NOT NULL,
        response_content TEXT NOT NULL,
        response_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        sent_by_user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Add indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reply_responses_email_reply_id ON reply_responses(email_reply_id);
      CREATE INDEX IF NOT EXISTS idx_reply_responses_campaign_id ON reply_responses(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_reply_responses_contact_id ON reply_responses(contact_id);
      CREATE INDEX IF NOT EXISTS idx_reply_responses_sent_by_user_id ON reply_responses(sent_by_user_id);
      CREATE INDEX IF NOT EXISTS idx_reply_responses_response_sent_at ON reply_responses(response_sent_at);
    `);

    console.log('✅ Reply responses migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runReplyResponsesMigration().catch(console.error);
