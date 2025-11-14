import { Database } from '../database/connection';
import { UniversalLlmService } from './universalLlmService';

export interface SequenceParams {
  numberOfEmails: number;
  schedule: string[];
  primaryGoal: string;
}

export interface EmailInSequence {
  email_number: number;
  day: number;
  subject_lines: string[];
  preview_text: string;
  email_body: string;
  reply_trigger: string;
  potential_objection: string;
  follow_up_angle: string;
}

export interface EmailSequenceResult {
  email_sequence: EmailInSequence[];
}

function buildEmailSequencePrompt(contact: any, persona: any, user: any, sequenceParams: SequenceParams, enrichmentData?: any): string {
  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  const userEmail = user?.email || 'sender@example.com';
  const userCompanyName = userEmail.split('@')[1] || 'example.com';
  
  // Build enrichment section
  let enrichmentSection = "No enrichment data available";
  if (enrichmentData) {
    enrichmentSection = `
**Professional Context:** ${enrichmentData.professional_context || 'N/A'}

**Recent Activity:** ${enrichmentData.recent_activity || 'N/A'}

**Company Insights:** ${enrichmentData.company_insights || 'N/A'}

**Communication Style:** ${enrichmentData.communication_style || 'N/A'}

**Personality Summary:** ${enrichmentData.personality_summary || 'N/A'}

**Engagement Insights:** ${enrichmentData.engagement_insights || 'N/A'}

**Key Quotes/Posts:** ${enrichmentData.key_quotes_or_posts ? JSON.stringify(enrichmentData.key_quotes_or_posts, null, 2) : 'None'}

**Additional Data:** ${enrichmentData.enriched_json ? JSON.stringify(enrichmentData.enriched_json, null, 2) : 'None'}
`;
  }
  
  return `You are an expert B2B marketing copywriter who specializes in crafting personalized outreach email sequences.

Create a personalized email sequence designed to maximize engagement and replies based on the following inputs:

⚠️ **CRITICAL DISTINCTION:**
- **SENDER** = The person writing the email (you/your company)
- **RECEIVER** = The person receiving the email (the contact/persona)

1. **SENDER INFORMATION (YOU - The person writing the email):**
- Email: ${userEmail}
- Company: ${userCompanyName}
- Note: The complimentary closing and signature should match YOUR (sender's) communication style, NOT the receiver's persona.

2. **RECEIVER PERSONA (THE CONTACT - Who you're writing TO):**
${JSON.stringify(persona, null, 2)}

3. **RECEIVER CONTACT INFORMATION:**
- Name: ${fullName || 'Unknown'}
- Email: ${contact.email}
- Company: ${contact.company || 'Unknown'}
- Job Title: ${contact.job_title || 'Unknown'}

4. **RECEIVER ENRICHMENT DATA:**
${enrichmentSection}

5. **Sequence Parameters:**
- Number of emails: ${sequenceParams.numberOfEmails}
- Schedule: ${sequenceParams.schedule.join(', ')}
- Primary goal: ${sequenceParams.primaryGoal}

🎯 **OUTPUT REQUIREMENTS:**
YOU MUST GENERATE EXACTLY ${sequenceParams.numberOfEmails} EMAILS. NO MORE, NO LESS.

Generate an email sequence following this structure for each email:

Email [#] - Day [X]
Subject Lines: (2–3 options)
Preview Text: (one line)
Email Body: (MUST be proper HTML with paragraph tags)

📧 **EMAIL BODY HTML FORMAT (REQUIRED):**
<p>Hi {{contact.first_name}},</p>
<p>[Opening paragraph - personalized hook based on enrichment or persona data]</p>
<p>[Context paragraph - why you're reaching out now]</p>
<p>[Value paragraph - tie benefits to their situation/persona challenges]</p>
<p>[CTA paragraph - simple, low-friction ask to get a reply]</p>
<p>Best regards,<br>{{user.email}}</p>

🚨 **CRITICAL: COMPLIMENTARY CLOSING RULES:**
- The complimentary closing (e.g., "Best regards", "Sincerely", "Thanks") should match the SENDER's communication style, NOT the receiver's persona
- The receiver's persona describes WHO YOU'RE WRITING TO, not who you are
- Use professional, standard closings appropriate for the SENDER (you), such as:
  * "Best regards," (most common)
  * "Sincerely,"
  * "Thanks,"
  * "Best,"
- DO NOT use the receiver's communication style or persona characteristics in the closing
- The closing should always end with {{user.email}} which represents the SENDER's email address

✅ **HTML REQUIREMENTS:**
- MUST wrap each paragraph in <p></p> tags
- Use <br> for line breaks within paragraphs
- Use <strong></strong> for emphasis (sparingly)
- Use <a href="url">text</a> for links (if needed)
- NO complex HTML, NO tables, NO CSS in body
- Keep clean and simple for maximum email client compatibility

✉️ **SEQUENCE STRATEGY RULES:**
- Email 1: Ultra-personalized, reference recent activity/achievement, ask a thoughtful question.
- Email 2: Provide value (insight, resource, or case study relevant to persona), soft CTA.
- Email 3: Address an objection or challenge specific to their role/industry.
- Email 4+: Add new value or perspective, pattern interrupts (shorter, different tone).

🧩 **ENGAGEMENT TACTICS TO INCLUDE:**
- Ask thoughtful, non-yes/no questions.
- Reference company, role, or recent activity.
- Deliver value before the ask.
- Subject lines should sound like peer-to-peer messages.
- Include "reply triggers" like insights, problems, or industry commentary.

❌ **AVOID:**
- Corporate-sounding intros
- Multiple CTAs in one email
- Long paragraphs
- Obvious automation markers
- Pushy or salesy tone
- Overly feature-focused content

💬 **REPLY OPTIMIZATION:**
For each email, include:
- "reply_trigger": (What makes them respond)
- "potential_objection": (What concern might arise)
- "follow_up_angle": (How to follow up if no reply)

⚙️ **OUTPUT FORMAT (JSON only)**:
{
  "email_sequence": [
    {
      "email_number": 1,
      "day": 0,
      "subject_lines": ["subject 1", "subject 2", "subject 3"],
      "preview_text": "",
      "email_body": "",
      "reply_trigger": "",
      "potential_objection": "",
      "follow_up_angle": ""
    }
  ]
}

CRITICAL: The "email_sequence" array MUST contain EXACTLY ${sequenceParams.numberOfEmails} email objects.
If you're asked for 4 emails, generate 4. If asked for 3, generate 3. Match the number exactly.

Return only valid JSON (no markdown fences or explanations).`;
}

function cleanAndParseEmailSequence(aiText: string): EmailSequenceResult | null {
  if (!aiText) return null;
  
  let cleaned = aiText.trim();
  
  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    
    // Validate structure
    if (parsed && parsed.email_sequence && Array.isArray(parsed.email_sequence)) {
      return parsed as EmailSequenceResult;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    return null;
  }
}

export async function generateEmailSequenceForContact(
  userId: number,
  contactId: string,
  provider: string,
  apiKey: string,
  sequenceParams: SequenceParams
): Promise<EmailSequenceResult | { error: string }> {
  
  // 1) Fetch user (sender) information
  console.log(`👤 Fetching sender (user) information for user ${userId}`);
  const userRes = await Database.query(
    'SELECT id, email FROM users WHERE id = $1',
    [userId]
  );
  
  if (userRes.rows.length === 0) {
    return { error: 'User not found.' };
  }
  
  const user = userRes.rows[0];
  console.log(`✅ Sender: ${user.email}`);

  // 2) Fetch contact (receiver) information
  console.log(`📧 Generating email sequence for contact ${contactId}`);
  const contactRes = await Database.query(
    'SELECT id, first_name, last_name, email, company, job_title FROM contacts WHERE id = $1 AND user_id = $2',
    [contactId, userId]
  );
  
  if (contactRes.rows.length === 0) {
    return { error: 'Contact not found.' };
  }
  
  const contact = contactRes.rows[0];

  // 3) Try to fetch enrichment data if it exists
  let enrichmentData = null;
  try {
    const enrichmentRes = await Database.query(
      `SELECT professional_context, recent_activity, company_insights, 
              communication_style, personality_summary, engagement_insights,
              key_quotes_or_posts, enriched_json 
       FROM enriched_data 
       WHERE contact_id = $1`,
      [contactId]
    );
    
    if (enrichmentRes.rows.length > 0) {
      enrichmentData = enrichmentRes.rows[0];
      console.log('✅ Found enrichment data for this contact');
    } else {
      console.log('ℹ️  No enrichment data found for this contact - proceeding without it');
    }
  } catch (error: any) {
    // Table might not exist or other error - proceed without enrichment
    console.log('ℹ️  Could not fetch enrichment data - proceeding without it');
  }

  // 4) Note: Persona is stored locally in mobile app, not in database
  // For now, we'll fetch all personas and let the mobile app pass persona data
  // Or we can generate without persona if it's purely local
  console.log('⚠️ Note: Persona is stored locally on mobile. Fetching all personas for reference.');
  
  const personasRes = await Database.query(
    'SELECT id, name, description, industry, role, company_size, location, current_challenges, interests_priorities, communication_style FROM personas WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  
  if (personasRes.rows.length === 0) {
    return { error: 'No personas found for this user. Please create personas first.' };
  }

  // Use the first persona as default (mobile app will pass specific persona later)
  const persona = personasRes.rows[0];

  // 5) Build the AI prompt (pass user/sender data, enrichment data if available)
  const prompt = buildEmailSequencePrompt(contact, persona, user, sequenceParams, enrichmentData);
  
  console.log('🤖 Calling AI to generate email sequence...');
  console.log(`Provider: ${provider}, Sender: ${user.email}, Receiver: ${contact.email}, Emails: ${sequenceParams.numberOfEmails}`);

  // 6) Call Universal LLM
  let aiResponse: string;
  try {
    aiResponse = await UniversalLlmService.generateText({
      provider,
      apiKey,
      prompt,
      maxTokens: 2000,
      temperature: 0.65
    });
  } catch (error: any) {
    console.error('❌ LLM generation failed:', error);
    return { error: 'Email generation failed. Please try again.' };
  }

  console.log('📝 AI response received, parsing...');
  console.log('Response preview:', aiResponse.substring(0, 200));

  // 7) Parse the JSON response
  const parsed = cleanAndParseEmailSequence(aiResponse);
  
  if (!parsed) {
    console.error('❌ Failed to parse AI response as valid email sequence JSON');
    return { error: 'Email generation failed. AI response was not in the expected format.' };
  }

  console.log(`✅ Successfully generated ${parsed.email_sequence.length} emails`);

  // 8) Return the parsed sequence (no DB save)
  return parsed;
}

