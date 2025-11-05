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

async function runEmailVerificationMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running email verification fields migration (016)...');
    console.log('📋 Adding verification_code, verification_expires_at, email_verified, and temp_password_hash fields to users table');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '016_add_email_verification_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Email verification fields migration completed successfully');
    console.log('   - Added verification_code column (VARCHAR 255)');
    console.log('   - Added verification_expires_at column (TIMESTAMP)');
    console.log('   - Added email_verified column (BOOLEAN, default false)');
    console.log('   - Added temp_password_hash column (VARCHAR 255)');
    console.log('   - Created index on verification_code');
    
    // Verify the migration
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('verification_code', 'verification_expires_at', 'email_verified', 'temp_password_hash')
      ORDER BY column_name;
    `);
    
    if (verifyResult.rows.length === 4) {
      console.log('✅ Verification: All columns exist in users table');
      verifyResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
      });
    } else {
      console.warn('⚠️  Warning: Could not verify all columns were added');
      console.warn(`   Expected 4 columns, found ${verifyResult.rows.length}`);
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
    await runEmailVerificationMigration();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration script failed');
    process.exit(1);
  }
})();

