import * as bcrypt from 'bcryptjs';
import { Database } from './connection';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function seed() {
  try {
    await Database.initialize();
    
    console.log('🌱 Seeding database...');
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const userResult = await Database.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id',
      ['test@example.com', hashedPassword]
    );
    
    if (userResult.rows.length > 0) {
      console.log('✅ Test user created: test@example.com / password123');
      
      // Create test email account
      const { EncryptionHelper } = await import('../utils/encryption');
      const encryptedPassword = EncryptionHelper.encrypt('testpassword');
      
      await Database.query(
        `INSERT INTO email_accounts 
         (user_id, provider, imap_host, imap_port, smtp_host, smtp_port, username, encrypted_password) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT DO NOTHING`,
        [
          userResult.rows[0].id,
          'Gmail',
          'imap.gmail.com',
          993,
          'smtp.gmail.com',
          587,
          'test@gmail.com',
          encryptedPassword
        ]
      );
      
      console.log('✅ Test email account created');
    } else {
      console.log('ℹ️ Test user already exists');
    }
    
    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
