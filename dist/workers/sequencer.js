"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connection_1 = require("../database/connection");
const queue_1 = require("../modules/campaigns/services/queue");
const mailer_1 = require("../modules/campaigns/services/mailer");
const rendering_1 = require("../modules/campaigns/services/rendering");
const emailFormatter_1 = require("../utils/emailFormatter");
const replyDetector_1 = require("./replyDetector");
async function checkCampaignCompletion(db, campaignId) {
    try {
        // Check if all contacts in the campaign have been processed
        // Contacts are considered "processed" when status is: completed, failed, bounced, replied, or unsubscribed
        const result = await db.query(`SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN status IN ('completed', 'failed', 'bounced', 'replied', 'unsubscribed') THEN 1 END) as processed_contacts,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_contacts
      FROM campaign_contacts 
      WHERE campaign_id = $1`, [campaignId]);
        if (result.rows.length === 0) {
            return;
        }
        const { total_contacts, processed_contacts, in_progress_contacts } = result.rows[0];
        console.log(`📊 Campaign ${campaignId} progress: ${processed_contacts}/${total_contacts} completed, ${in_progress_contacts} in progress`);
        // If all contacts have been processed (no pending or in_progress), mark campaign as completed
        if (parseInt(total_contacts) > 0 && parseInt(processed_contacts) === parseInt(total_contacts)) {
            const updateResult = await db.query(`UPDATE campaigns SET status = 'completed' WHERE id = $1 AND status = 'running' RETURNING id, status`, [campaignId]);
            if (updateResult.rows.length > 0) {
                console.log(`🎉 Campaign ${campaignId} completed! All ${total_contacts} contacts processed.`);
            }
        }
    }
    catch (error) {
        console.error(`Error checking campaign completion for campaign ${campaignId}:`, error);
    }
}
async function run() {
    console.log('🚀 Starting Email Marketing Sequencer Worker...');
    console.log('📅 Worker started at:', new Date().toISOString());
    // Rate limiting configuration
    const EMAILS_PER_HOUR = parseInt(process.env.EMAILS_PER_HOUR || '50');
    const DELAY_BETWEEN_EMAILS_MS = EMAILS_PER_HOUR > 0
        ? Math.floor((60 * 60 * 1000) / EMAILS_PER_HOUR)
        : 0;
    console.log('⚙️  Rate Limiting Configuration:');
    console.log(`   • Limit: ${EMAILS_PER_HOUR} emails per hour`);
    console.log(`   • Delay: ${Math.round(DELAY_BETWEEN_EMAILS_MS / 1000)} seconds between emails`);
    console.log(`   • ${EMAILS_PER_HOUR > 0 ? 'Rate limiting ENABLED' : 'Rate limiting DISABLED'}`);
    await connection_1.Database.initialize();
    console.log('✅ Database connected successfully');
    // Start reply detector
    console.log('🔍 Starting reply detector...');
    (0, replyDetector_1.startReplyDetector)().catch(console.error);
    // Clean up orphaned jobs from previous worker crashes/shutdowns
    console.log('🧹 Checking for orphaned jobs...');
    const db = connection_1.Database.getPool();
    const cleanupResult = await db.query(`UPDATE jobs 
     SET status = 'pending', attempts = attempts + 1 
     WHERE status = 'running' 
       AND updated_at < NOW() - INTERVAL '5 minutes'
     RETURNING id, queue, payload`);
    if (cleanupResult.rows.length > 0) {
        console.log(`♻️  Reset ${cleanupResult.rows.length} orphaned job(s) back to pending:`);
        cleanupResult.rows.forEach(job => {
            console.log(`   - Job ${job.id} (${job.queue}): ${JSON.stringify(job.payload)}`);
        });
    }
    else {
        console.log('✅ No orphaned jobs found');
    }
    const queue = new queue_1.JobQueue(connection_1.Database.getPool());
    console.log('🔄 Worker ready - waiting for jobs...');
    let running = true;
    let jobCount = 0;
    let lastEmailSentAt = 0;
    let consecutiveErrors = 0;
    const BASE_DELAY_MS = 1000; // Start with 1 second
    const MAX_DELAY_MS = 30000; // Cap at 30 seconds
    process.on('SIGINT', () => {
        console.log('🛑 Received SIGINT, shutting down gracefully...');
        running = false;
    });
    process.on('SIGTERM', () => {
        console.log('🛑 Received SIGTERM, shutting down gracefully...');
        running = false;
    });
    while (running) {
        try {
            const sendJob = await queue.fetchNext('send-email');
            // Reset error counter on successful connection
            if (consecutiveErrors > 0) {
                console.log(`✅ Database connection restored after ${consecutiveErrors} error(s)`);
                consecutiveErrors = 0;
            }
            if (sendJob) {
                jobCount++;
                console.log(`🎯 Worker processing job #${jobCount} at ${new Date().toISOString()}`);
                await handleSendEmail(queue, sendJob);
                console.log(`✅ Job #${jobCount} completed successfully`);
                // Rate limiting: wait before next email
                if (DELAY_BETWEEN_EMAILS_MS > 0) {
                    const now = Date.now();
                    const timeSinceLastEmail = now - lastEmailSentAt;
                    const remainingDelay = Math.max(0, DELAY_BETWEEN_EMAILS_MS - timeSinceLastEmail);
                    if (remainingDelay > 0) {
                        console.log(`⏱️  Rate limit: waiting ${Math.round(remainingDelay / 1000)}s before next email...`);
                        await new Promise(r => setTimeout(r, remainingDelay));
                    }
                    lastEmailSentAt = Date.now();
                }
            }
            else {
                // Only log every 30 seconds to avoid spam
                if (jobCount === 0 || Date.now() % 30000 < 1000) {
                    console.log('⏳ No jobs found, waiting...');
                }
                await new Promise(r => setTimeout(r, 500));
            }
        }
        catch (e) {
            consecutiveErrors++;
            // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s, then cap at 30s
            const delay = Math.min(BASE_DELAY_MS * Math.pow(2, Math.min(consecutiveErrors - 1, 4)), MAX_DELAY_MS);
            // Log every 10th error or first few errors to reduce spam
            if (consecutiveErrors <= 3 || consecutiveErrors % 10 === 0) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error(`❌ Worker loop error (attempt ${consecutiveErrors}, retrying in ${Math.round(delay / 1000)}s):`, errorMessage);
                // Log full error details only for first error or every 50th error
                if (consecutiveErrors === 1 || consecutiveErrors % 50 === 0) {
                    console.error('Full error details:', e);
                }
            }
            await new Promise(r => setTimeout(r, delay));
        }
    }
    console.log(`🏁 Worker shutting down. Processed ${jobCount} jobs total.`);
    await connection_1.Database.close();
}
async function handleSendEmail(queue, job) {
    const { campaign_id, contact_id } = job.payload || {};
    console.log(`🎬 Starting handleSendEmail for job ID: ${job.id}`);
    console.log(`📋 Job payload:`, job.payload);
    try {
        const db = connection_1.Database.getPool();
        console.log(`📧 Processing send-email job: Campaign ${campaign_id}, Contact ${contact_id}`);
        // Load campaign data
        const campRes = await db.query(`SELECT * FROM campaigns WHERE id=$1`, [campaign_id]);
        if (campRes.rows.length === 0) {
            throw new Error(`Campaign ${campaign_id} not found`);
        }
        const campaign = campRes.rows[0];
        // Check campaign status before processing
        if (campaign.status === 'paused') {
            console.log(`⏸️  Campaign ${campaign_id} is paused, re-enqueueing job for later`);
            // Re-enqueue for 1 hour later
            await queue.enqueue('send-email', job.payload, {
                runAt: new Date(Date.now() + 3600000), // 1 hour later
                idempotencyKey: `${campaign_id}:${contact_id}`,
                maxAttempts: 3
            });
            await queue.complete(job.id);
            return;
        }
        if (campaign.status === 'cancelled') {
            console.log(`❌ Campaign ${campaign_id} is cancelled, abandoning job`);
            await queue.complete(job.id);
            return;
        }
        if (campaign.status !== 'running') {
            console.log(`⚠️  Campaign ${campaign_id} has unexpected status '${campaign.status}', proceeding anyway`);
        }
        // Validate campaign has from_email_account_id (always required)
        if (!campaign.from_email_account_id) {
            throw new Error(`Campaign ${campaign_id} missing from_email_account_id`);
        }
        // Note: We don't validate email_subject/email_body here anymore
        // because sequences don't need campaign template
        // Validation happens later after we check for sequence
        const contactRes = await db.query(`SELECT * FROM contacts c JOIN campaign_contacts cc ON cc.contact_id=c.id WHERE cc.campaign_id=$1 AND cc.contact_id=$2`, [campaign_id, contact_id]);
        if (contactRes.rows.length === 0) {
            throw new Error(`Contact ${contact_id} not found in campaign ${campaign_id}`);
        }
        const contact = contactRes.rows[0];
        // Get user ID from contact or campaign
        const userId = contact.user_id || campaign.user_id;
        if (!userId) {
            throw new Error(`No user ID found for contact ${contact_id} or campaign ${campaign_id}`);
        }
        const userRes = await db.query(`SELECT * FROM users WHERE id=$1`, [userId]);
        if (userRes.rows.length === 0) {
            throw new Error(`User ${userId} not found`);
        }
        const user = userRes.rows[0];
        console.log(`👤 Campaign owner: User ID ${user.id} (${user.email})`);
        console.log(`📧 Campaign ID: ${campaign_id}, Contact ID: ${contact_id}`);
        console.log(`📨 Contact email: ${contact.email}`);
        console.log(`📨 Campaign email account ID: ${campaign.from_email_account_id}`);
        console.log(`📊 Campaign status: ${campaign.status}`);
        // Validate contact email
        if (!contact.email) {
            throw new Error(`Contact ${contact_id} has no email address`);
        }
        // Check if this contact has a saved email sequence
        const sequenceCheck = await db.query(`SELECT ce.*, cc.current_email_number, cc.total_emails, cc.sequence_started_at
       FROM campaign_emails ce
       JOIN campaign_contacts cc ON cc.campaign_id = ce.campaign_id AND cc.contact_id = ce.contact_id
       WHERE ce.campaign_id = $1 AND ce.contact_id = $2
       ORDER BY ce.email_number ASC`, [campaign_id, contact_id]);
        const hasSequence = sequenceCheck.rows.length > 0;
        let emailToSend = null;
        if (hasSequence) {
            const currentEmailNum = sequenceCheck.rows[0].current_email_number;
            const totalEmails = sequenceCheck.rows[0].total_emails;
            console.log(`📊 Sequence found: ${currentEmailNum}/${totalEmails} emails`);
            // Find the email to send (matching current_email_number)
            emailToSend = sequenceCheck.rows.find(row => row.email_number === currentEmailNum);
            if (!emailToSend) {
                console.log(`✅ All sequence emails sent for contact ${contact_id}`);
                await db.query(`UPDATE campaign_contacts SET status='completed' WHERE campaign_id=$1 AND contact_id=$2`, [campaign_id, contact_id]);
                await queue.complete(job.id);
                return;
            }
            console.log(`📧 Sending sequence email ${currentEmailNum}/${totalEmails} (Day ${emailToSend.day})`);
        }
        else {
            console.log(`📧 No sequence found, using campaign template`);
        }
        // Get the email account from campaign (must belong to same user as campaign)
        const accountRes = await db.query(`SELECT id, provider, smtp_host, smtp_port, username, encrypted_password, is_active, user_id
       FROM email_accounts WHERE id = $1 AND user_id = $2`, [campaign.from_email_account_id, userId]);
        if (accountRes.rows.length === 0) {
            throw new Error(`Email account ${campaign.from_email_account_id} not found for user ${userId}. Please check that the email account exists and belongs to this user.`);
        }
        const emailAccount = accountRes.rows[0];
        if (!emailAccount.is_active) {
            throw new Error(`Email account ${emailAccount.username} (ID: ${emailAccount.id}) is not active. Please activate it in the Email Accounts screen.`);
        }
        console.log(`✅ Using email account: ${emailAccount.username} (${emailAccount.provider})`);
        const ctx = { user, company: { name: (user?.email || '').split('@')[1] || 'example.com' }, contact, campaign };
        // Determine email content (sequence vs campaign template)
        let html, subject;
        let rawBody;
        if (emailToSend) {
            // Use sequence email
            console.log(`📝 Using sequence email: "${emailToSend.subject}"`);
            subject = (0, rendering_1.renderTemplate)(emailToSend.subject, ctx);
            rawBody = (0, rendering_1.renderTemplate)(emailToSend.body, ctx);
        }
        else {
            // Fallback to campaign template
            console.log(`📝 Using campaign template`);
            if (!campaign.email_subject || !campaign.email_body) {
                throw new Error(`Campaign ${campaign_id} has no template and contact ${contact_id} has no sequence`);
            }
            subject = (0, rendering_1.renderTemplate)(campaign.email_subject, ctx);
            rawBody = (0, rendering_1.renderTemplate)(campaign.email_body, ctx);
        }
        // Generate unsubscribe link
        const token = `${campaign_id}:${contact_id}:${Date.now()}`;
        await db.query(`INSERT INTO unsubscribe_tokens(token,campaign_id,contact_id,expires_at,created_at) VALUES ($1,$2,$3, NOW() + interval '180 days', NOW()) ON CONFLICT DO NOTHING`, [token, campaign_id, contact_id]);
        const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3007';
        const unsubscribeLink = `${base}/api/unsubscribe/${token}`;
        // Apply simple text formatting with good indentation
        html = (0, emailFormatter_1.formatEmailForSending)(rawBody, {
            wrapInTemplate: false, // No fancy template wrapper
            includeUnsubscribeFooter: false // No footer
        });
        // Add simple unsubscribe link at the bottom
        html += `<br><br><a href="${unsubscribeLink}">Unsubscribe</a>`;
        console.log(`✨ Applied simple text formatting`);
        if (process.env.FEATURE_TRACKING_PIXEL === 'true') {
            const pixelMethod = process.env.TRACKING_PIXEL_METHOD || 'auto';
            const pixelUrl = `${process.env.PUBLIC_BASE_URL || 'http://localhost:3007'}/track/open?c=${campaign_id}&ct=${contact_id}&t=${Date.now()}`;
            // Use smart tracking pixel
            html += (0, rendering_1.smartTrackingPixel)(pixelUrl, {
                method: pixelMethod
            });
            console.log(`📊 Added ${pixelMethod} tracking pixel for campaign ${campaign_id}, contact ${contact_id}`);
        }
        // Build unsubscribe headers (token and link already created above)
        const headers = (0, rendering_1.buildUnsubscribeHeaders)({ mailto: `mailto:unsubscribe@example.com?subject=${encodeURIComponent(token)}`, http: unsubscribeLink });
        const mailer = new mailer_1.MailerService(db);
        try {
            console.log(`📨 Sending email to ${contact.email} using account ${emailAccount.username}`);
            const sent = await mailer.send({
                smtp_account_id: emailAccount.id,
                from: emailAccount.username, // Use the email account's username as the from address
                to: contact.email,
                subject,
                html,
                headers
            });
            console.log(`✅ Email sent successfully to ${contact.email} with message ID: ${sent.messageId}`);
            // Persist message and event with sequence metadata
            const sequenceMetadata = hasSequence && emailToSend ? {
                email_number: emailToSend.email_number,
                total_emails: sequenceCheck.rows[0].total_emails,
                sequence_day: emailToSend.day
            } : {};
            await db.query(`INSERT INTO messages (campaign_id, contact_id, step_id, direction, smtp_account_id, provider_message_id, status, timestamps, raw)
        VALUES ($1,$2,NULL,'outbound',$3,$4,'sent','{}', $5)`, [campaign_id, contact_id, emailAccount.id, sent.messageId, sequenceMetadata]);
            await db.query(`INSERT INTO events (campaign_id, contact_id, type, meta, occurred_at) VALUES ($1,$2,'sent',$3, NOW())`, [campaign_id, contact_id, sequenceMetadata]);
            // Update progress based on whether this is a sequence or single email
            if (hasSequence && emailToSend) {
                const currentEmailNum = emailToSend.email_number;
                const totalEmails = sequenceCheck.rows[0].total_emails;
                const nextEmailNum = currentEmailNum + 1;
                console.log(`📊 Sequence progress: sent email ${currentEmailNum}/${totalEmails}`);
                if (nextEmailNum <= totalEmails) {
                    // There are more emails in the sequence
                    const nextEmail = sequenceCheck.rows.find(row => row.email_number === nextEmailNum);
                    if (nextEmail) {
                        // 🐛 FIX: Calculate next send date from sequence_started_at (not current date)
                        const sequenceStartedAt = sequenceCheck.rows[0].sequence_started_at;
                        if (!sequenceStartedAt) {
                            throw new Error(`Contact ${contact_id} has no sequence_started_at timestamp`);
                        }
                        const nextSendDate = new Date(sequenceStartedAt);
                        nextSendDate.setDate(nextSendDate.getDate() + nextEmail.day);
                        console.log(`📅 Next email (${nextEmailNum}) scheduled for ${nextSendDate.toISOString()} (Day ${nextEmail.day} from ${sequenceStartedAt})`);
                        // Update progress
                        await db.query(`UPDATE campaign_contacts 
               SET current_email_number = $1,
                   last_email_sent_at = NOW(),
                   next_email_send_at = $2,
                   status = 'in_progress'
               WHERE campaign_id = $3 AND contact_id = $4`, [nextEmailNum, nextSendDate, campaign_id, contact_id]);
                        // Enqueue next email
                        await queue.enqueue('send-email', { campaign_id, contact_id }, {
                            idempotencyKey: `${campaign_id}:${contact_id}:${nextEmailNum}`,
                            runAt: nextSendDate,
                            maxAttempts: 3
                        });
                        console.log(`✅ Enqueued next email ${nextEmailNum} for ${nextSendDate.toISOString()}`);
                    }
                }
                else {
                    // This was the last email in sequence
                    console.log(`🎉 Sequence completed for contact ${contact_id}`);
                    await db.query(`UPDATE campaign_contacts 
             SET status = 'completed',
                 last_email_sent_at = NOW(),
                 current_email_number = $1
             WHERE campaign_id = $2 AND contact_id = $3`, [nextEmailNum, campaign_id, contact_id]);
                }
            }
            else {
                // Single email (no sequence)
                await db.query(`UPDATE campaign_contacts SET status='completed', last_email_sent_at = NOW() WHERE campaign_id=$1 AND contact_id=$2`, [campaign_id, contact_id]);
            }
            console.log(`✅ Email delivered for contact ${contact_id}`);
            // Check if campaign is complete after this email
            await checkCampaignCompletion(db, campaign_id);
            await queue.complete(job.id);
            console.log(`🎉 Job ${job.id} completed and marked as done`);
        }
        catch (sendErr) {
            console.error(`❌ Email send failed for ${contact.email}:`, sendErr.message);
            // Log failure with sequence metadata
            const sequenceMetadata = hasSequence && emailToSend ? {
                email_number: emailToSend.email_number,
                total_emails: sequenceCheck.rows[0].total_emails,
                sequence_day: emailToSend.day
            } : {};
            await db.query(`INSERT INTO messages (campaign_id, contact_id, step_id, direction, smtp_account_id, provider_message_id, status, timestamps, raw)
        VALUES ($1,$2,NULL,'outbound',$3,NULL,'failed','{}',$4)`, [campaign_id, contact_id, emailAccount.id, { error: String(sendErr?.message || sendErr), ...sequenceMetadata }]);
            await db.query(`INSERT INTO events (campaign_id, contact_id, type, meta, occurred_at) VALUES ($1,$2,'bounced',$3, NOW())`, [campaign_id, contact_id, { error: String(sendErr?.message || sendErr) }]);
            // Mark contact as failed
            await db.query(`UPDATE campaign_contacts SET status='failed', error=$1 WHERE campaign_id=$2 AND contact_id=$3`, [String(sendErr?.message || sendErr), campaign_id, contact_id]);
            // Check if campaign is complete after this failure (failed emails also count as processed)
            await checkCampaignCompletion(db, campaign_id);
            throw sendErr;
        }
    }
    catch (e) {
        console.error('❌ send-email job failed:', e);
        console.error('❌ Job details:', { jobId: job.id, campaignId: campaign_id, contactId: contact_id });
        await queue.fail(job.id, Math.min(300, 2 ** (job.attempts + 1)));
        console.log(`🔄 Job ${job.id} marked as failed, will retry`);
    }
}
run().catch((e) => {
    console.error('Worker start failed', e);
    process.exit(1);
});
//# sourceMappingURL=sequencer.js.map