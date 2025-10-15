const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running reply detection migration...');
    
    // Create email_replies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_replies (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        original_message_id VARCHAR(255),
        reply_message_id VARCHAR(255),
        reply_subject TEXT,
        reply_content TEXT,
        reply_sender_email VARCHAR(255),
        reply_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(reply_message_id)
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_replies_campaign_id ON email_replies(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_email_replies_contact_id ON email_replies(contact_id);
      CREATE INDEX IF NOT EXISTS idx_email_replies_received_at ON email_replies(reply_received_at);
      CREATE INDEX IF NOT EXISTS idx_email_replies_processed_at ON email_replies(processed_at);
    `);

    // Add IMAP columns to email_accounts
    await client.query(`
      ALTER TABLE email_accounts 
      ADD COLUMN IF NOT EXISTS imap_host VARCHAR(255),
      ADD COLUMN IF NOT EXISTS imap_port INTEGER DEFAULT 993,
      ADD COLUMN IF NOT EXISTS imap_secure BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS imap_username VARCHAR(255),
      ADD COLUMN IF NOT EXISTS imap_password TEXT;
    `);

    console.log('✅ Reply detection migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
