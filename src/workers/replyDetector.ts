import { ImapReplyDetector } from '../services/imapReplyDetector';
import { ReplyProcessor } from '../services/replyProcessor';

const REPLY_CHECK_INTERVAL = 2 * 60 * 1000; // 5 minutes
const MAX_CONSECUTIVE_ERRORS = 3;
const ERROR_RECOVERY_DELAY = 30 * 1000; // 30 seconds

export async function startReplyDetector(): Promise<void> {
  console.log('🔍 Starting reply detector worker...');
  
  const detector = new ImapReplyDetector();
  const processor = new ReplyProcessor();
  let consecutiveErrors = 0;
  let isRunning = true;

  async function checkForReplies() {
    if (!isRunning) return;
    
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
      
      // Reset error counter on success
      consecutiveErrors = 0;
      
    } catch (error) {
      consecutiveErrors++;
      console.error(`❌ Error checking for replies (attempt ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);
      
      // If too many consecutive errors, pause and try to recover
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(`🚨 Too many consecutive errors (${consecutiveErrors}). Pausing reply detection for ${ERROR_RECOVERY_DELAY / 1000} seconds...`);
        
        // Wait before trying again
        setTimeout(() => {
          consecutiveErrors = 0;
          console.log('🔄 Attempting to recover reply detection...');
        }, ERROR_RECOVERY_DELAY);
      }
    }
  }

  // Graceful shutdown handler
  const shutdown = () => {
    console.log('🛑 Shutting down reply detector...');
    isRunning = false;
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Run immediately
  await checkForReplies();

  // Then run every 5 minutes
  const intervalId = setInterval(() => {
    if (isRunning) {
      checkForReplies();
    } else {
      clearInterval(intervalId);
    }
  }, REPLY_CHECK_INTERVAL);
  
  console.log('✅ Reply detector worker started successfully');
}
