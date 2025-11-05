const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD ? 
      `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}` :
      null),
  ssl: { rejectUnauthorized: false }
});

async function resetPassword() {
  const client = await pool.connect();
  
  try {
    const email = 'test@bobos.ai';
    const newPassword = 'Corex004';
    
    console.log(`🔄 Resetting password for ${email}...`);
    
    // Check if user exists
    const userCheck = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length === 0) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }
    
    const user = userCheck.rows[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Hash the new password using bcrypt with salt round 10
    console.log('🔐 Hashing new password...');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    console.log('📝 Updating password in database...');
    const updateResult = await client.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, updated_at`,
      [passwordHash, user.id]
    );
    
    if (updateResult.rows.length === 0) {
      console.error('❌ Failed to update password');
      process.exit(1);
    }
    
    const updatedUser = updateResult.rows[0];
    console.log(`✅ Password reset successful!`);
    console.log(`   - Email: ${updatedUser.email}`);
    console.log(`   - Updated at: ${updatedUser.updated_at}`);
    console.log(`   - New password: ${newPassword}`);
    
    // Verify the password can be used
    console.log('🔍 Verifying password hash...');
    const verifyResult = await client.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id]
    );
    
    const isValid = await bcrypt.compare(newPassword, verifyResult.rows[0].password_hash);
    if (isValid) {
      console.log('✅ Password verification successful - the new password is correctly hashed');
    } else {
      console.error('❌ Password verification failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
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
    await resetPassword();
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed');
    process.exit(1);
  }
})();

