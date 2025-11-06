# Reply Detection - Potential Issues and Fixes

## Issues Identified

### 1. **Message ID Format Mismatch** ⚠️ HIGH PRIORITY
**Problem**: Message IDs in email headers often have angle brackets `<message-id>`, but when stored in the database, they might not have them (or vice versa). This causes the matching query to fail.

**Current Code** (line 350-357 in `imapReplyDetector.ts`):
```typescript
private async findOriginalMessage(messageId: string, smtpAccountId: number, db: Pool): Promise<any> {
  const result = await db.query(`
    SELECT campaign_id, contact_id 
    FROM messages 
    WHERE provider_message_id = $1 
    AND smtp_account_id = $2 
    AND direction = 'outbound'
  `, [messageId, smtpAccountId]);
  return result.rows[0] || null;
}
```

**Fix**: Normalize message IDs by removing angle brackets before comparison:
```typescript
private normalizeMessageId(messageId: string): string {
  // Remove angle brackets if present
  return messageId.replace(/^<|>$/g, '').trim();
}

private async findOriginalMessage(messageId: string, smtpAccountId: number, db: Pool): Promise<any> {
  // Normalize the message ID (remove angle brackets)
  const normalizedId = this.normalizeMessageId(messageId);
  
  // Try exact match first
  let result = await db.query(`
    SELECT campaign_id, contact_id 
    FROM messages 
    WHERE provider_message_id = $1 
    AND smtp_account_id = $2 
    AND direction = 'outbound'
  `, [normalizedId, smtpAccountId]);
  
  // If not found, try with angle brackets
  if (result.rows.length === 0) {
    result = await db.query(`
      SELECT campaign_id, contact_id 
      FROM messages 
      WHERE provider_message_id = $1 
      AND smtp_account_id = $2 
      AND direction = 'outbound'
    `, [`<${normalizedId}>`, smtpAccountId]);
  }
  
  // If still not found, try without angle brackets (if they were present)
  if (result.rows.length === 0 && messageId.startsWith('<') && messageId.endsWith('>')) {
    result = await db.query(`
      SELECT campaign_id, contact_id 
      FROM messages 
      WHERE provider_message_id = $1 
      AND smtp_account_id = $2 
      AND direction = 'outbound'
    `, [normalizedId, smtpAccountId]);
  }
  
  return result.rows[0] || null;
}
```

**Better Fix**: Use database-level normalization with a function or normalized comparison:
```typescript
private async findOriginalMessage(messageId: string, smtpAccountId: number, db: Pool): Promise<any> {
  // Normalize message ID (remove angle brackets)
  const normalizedId = messageId.replace(/^<|>$/g, '').trim();
  
  // Use LIKE or REGEXP to match with or without angle brackets
  const result = await db.query(`
    SELECT campaign_id, contact_id 
    FROM messages 
    WHERE (
      provider_message_id = $1 
      OR provider_message_id = $2
      OR provider_message_id = $3
    )
    AND smtp_account_id = $4 
    AND direction = 'outbound'
  `, [
    normalizedId,           // Exact match (no brackets)
    `<${normalizedId}>`,    // With brackets
    messageId               // Original format
  ], smtpAccountId);
  
  return result.rows[0] || null;
}
```

### 2. **Message ID Extraction from Reply Headers** ⚠️ MEDIUM PRIORITY
**Problem**: The code extracts message ID from `inReplyTo` or `references`, but these fields might have multiple message IDs or different formats.

**Current Code** (line 318-321):
```typescript
const originalMessageId = email.inReplyTo || 
                         email.references?.split(' ')[0] || 
                         this.extractMessageIdFromSubject(email.subject);
```

**Fix**: Better extraction and normalization:
```typescript
private extractOriginalMessageId(email: any): string | null {
  // Try inReplyTo first (most reliable)
  if (email.inReplyTo) {
    return this.normalizeMessageId(email.inReplyTo);
  }
  
  // Try references (may contain multiple IDs, first is usually the original)
  if (email.references) {
    const refs = Array.isArray(email.references) 
      ? email.references 
      : email.references.split(/\s+/);
    
    if (refs.length > 0) {
      return this.normalizeMessageId(refs[0]);
    }
  }
  
  // Fallback to subject extraction
  if (email.subject) {
    return this.extractMessageIdFromSubject(email.subject);
  }
  
  return null;
}

private normalizeMessageId(messageId: string): string {
  // Remove angle brackets and whitespace
  return messageId.replace(/^<|>$/g, '').trim();
}
```

### 3. **24-Hour Date Filter Too Restrictive** ⚠️ LOW PRIORITY
**Problem**: The code only checks emails from the last 24 hours, which might miss replies that come later.

**Current Code** (line 304-309):
```typescript
const emailDate = email.date || new Date();
const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);

if (emailDate < oneDayAgo) return null;
```

**Fix**: Increase to 7 days or make configurable:
```typescript
// Check last 7 days instead of 1 day
const emailDate = email.date || new Date();
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

if (emailDate < sevenDaysAgo) return null;
```

### 4. **Missing Message ID in Sent Emails** ⚠️ CRITICAL
**Problem**: If `sent.messageId` is null or empty, no message ID is stored, making reply detection impossible.

**Current Code** (line 357-358 in `sequencer.ts`):
```typescript
await db.query(`INSERT INTO messages (campaign_id, contact_id, step_id, direction, smtp_account_id, provider_message_id, status, timestamps, raw)
  VALUES ($1,$2,NULL,'outbound',$3,$4,'sent','{}', $5)`, [campaign_id, contact_id, emailAccount.id, sent.messageId, sequenceMetadata]);
```

**Fix**: Generate a message ID if nodemailer doesn't provide one:
```typescript
// Generate message ID if not provided by nodemailer
const messageId = sent.messageId || this.generateMessageId();

await db.query(`INSERT INTO messages (campaign_id, contact_id, step_id, direction, smtp_account_id, provider_message_id, status, timestamps, raw)
  VALUES ($1,$2,NULL,'outbound',$3,$4,'sent','{}', $5)`, [campaign_id, contact_id, emailAccount.id, messageId, sequenceMetadata]);

private generateMessageId(): string {
  // Generate a unique message ID if nodemailer doesn't provide one
  const domain = process.env.MESSAGE_ID_DOMAIN || 'email-sequencer.local';
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  return `<${uniqueId}@${domain}>`;
}
```

### 5. **Message ID Not Stored in Email Headers** ⚠️ HIGH PRIORITY
**Problem**: When sending emails, the message ID might not be included in the email headers, so replies won't have the correct `In-Reply-To` header.

**Current Code** (in `mailer.ts`):
```typescript
async send(input: SendInput): Promise<{ messageId: string }> {
  const transporter = await this.createTransport(input.smtp_account_id);
  const info = await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    headers: input.headers || {}
  });
  return { messageId: info.messageId || '' };
}
```

**Fix**: Generate and include message ID in headers:
```typescript
async send(input: SendInput): Promise<{ messageId: string }> {
  const transporter = await this.createTransport(input.smtp_account_id);
  
  // Generate message ID if not provided
  const messageId = input.headers?.['Message-ID'] || this.generateMessageId();
  
  const info = await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    headers: {
      ...input.headers,
      'Message-ID': messageId
    }
  });
  
  // Return the message ID we used (not the one from nodemailer, which might be different)
  return { messageId: messageId };
}

private generateMessageId(): string {
  const domain = process.env.MESSAGE_ID_DOMAIN || 'email-sequencer.local';
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  return `<${uniqueId}@${domain}>`;
}
```

## Recommended Fix Priority

1. **CRITICAL**: Fix message ID storage and header inclusion (#4, #5)
2. **HIGH**: Fix message ID format matching (#1)
3. **MEDIUM**: Improve message ID extraction (#2)
4. **LOW**: Increase date range (#3)

## Testing Steps

1. Run the diagnostic script: `node scripts/diagnose-reply-detection.js`
2. Send a test email and check if message ID is stored
3. Send a reply to that email
4. Run reply detection: `node scripts/trigger-reply-detection.js`
5. Check if reply is detected and matched to original message

