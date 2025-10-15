import { ImapReplyDetector } from '../services/imapReplyDetector';
import { ReplyProcessor } from '../services/replyProcessor';

const REPLY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export async function startReplyDetector(): Promise<void> {
  console.log('🔍 Starting reply detector worker...');
  
  const detector = new ImapReplyDetector();
  const processor = new ReplyProcessor();

  async function checkForReplies() {
    try {
      console.log('🔍 Checking for email replies...');
      
      const replies = await detector.checkAllAccountsForReplies();
      
      if (replies.length > 0) {
        console.log(`📧 Found ${replies.length} new replies`);
        await processor.processMultipleReplies(replies);
        console.log(`✅ Processed ${replies.length} replies`);
      } else {
        console.log('📧 No new replies found');
      }
    } catch (error) {
      console.error('❌ Error checking for replies:', error);
    }
  }

  // Run immediately
  await checkForReplies();

  // Then run every 5 minutes
  setInterval(checkForReplies, REPLY_CHECK_INTERVAL);
  
  console.log('✅ Reply detector worker started successfully');
}
