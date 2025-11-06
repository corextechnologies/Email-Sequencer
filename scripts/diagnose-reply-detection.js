// Comprehensive diagnostic script for reply detection system
// This script checks all potential issues with reply detection
require('dotenv').config();

const { Pool } = require('pg');
const { Database } = require('../dist/database/connection');
const { ImapReplyDetector } = require('../dist/services/imapReplyDetector');
const { EncryptionHelper } = require('../dist/utils/encryption');

async function diagnoseReplyDetection() {
  console.log('🔍 REPLY DETECTION DIAGNOSTIC SCRIPT');
  console.log('='.repeat(70));
  console.log('');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 1. Check Database Connection
    console.log('📦 STEP 1: Checking Database Connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // 2. Check Email Accounts Configuration
    console.log('📧 STEP 2: Checking Email Accounts Configuration...');
    const accountsCheck = await pool.query(`
      SELECT 
        id, 
        username, 
        is_active,
        imap_host IS NOT NULL as has_imap_host,
        imap_port,
        encrypted_password IS NOT NULL as has_password,
        smtp_host IS NOT NULL as has_smtp_host,
        COALESCE(imap_username, username) as imap_username,
        CASE 
          WHEN imap_password IS NOT NULL AND imap_password != 'YOUR_APP_PASSWORD_HERE' 
          THEN 'imap_password' 
          WHEN encrypted_password IS NOT NULL 
          THEN 'encrypted_password' 
          ELSE 'none' 
        END as password_source
      FROM email_accounts
      WHERE is_active = true
      ORDER BY id
    `);

    if (accountsCheck.rows.length === 0) {
      console.log('❌ No active email accounts found!\n');
    } else {
      console.log(`✅ Found ${accountsCheck.rows.length} active email account(s):\n`);
      accountsCheck.rows.forEach((acc, idx) => {
        console.log(`   Account ${idx + 1}: ${acc.username} (ID: ${acc.id})`);
        console.log(`   • IMAP Host: ${acc.has_imap_host ? '✅ Set' : '❌ Missing'}`);
        console.log(`   • IMAP Port: ${acc.imap_port || '❌ Not set'}`);
        console.log(`   • IMAP Username: ${acc.imap_username}`);
        console.log(`   • Password Source: ${acc.password_source}`);
        console.log(`   • SMTP Host: ${acc.has_smtp_host ? '✅ Set' : '❌ Missing'}`);
        
        // Check if account is ready for reply detection
        const isReady = acc.has_imap_host && acc.imap_port && acc.password_source !== 'none';
        console.log(`   • Ready for Reply Detection: ${isReady ? '✅ YES' : '❌ NO'}`);
        console.log('');
      });
    }

    // 3. Check Sent Messages (to verify message IDs are being stored)
    console.log('📨 STEP 3: Checking Sent Messages (Message IDs)...');
    const messagesCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT provider_message_id) as unique_message_ids,
        COUNT(CASE WHEN provider_message_id IS NULL THEN 1 END) as null_message_ids,
        COUNT(CASE WHEN provider_message_id IS NOT NULL THEN 1 END) as with_message_ids,
        MIN(created_at) as oldest_message,
        MAX(created_at) as newest_message
      FROM messages
      WHERE direction = 'outbound'
    `);

    const msgStats = messagesCheck.rows[0];
    console.log(`   • Total Outbound Messages: ${msgStats.total_messages}`);
    console.log(`   • Messages with Message ID: ${msgStats.with_message_ids}`);
    console.log(`   • Messages without Message ID: ${msgStats.null_message_ids}`);
    console.log(`   • Unique Message IDs: ${msgStats.unique_message_ids}`);
    console.log(`   • Oldest Message: ${msgStats.oldest_message || 'N/A'}`);
    console.log(`   • Newest Message: ${msgStats.newest_message || 'N/A'}`);

    if (parseInt(msgStats.null_message_ids) > 0) {
      console.log(`   ⚠️  WARNING: ${msgStats.null_message_ids} messages have NULL message IDs!`);
    }

    // Show sample message IDs
    const sampleMessages = await pool.query(`
      SELECT 
        m.id,
        m.provider_message_id,
        m.smtp_account_id,
        m.campaign_id,
        m.contact_id,
        m.created_at,
        ea.username as account_username
      FROM messages m
      LEFT JOIN email_accounts ea ON m.smtp_account_id = ea.id
      WHERE m.direction = 'outbound'
      AND m.provider_message_id IS NOT NULL
      ORDER BY m.created_at DESC
      LIMIT 5
    `);

    if (sampleMessages.rows.length > 0) {
      console.log(`\n   Sample Message IDs (last 5):`);
      sampleMessages.rows.forEach((msg, idx) => {
        console.log(`   ${idx + 1}. Message ID: ${msg.provider_message_id}`);
        console.log(`      Account: ${msg.account_username} (ID: ${msg.smtp_account_id})`);
        console.log(`      Campaign: ${msg.campaign_id}, Contact: ${msg.contact_id}`);
        console.log(`      Sent: ${msg.created_at}`);
        console.log('');
      });
    }
    console.log('');

    // 4. Check Existing Replies
    console.log('📬 STEP 4: Checking Existing Replies...');
    const repliesCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_replies,
        COUNT(DISTINCT original_message_id) as unique_original_ids,
        COUNT(DISTINCT reply_message_id) as unique_reply_ids,
        MIN(reply_received_at) as oldest_reply,
        MAX(reply_received_at) as newest_reply
      FROM email_replies
    `);

    const replyStats = repliesCheck.rows[0];
    console.log(`   • Total Replies Detected: ${replyStats.total_replies}`);
    console.log(`   • Unique Original Message IDs: ${replyStats.unique_original_ids}`);
    console.log(`   • Unique Reply Message IDs: ${replyStats.unique_reply_ids}`);
    console.log(`   • Oldest Reply: ${replyStats.oldest_reply || 'N/A'}`);
    console.log(`   • Newest Reply: ${replyStats.newest_reply || 'N/A'}`);

    // Check if replies can be matched to original messages
    if (parseInt(replyStats.total_replies) > 0) {
      const matchedReplies = await pool.query(`
        SELECT COUNT(*) as matched
        FROM email_replies er
        INNER JOIN messages m ON er.original_message_id = m.provider_message_id
        WHERE m.direction = 'outbound'
      `);
      console.log(`   • Replies Matched to Original Messages: ${matchedReplies.rows[0].matched}`);
      console.log(`   • Unmatched Replies: ${parseInt(replyStats.total_replies) - parseInt(matchedReplies.rows[0].matched)}`);
    }
    console.log('');

    // 5. Test IMAP Connection for Each Account
    console.log('🔌 STEP 5: Testing IMAP Connections...');
    const readyAccounts = await pool.query(`
      SELECT 
        id, 
        username, 
        imap_host, 
        imap_port, 
        COALESCE(imap_secure, true) as imap_secure,
        COALESCE(imap_username, username) as imap_username,
        CASE 
          WHEN imap_password IS NOT NULL AND imap_password != 'YOUR_APP_PASSWORD_HERE' 
          THEN imap_password 
          ELSE encrypted_password 
        END as password
      FROM email_accounts
      WHERE is_active = true
      AND imap_host IS NOT NULL
      AND (
        (imap_password IS NOT NULL AND imap_password != 'YOUR_APP_PASSWORD_HERE')
        OR encrypted_password IS NOT NULL
      )
    `);

    if (readyAccounts.rows.length === 0) {
      console.log('   ❌ No accounts ready for IMAP connection testing\n');
    } else {
      console.log(`   Testing ${readyAccounts.rows.length} account(s)...\n`);
      
      for (const account of readyAccounts.rows) {
        try {
          let decryptedPassword;
          try {
            decryptedPassword = EncryptionHelper.decrypt(account.password);
          } catch (error) {
            console.log(`   ❌ Account ${account.username}: Failed to decrypt password`);
            continue;
          }

          const Imap = require('imap');
          const imap = new Imap({
            host: account.imap_host,
            port: account.imap_port,
            tls: account.imap_secure,
            user: account.imap_username,
            password: decryptedPassword,
            tlsOptions: { rejectUnauthorized: false }
          });

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              imap.end();
              reject(new Error('Connection timeout'));
            }, 10000);

            imap.once('ready', () => {
              clearTimeout(timeout);
              console.log(`   ✅ Account ${account.username}: IMAP connection successful`);
              imap.end();
              resolve();
            });

            imap.once('error', (err) => {
              clearTimeout(timeout);
              console.log(`   ❌ Account ${account.username}: IMAP connection failed - ${err.message}`);
              reject(err);
            });

            imap.connect();
          });
        } catch (error) {
          console.log(`   ❌ Account ${account.username}: ${error.message}`);
        }
      }
      console.log('');
    }

    // 6. Test Message ID Matching Logic
    console.log('🔗 STEP 6: Testing Message ID Matching Logic...');
    
    // Get a sample message ID
    const sampleMsg = await pool.query(`
      SELECT provider_message_id, smtp_account_id
      FROM messages
      WHERE direction = 'outbound'
      AND provider_message_id IS NOT NULL
      LIMIT 1
    `);

    if (sampleMsg.rows.length > 0) {
      const testMessageId = sampleMsg.rows[0].provider_message_id;
      const testAccountId = sampleMsg.rows[0].smtp_account_id;
      
      console.log(`   Testing with Message ID: ${testMessageId}`);
      console.log(`   Account ID: ${testAccountId}`);
      
      // Test exact match
      const exactMatch = await pool.query(`
        SELECT campaign_id, contact_id 
        FROM messages 
        WHERE provider_message_id = $1 
        AND smtp_account_id = $2 
        AND direction = 'outbound'
      `, [testMessageId, testAccountId]);
      
      console.log(`   • Exact Match: ${exactMatch.rows.length > 0 ? '✅ Found' : '❌ Not found'}`);
      
      // Test with angle brackets (common in email headers)
      const withBrackets = `<${testMessageId}>`;
      const bracketMatch = await pool.query(`
        SELECT campaign_id, contact_id 
        FROM messages 
        WHERE provider_message_id = $1 
        AND smtp_account_id = $2 
        AND direction = 'outbound'
      `, [withBrackets, testAccountId]);
      
      console.log(`   • With Angle Brackets: ${bracketMatch.rows.length > 0 ? '✅ Found' : '❌ Not found'}`);
      
      // Test without angle brackets (if message ID has them)
      const withoutBrackets = testMessageId.replace(/^<|>$/g, '');
      if (withoutBrackets !== testMessageId) {
        const noBracketMatch = await pool.query(`
          SELECT campaign_id, contact_id 
          FROM messages 
          WHERE provider_message_id = $1 
          AND smtp_account_id = $2 
          AND direction = 'outbound'
        `, [withoutBrackets, testAccountId]);
        
        console.log(`   • Without Angle Brackets: ${noBracketMatch.rows.length > 0 ? '✅ Found' : '❌ Not found'}`);
      }
      
      console.log(`   ⚠️  NOTE: Message IDs in email headers may have angle brackets, but stored IDs may not (or vice versa)`);
    } else {
      console.log('   ⚠️  No messages with message IDs found to test');
    }
    console.log('');

    // 7. Check Recent Messages (last 24 hours)
    console.log('⏰ STEP 7: Checking Recent Activity (Last 24 Hours)...');
    const recentMessages = await pool.query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE direction = 'outbound'
      AND created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    const recentReplies = await pool.query(`
      SELECT COUNT(*) as count
      FROM email_replies
      WHERE reply_received_at >= NOW() - INTERVAL '24 hours'
    `);
    
    console.log(`   • Messages Sent (last 24h): ${recentMessages.rows[0].count}`);
    console.log(`   • Replies Detected (last 24h): ${recentReplies.rows[0].count}`);
    console.log('');

    // 8. Run Actual Reply Detection Test
    console.log('🧪 STEP 8: Running Reply Detection Test...');
    try {
      await Database.initialize();
      const detector = new ImapReplyDetector();
      const replies = await detector.checkAllAccountsForReplies();
      console.log(`   ✅ Reply detection test completed`);
      console.log(`   • Replies found: ${replies.length}`);
      
      if (replies.length > 0) {
        console.log(`\n   Detected Replies:`);
        replies.forEach((reply, idx) => {
          console.log(`   ${idx + 1}. From: ${reply.reply_sender_email}`);
          console.log(`      Original Message ID: ${reply.original_message_id}`);
          console.log(`      Reply Message ID: ${reply.reply_message_id}`);
          console.log(`      Campaign: ${reply.campaign_id}, Contact: ${reply.contact_id}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Reply detection test failed: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }
    console.log('');

    // 9. Summary and Recommendations
    console.log('📋 STEP 9: Summary and Recommendations...');
    console.log('='.repeat(70));
    
    const issues = [];
    const recommendations = [];

    if (accountsCheck.rows.length === 0) {
      issues.push('No active email accounts');
      recommendations.push('Add at least one active email account with IMAP settings');
    }

    const accountsReady = accountsCheck.rows.filter(acc => 
      acc.has_imap_host && acc.imap_port && acc.password_source !== 'none'
    );
    
    if (accountsReady.length === 0 && accountsCheck.rows.length > 0) {
      issues.push('No email accounts configured for IMAP');
      recommendations.push('Configure IMAP host, port, and password for email accounts');
    }

    if (parseInt(msgStats.null_message_ids) > 0) {
      issues.push(`${msgStats.null_message_ids} messages have NULL message IDs`);
      recommendations.push('Check email sending code - message IDs should be stored');
    }

    if (parseInt(recentMessages.rows[0].count) > 0 && parseInt(recentReplies.rows[0].count) === 0) {
      issues.push('Messages sent but no replies detected in last 24 hours');
      recommendations.push('Verify reply detection worker is running');
      recommendations.push('Check if replies are actually being received');
      recommendations.push('Verify message ID format matching between sent emails and replies');
    }

    if (issues.length > 0) {
      console.log('   ⚠️  ISSUES FOUND:');
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      console.log('');
      console.log('   💡 RECOMMENDATIONS:');
      recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`);
      });
    } else {
      console.log('   ✅ No obvious issues detected');
      console.log('   💡 If replies still aren\'t being detected:');
      console.log('      1. Verify replies are actually being sent to the email account');
      console.log('      2. Check worker logs for errors');
      console.log('      3. Verify message ID format consistency');
      console.log('      4. Test with a manual reply to see if it\'s detected');
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('✅ Diagnostic completed');

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    try {
      await Database.close();
    } catch (e) {
      // Ignore
    }
    process.exit(0);
  }
}

diagnoseReplyDetection().catch(console.error);

