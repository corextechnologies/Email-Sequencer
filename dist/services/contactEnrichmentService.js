"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichContactWithAI = enrichContactWithAI;
exports.getEnrichedData = getEnrichedData;
const connection_1 = require("../database/connection");
const universalLlmService_1 = require("./universalLlmService");
/**
 * Build prompt for AI to enrich contact information
 */
function buildEnrichmentPrompt(contact) {
    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    return `You are an AI Sales Intelligence Analyst.

You are given a contact's public social media link. Use this link to research and extract professional insights and signals valuable for B2B sales and marketing personalization.

**Contact Information:**
- Social Link: ${contact.social_link || 'Not Provided'}

**Task:**
1. Analyze the person's social media activity (LinkedIn, Twitter, etc.) from the provided link.
2. Extract meaningful insights about their professional focus, current interests, and potential business needs.
3. Return results in JSON format with the following exact structure:

{
  "professional_context": "Summarize the person’s professional background, role, and area of expertise.",
  "recent_activity": "Summarize what topics or posts they’ve recently engaged with or shared.",
  "company_insights": "Insights about their company, industry context, or challenges.",
  "communication_style": "Describe their communication tone and style (e.g., formal, casual, technical, visionary).",
  "personality_summary": "Inferred personality traits from how they post or interact online.",
  "engagement_insights": "Tips on how to effectively engage with this person — ideal tone, topics, and timing.",
  "key_quotes_or_posts": [
    {
      "date": "YYYY-MM-DD",
      "quote": "Exact quote or summarized post text",
      "platform": "LinkedIn/Twitter/etc."
    },
    {
      "date": "YYYY-MM-DD",
      "quote": "Exact quote or summarized post text",
      "platform": "LinkedIn/Twitter/etc."
    }
  ],
  "enriched_json": {
    "tech_stack": ["Node.js", "Python", "AWS", "Docker", "Kubernetes"],
    "pain_points": ["Monitoring complexity in microservices", "Cost optimization"],
    "buying_signals": ["Recently posted about tool evaluation", "Company in growth phase"],
    "engagement_rate": "high",
    "decision_maker_level": "influencer / C-level / manager",
    "preferred_contact_time": "e.g., Tuesday-Thursday, 10am–2pm EST",
    "linkedin_activity_score": 0-10,
    "estimated_budget_authority": "e.g., up to $50k"
  }
}

**Guidelines:**
- Use the social link to infer context; do not invent details that are not plausible.
- If data is not visible, infer intelligently from job title, company, and industry.
- Focus on real sales and engagement value.
- Return only **valid JSON**, no markdown or explanation.
`;
}
/**
 * Clean and parse AI response
 */
function cleanAndParseEnrichment(aiText) {
    try {
        // Remove markdown code fences if present
        let cleaned = aiText.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        }
        else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        const parsed = JSON.parse(cleaned);
        // Validate required fields
        if (!parsed.professional_context || !parsed.company_insights) {
            console.warn('Missing required enrichment fields');
            return null;
        }
        return {
            professional_context: parsed.professional_context || '',
            recent_activity: parsed.recent_activity || '',
            company_insights: parsed.company_insights || '',
            communication_style: parsed.communication_style || '',
            personality_summary: parsed.personality_summary || '',
            engagement_insights: parsed.engagement_insights || '',
            key_quotes_or_posts: parsed.key_quotes_or_posts || [],
            enriched_json: parsed.enriched_json || {}
        };
    }
    catch (error) {
        console.error('Failed to parse enrichment JSON:', error);
        return null;
    }
}
/**
 * Enrich contact with AI-powered insights
 */
async function enrichContactWithAI(userId, contactId, provider, apiKey) {
    try {
        // 1) Fetch contact
        console.log(`🔍 Enriching contact ${contactId} for user ${userId}`);
        const contactRes = await connection_1.Database.query(`SELECT id, first_name, last_name, email, company, job_title, phone, 
              social_link, notes 
       FROM contacts 
       WHERE id = $1 AND user_id = $2`, [contactId, userId]);
        if (contactRes.rows.length === 0) {
            return { error: 'Contact not found.' };
        }
        const contact = contactRes.rows[0];
        console.log(`📧 Contact found: ${contact.email}`);
        // 2) Check if enrichment already exists
        const existingEnrichment = await connection_1.Database.query('SELECT id FROM enriched_data WHERE contact_id = $1', [contactId]);
        // 3) Build prompt
        const prompt = buildEnrichmentPrompt(contact);
        // 4) Call LLM
        console.log(`🤖 Calling ${provider} for enrichment...`);
        const aiResponse = await universalLlmService_1.UniversalLlmService.generateText({
            provider,
            apiKey,
            prompt,
            maxTokens: 1500,
            temperature: 0.5
        });
        console.log('📝 AI response received, parsing...');
        // 5) Parse response
        const enrichmentData = cleanAndParseEnrichment(aiResponse);
        if (!enrichmentData) {
            console.error('❌ Failed to parse AI response');
            return { error: 'Enrichment failed. AI response was not in the expected format.' };
        }
        // 6) Save to database (upsert)
        if (existingEnrichment.rows.length > 0) {
            // Update existing enrichment
            await connection_1.Database.query(`UPDATE enriched_data 
         SET professional_context = $1,
             recent_activity = $2,
             company_insights = $3,
             communication_style = $4,
             personality_summary = $5,
             engagement_insights = $6,
             key_quotes_or_posts = $7,
             enriched_json = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE contact_id = $9`, [
                enrichmentData.professional_context,
                enrichmentData.recent_activity,
                enrichmentData.company_insights,
                enrichmentData.communication_style,
                enrichmentData.personality_summary,
                enrichmentData.engagement_insights,
                JSON.stringify(enrichmentData.key_quotes_or_posts),
                JSON.stringify(enrichmentData.enriched_json),
                contactId
            ]);
            console.log('✅ Enrichment data updated');
        }
        else {
            // Insert new enrichment
            await connection_1.Database.query(`INSERT INTO enriched_data 
         (contact_id, user_id, professional_context, recent_activity, company_insights,
          communication_style, personality_summary, engagement_insights, 
          key_quotes_or_posts, enriched_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                contactId,
                userId,
                enrichmentData.professional_context,
                enrichmentData.recent_activity,
                enrichmentData.company_insights,
                enrichmentData.communication_style,
                enrichmentData.personality_summary,
                enrichmentData.engagement_insights,
                JSON.stringify(enrichmentData.key_quotes_or_posts),
                JSON.stringify(enrichmentData.enriched_json)
            ]);
            console.log('✅ Enrichment data saved');
        }
        // 7) Return enrichment data
        return enrichmentData;
    }
    catch (error) {
        console.error('❌ Contact enrichment failed:', error);
        return { error: error?.message || 'Contact enrichment failed.' };
    }
}
/**
 * Get enriched data for a contact
 */
async function getEnrichedData(userId, contactId) {
    try {
        const result = await connection_1.Database.query(`SELECT professional_context, recent_activity, company_insights,
              communication_style, personality_summary, engagement_insights,
              key_quotes_or_posts, enriched_json
       FROM enriched_data
       WHERE contact_id = $1 AND user_id = $2`, [contactId, userId]);
        if (result.rows.length === 0) {
            return { error: 'No enrichment data found for this contact.' };
        }
        const data = result.rows[0];
        return {
            professional_context: data.professional_context,
            recent_activity: data.recent_activity,
            company_insights: data.company_insights,
            communication_style: data.communication_style,
            personality_summary: data.personality_summary,
            engagement_insights: data.engagement_insights,
            key_quotes_or_posts: data.key_quotes_or_posts || [],
            enriched_json: data.enriched_json || {}
        };
    }
    catch (error) {
        console.error('❌ Failed to get enriched data:', error);
        return { error: 'Failed to retrieve enrichment data.' };
    }
}
//# sourceMappingURL=contactEnrichmentService.js.map