"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestPersonaForContact = suggestPersonaForContact;
const connection_1 = require("../database/connection");
const universalLlmService_1 = require("./universalLlmService");
function buildPrompt(contact, personas) {
    const personaLines = personas.map(p => `- ${p.name}: ${p.description || ''}`).join('\n');
    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    return (`You are a marketing strategist.\n` +
        `Based on the contact's information and the available personas, determine which persona best fits this contact.\n\n` +
        `Respond ONLY in JSON format:\n` +
        `{"bestPersonaName":"...","matchConfidence":0.0,"reason":"short reasoning (1-2 sentences)"}\n\n` +
        `Contact:\n` +
        `Name: ${fullName || 'Unknown'}\n` +
        `Job Title: ${contact.job_title || ''}\n` +
        `Company: ${contact.company || ''}\n` +
        `Email: ${contact.email || ''}\n\n` +
        `Available Personas:\n` +
        `${personaLines}`);
}
function cleanAndParseJson(aiText) {
    if (!aiText)
        return null;
    let cleaned = aiText.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
        const parsed = JSON.parse(cleaned);
        if (parsed &&
            typeof parsed.bestPersonaName === 'string' &&
            typeof parsed.matchConfidence === 'number' &&
            typeof parsed.reason === 'string') {
            return parsed;
        }
    }
    catch (_) {
        return null;
    }
    return null;
}
async function suggestPersonaForContact(userId, contactId, provider, apiKey) {
    // 1) Fetch contact
    const contactRes = await connection_1.Database.query('SELECT id, first_name, last_name, email, company, job_title FROM contacts WHERE id = $1 AND user_id = $2', [contactId, userId]);
    if (contactRes.rows.length === 0) {
        return { error: 'Contact not found.' };
    }
    const contact = contactRes.rows[0];
    // 2) Fetch personas for same user
    const personasRes = await connection_1.Database.query('SELECT id, name, description FROM personas WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    if (personasRes.rows.length === 0) {
        return { error: 'No personas found for this user.' };
    }
    const personas = personasRes.rows;
    // 3) Build prompt
    const prompt = buildPrompt(contact, personas);
    // 4) Call LLM
    const aiResponse = await universalLlmService_1.UniversalLlmService.generateText({
        provider,
        apiKey,
        prompt,
        maxTokens: 400,
        temperature: 0.4,
    });
    // 5/6) Clean and parse
    const parsed = cleanAndParseJson(aiResponse);
    if (!parsed) {
        return { error: 'Unable to determine persona.' };
    }
    // 7) Return parsed result (no DB writes)
    return parsed;
}
//# sourceMappingURL=personaSuggestionService.js.map