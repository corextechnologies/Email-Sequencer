// Script to trigger the reply detector worker manually
// This script mimics what the running worker does when checking for replies
// It both detects AND processes replies (unlike the old version that only detected)
require('dotenv').config();

// Import the compiled TypeScript code
const { ImapReplyDetector } = require('../dist/services/imapReplyDetector');
const { ReplyProcessor } = require('../dist/services/replyProcessor');
const { Database } = require('../dist/database/connection');

async function triggerReplyDetection() {
  console.log('🚀 Triggering Reply Detection & Processing...');
  console.log('='.repeat(60));
  console.log('📋 This script mimics the worker\'s reply detection cycle');
  console.log('   It will detect replies AND process them immediately');
  console.log('='.repeat(60));
  
  try {
    // Initialize database connection
    console.log('\n📦 Initializing database connection...');
    await Database.initialize();
    console.log('✅ Database connection established');
    
    // Create reply detector and processor instances
    console.log('\n🔍 Creating reply detector and processor instances...');
    const detector = new ImapReplyDetector();
    const processor = new ReplyProcessor();
    
    // Trigger reply detection (same as worker does)
    console.log('\n📧 Checking all email accounts for replies...');
    console.log('-'.repeat(60));
    
    const startTime = Date.now();
    const replies = await detector.checkAllAccountsForReplies();
    const detectionDuration = Date.now() - startTime;
    
    console.log('-'.repeat(60));
    console.log(`\n✅ Reply detection completed in ${detectionDuration}ms`);
    console.log(`📊 Detection Results:`);
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
      
      // Process replies (same as worker does)
      console.log('\n🔄 Processing detected replies...');
      console.log('-'.repeat(60));
      
      const processStartTime = Date.now();
      await processor.processMultipleReplies(replies);
      const processDuration = Date.now() - processStartTime;
      
      console.log('-'.repeat(60));
      console.log(`\n✅ Processing completed in ${processDuration}ms`);
      console.log(`📊 Processing Results:`);
      console.log(`   • Replies processed: ${replies.length}`);
      console.log(`   • Contact statuses updated to 'replied'`);
      console.log(`   • Events logged in database`);
      console.log(`   • Reply records saved to email_replies table`);
      
      console.log('\n✅ All replies have been detected and processed!');
      console.log('   The worker will skip these replies on its next check since they\'re already processed.');
    } else {
      console.log('   ℹ️  No new replies detected at this time.');
      console.log('   This is normal if there are no recent replies.');
    }
    
    // Clean up
    await Database.close();
    console.log('\n✅ Script completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during reply detection/processing:');
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
