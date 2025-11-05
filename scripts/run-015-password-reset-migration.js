const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD ? 
      `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}` :
      null)
});

async function runPasswordResetMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running password reset fields migration (015)...');
    console.log('📋 Adding reset_token and reset_token_expires_at fields to users table');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '015_add_password_reset_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Password reset fields migration completed successfully');
    console.log('   - Added reset_token column (VARCHAR 255)');
    console.log('   - Added reset_token_expires_at column (TIMESTAMP)');
    console.log('   - Created index on reset_token');
    
    // Verify the migration
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('reset_token', 'reset_token_expires_at')
      ORDER BY column_name;
    `);
    
    if (verifyResult.rows.length === 2) {
      console.log('✅ Verification: Both columns exist in users table');
      verifyResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.warn('⚠️  Warning: Could not verify all columns were added');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42701') {
      console.log('   Note: Column already exists. This is safe to ignore.');
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Check if database connection is available
async function checkConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Please check your DATABASE_URL or PostgreSQL environment variables');
    return false;
  }
}

// Main execution
(async () => {
  console.log('🔍 Checking database connection...');
  const connected = await checkConnection();
  
  if (!connected) {
    process.exit(1);
  }
  
  try {
    await runPasswordResetMigration();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration script failed');
    process.exit(1);
  }
})();

