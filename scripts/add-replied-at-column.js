// Add missing last_email_replied_at column to campaign_contacts
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addRepliedAtColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding last_email_replied_at column to campaign_contacts...');
    
    // Add the missing column
    await client.query(`
      ALTER TABLE campaign_contacts 
      ADD COLUMN IF NOT EXISTS last_email_replied_at TIMESTAMP WITH TIME ZONE
    `);
    
    console.log('✅ Column added successfully!');
    
    // Check the table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'campaign_contacts'
      AND column_name LIKE '%replied%'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Reply-related columns in campaign_contacts:');
    columns.rows.forEach(col => {
      console.log(`   • ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addRepliedAtColumn().catch(console.error);
