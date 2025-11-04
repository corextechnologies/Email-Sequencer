// Script to trigger the reply detector worker manually for testing
require('dotenv').config();
const path = require('path');

// Import the compiled TypeScript code
const { ImapReplyDetector } = require('../dist/services/imapReplyDetector');
const { Database } = require('../dist/database/connection');

async function triggerReplyDetection() {
  console.log('🚀 Triggering Reply Detection Worker...');
  console.log('='.repeat(60));
  
  try {
    // Initialize database connection
    console.log('📦 Initializing database connection...');
    await Database.initialize();
    console.log('✅ Database connection established');
    
    // Create reply detector instance
    console.log('\n🔍 Creating reply detector instance...');
    const detector = new ImapReplyDetector();
    
    // Trigger reply detection
    console.log('📧 Checking all email accounts for replies...');
    console.log('-'.repeat(60));
    
    const startTime = Date.now();
    const replies = await detector.checkAllAccountsForReplies();
    const duration = Date.now() - startTime;
    
    console.log('-'.repeat(60));
    console.log(`\n✅ Reply detection completed in ${duration}ms`);
    console.log(`📊 Results:`);
    console.log(`   • Replies found: ${replies.length}`);
    
    if (replies.length > 0) {
      console.log('\n📬 Detected Replies:');
      replies.forEach((reply, index) => {
        console.log(`\n   ${index + 1}. Reply #${reply.contact_id}:`);
        console.log(`      • Campaign ID: ${reply.campaign_id}`);
        console.log(`      • Contact ID: ${reply.contact_id}`);
        console.log(`      • From: ${reply.reply_sender_email}`);
        console.log(`      • Subject: ${reply.reply_subject.substring(0, 50)}${reply.reply_subject.length > 50 ? '...' : ''}`);
        console.log(`      • Received: ${reply.reply_received_at}`);
        console.log(`      • Original Message ID: ${reply.original_message_id}`);
        console.log(`      • Reply Message ID: ${reply.reply_message_id}`);
      });
      
      console.log('\n💡 Note: These replies need to be processed by the ReplyProcessor');
      console.log('   The worker will automatically process them on the next cycle.');
    } else {
      console.log('   ℹ️  No new replies detected at this time.');
      console.log('   This is normal if there are no recent replies.');
    }
    
    // Clean up
    await Database.close();
    console.log('\n✅ Script completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during reply detection:');
    console.error(error);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    try {
      await Database.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
}

// Run the script
triggerReplyDetection();

