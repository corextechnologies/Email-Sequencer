// Helper script to configure IMAP settings for email accounts
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function configureIMAPSettings() {
  const client = await pool.connect();
  
  try {
    console.log('⚙️  Configuring IMAP Settings...');
    
    // Get all email accounts
    const accounts = await client.query(`
      SELECT id, username, smtp_host 
      FROM email_accounts 
      WHERE smtp_host IS NOT NULL
    `);
    
    console.log(`📧 Found ${accounts.rows.length} email accounts:`);
    accounts.rows.forEach(account => {
      console.log(`   • ID: ${account.id}, Username: ${account.username}, SMTP: ${account.smtp_host}`);
    });
    
    if (accounts.rows.length === 0) {
      console.log('❌ No email accounts found. Please add email accounts first.');
      return;
    }
    
    // Configure IMAP settings based on SMTP host
    for (const account of accounts.rows) {
      let imapHost = '';
      let imapPort = 993;
      let imapSecure = true;
      
      // Determine IMAP settings based on SMTP host
      if (account.smtp_host.includes('gmail.com')) {
        imapHost = 'imap.gmail.com';
        imapPort = 993;
        imapSecure = true;
      } else if (account.smtp_host.includes('outlook.com') || account.smtp_host.includes('hotmail.com')) {
        imapHost = 'outlook.office365.com';
        imapPort = 993;
        imapSecure = true;
      } else if (account.smtp_host.includes('yahoo.com')) {
        imapHost = 'imap.mail.yahoo.com';
        imapPort = 993;
        imapSecure = true;
      } else {
        // Generic IMAP settings
        imapHost = account.smtp_host.replace('smtp.', 'imap.');
        imapPort = 993;
        imapSecure = true;
      }
      
      // Update the account with IMAP settings
      await client.query(`
        UPDATE email_accounts 
        SET imap_host = $1, imap_port = $2, imap_secure = $3, imap_username = $4, imap_password = $5
        WHERE id = $6
      `, [
        imapHost,
        imapPort,
        imapSecure,
        account.username, // Use same username as SMTP
        'YOUR_APP_PASSWORD_HERE', // User needs to set this
        account.id
      ]);
      
      console.log(`✅ Configured IMAP for ${account.username}:`);
      console.log(`   • IMAP Host: ${imapHost}`);
      console.log(`   • IMAP Port: ${imapPort}`);
      console.log(`   • IMAP Secure: ${imapSecure}`);
      console.log(`   • IMAP Username: ${account.username}`);
      console.log(`   • IMAP Password: [NEEDS TO BE SET MANUALLY]`);
    }
    
    console.log('');
    console.log('⚠️  IMPORTANT: You need to manually set the IMAP passwords!');
    console.log('📋 For Gmail:');
    console.log('   1. Enable 2-Factor Authentication');
    console.log('   2. Generate an App Password');
    console.log('   3. Update the imap_password field in email_accounts table');
    console.log('');
    console.log('📋 For other providers:');
    console.log('   1. Check their IMAP settings documentation');
    console.log('   2. Update the imap_password field in email_accounts table');
    
  } catch (error) {
    console.error('❌ Configuration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

configureIMAPSettings().catch(console.error);
