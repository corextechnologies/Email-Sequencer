import { Database } from '../database/connection';
import { DetectedReply } from './imapReplyDetector';
import { Pool } from 'pg';

export class ReplyProcessor {
  private db: Pool | null = null;

  private async ensureDatabaseConnection(): Promise<Pool> {
    if (!this.db || this.db.ended) {
      try {
        await Database.initialize();
        this.db = Database.getPool();
        console.log('🔗 Reply processor database connection established');
      } catch (error) {
        console.error('❌ Failed to initialize database connection for reply processor:', error);
        throw new Error('Database connection failed');
      }
    }
    return this.db;
  }

  async processReply(reply: DetectedReply): Promise<void> {
    try {
      const db = await this.ensureDatabaseConnection();
      
      // Check if reply already processed
      const existing = await db.query(`
        SELECT id FROM email_replies WHERE reply_message_id = $1
      `, [reply.reply_message_id]);

      if (existing.rows.length > 0) {
        console.log(`📧 Reply ${reply.reply_message_id} already processed`);
        return;
      }

      // Insert reply record
      await db.query(`
        INSERT INTO email_replies (
          campaign_id, contact_id, original_message_id, reply_message_id,
          reply_subject, reply_content, reply_sender_email, reply_received_at, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        reply.campaign_id,
        reply.contact_id,
        reply.original_message_id,
        reply.reply_message_id,
        reply.reply_subject,
        reply.reply_content,
        reply.reply_sender_email,
        reply.reply_received_at
      ]);

      // Update contact status to 'replied'
      await db.query(`
        UPDATE campaign_contacts 
        SET status = 'replied', last_email_replied_at = NOW()
        WHERE campaign_id = $1 AND contact_id = $2
      `, [reply.campaign_id, reply.contact_id]);

      // Log reply event
      await db.query(`
        INSERT INTO events (campaign_id, contact_id, type, meta, occurred_at)
        VALUES ($1, $2, 'replied', $3, NOW())
      `, [
        reply.campaign_id,
        reply.contact_id,
        JSON.stringify({
          reply_subject: reply.reply_subject,
          reply_sender: reply.reply_sender_email,
          original_message_id: reply.original_message_id
        })
      ]);

      console.log(`✅ Processed reply from ${reply.reply_sender_email} for campaign ${reply.campaign_id}, contact ${reply.contact_id}`);

    } catch (error) {
      console.error('❌ Error processing reply:', error);
      throw error;
    }
  }

  async processMultipleReplies(replies: DetectedReply[]): Promise<void> {
    console.log(`🔄 Processing ${replies.length} replies...`);
    
    for (const reply of replies) {
      try {
        await this.processReply(reply);
      } catch (error) {
        console.error(`❌ Failed to process reply ${reply.reply_message_id}:`, error);
      }
    }
    
    console.log(`✅ Finished processing ${replies.length} replies`);
  }
}
