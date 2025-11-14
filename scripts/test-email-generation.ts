/**
 * Test script to verify email generation uses {{user.email}} template variable
 * instead of replacing it with "Your Name"
 * 
 * Usage:
 *   npm run test:email-generation
 *   OR
 *   ts-node scripts/test-email-generation.ts [--with-llm] [--provider=openai] [--api-key=xxx]
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock data for testing
const mockUser = {
  id: 1,
  email: 'john.doe@example.com'
};

const mockContact = {
  id: 1,
  first_name: 'Rohaan',
  last_name: 'Smith',
  email: 'rohaan.smith@abctech.com',
  company: 'ABC Tech',
  job_title: 'Senior Software Engineer'
};

const mockPersona = {
  id: '123',
  name: 'Tech-Savvy Decision Maker',
  description: 'Senior engineer focused on microservices and cost optimization',
  industry: 'Technology',
  role: 'Senior Software Engineer',
  company_size: '51-200',
  location: 'Urban',
  communication_style: 'Direct and technical'
};

const mockSequenceParams = {
  numberOfEmails: 1,
  schedule: ['Day 0'],
  primaryGoal: 'Book meeting'
};

// Copy of the prompt building function (simplified for testing)
function buildTestPrompt(contact: any, persona: any, user: any, sequenceParams: any): string {
  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  const userEmail = user?.email || 'sender@example.com';
  const userCompanyName = userEmail.split('@')[1] || 'example.com';
  
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

4. **Sequence Parameters:**
- Number of emails: ${sequenceParams.numberOfEmails}
- Schedule: ${sequenceParams.schedule.join(', ')}
- Primary goal: ${sequenceParams.primaryGoal}

🎯 **OUTPUT REQUIREMENTS:**
YOU MUST GENERATE EXACTLY ${sequenceParams.numberOfEmails} EMAIL. NO MORE, NO LESS.

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
- **TEMPLATE VARIABLES - USE EXACTLY AS SHOWN:**
  * You MUST use \`{{user.email}}\` EXACTLY as shown in the closing - this is a template variable that will be replaced with the sender's email (${userEmail}) when the email is sent
  * DO NOT replace \`{{user.email}}\` with text like "Your Name" or any other placeholder
  * DO NOT replace \`{{contact.first_name}}\` with the actual name - use the template variable exactly as shown
  * These template variables (enclosed in double curly braces {{ }}) will be automatically replaced during email sending
  * Example: Use \`<p>Best regards,<br>{{user.email}}</p>\` NOT \`<p>Best regards,<br>Your Name</p>\`

✅ **HTML REQUIREMENTS:**
- MUST wrap each paragraph in <p></p> tags
- Use <br> for line breaks within paragraphs
- NO complex HTML, NO tables, NO CSS in body

⚙️ **OUTPUT FORMAT (JSON only)**:**
{
  "email_sequence": [
    {
      "email_number": 1,
      "day": 0,
      "subject_lines": ["subject 1", "subject 2"],
      "preview_text": "",
      "email_body": "",
      "reply_trigger": "",
      "potential_objection": "",
      "follow_up_angle": ""
    }
  ]
}

CRITICAL: The "email_sequence" array MUST contain EXACTLY ${sequenceParams.numberOfEmails} email object.
Return only valid JSON (no markdown fences or explanations).`;
}

// Function to validate the generated email
function validateEmail(emailBody: string, senderEmail: string): {
  passed: boolean;
  issues: string[];
  foundTemplateVariable: boolean;
} {
  const issues: string[] = [];
  let foundTemplateVariable = false;

  // Check if {{user.email}} is present
  if (emailBody.includes('{{user.email}}')) {
    foundTemplateVariable = true;
    console.log('✅ PASS: Found {{user.email}} template variable');
  } else {
    issues.push('❌ FAIL: {{user.email}} template variable is missing');
  }

  // Check if "Your Name" or similar placeholders are present
  const badPlaceholders = ['Your Name', 'your name', '[Your Name]', '[Name]', 'Sender Name'];
  for (const placeholder of badPlaceholders) {
    if (emailBody.toLowerCase().includes(placeholder.toLowerCase())) {
      issues.push(`❌ FAIL: Found placeholder "${placeholder}" instead of template variable`);
    }
  }

  // Check if actual sender email is hardcoded (should use template variable instead)
  if (emailBody.includes(senderEmail) && !emailBody.includes('{{user.email}}')) {
    issues.push(`⚠️  WARNING: Sender email "${senderEmail}" is hardcoded instead of using {{user.email}}`);
  }

  // Check if {{contact.first_name}} is used (should be, not hardcoded)
  if (!emailBody.includes('{{contact.first_name}}') && emailBody.includes(mockContact.first_name)) {
    issues.push(`⚠️  WARNING: Contact name "${mockContact.first_name}" is hardcoded instead of using {{contact.first_name}}`);
  }

  return {
    passed: issues.length === 0 && foundTemplateVariable,
    issues,
    foundTemplateVariable
  };
}

// Main test function
async function runTest() {
  console.log('🧪 Testing Email Generation with Template Variables\n');
  console.log('='.repeat(60));
  
  // Build the prompt
  console.log('\n📝 Building test prompt...');
  const prompt = buildTestPrompt(mockContact, mockPersona, mockUser, mockSequenceParams);
  
  // Save prompt to file for inspection
  const promptPath = path.join(__dirname, 'test-email-prompt.txt');
  fs.writeFileSync(promptPath, prompt);
  console.log(`✅ Prompt saved to: ${promptPath}`);
  
  // Show key sections of the prompt
  console.log('\n📋 Key sections of the prompt:');
  console.log('-'.repeat(60));
  const senderSection = prompt.match(/1\. \*\*SENDER INFORMATION.*?2\. \*\*RECEIVER/s)?.[0];
  if (senderSection) {
    console.log(senderSection.replace(/2\. \*\*RECEIVER.*/s, ''));
  }
  
  const templateSection = prompt.match(/\*\*TEMPLATE VARIABLES.*?✅ \*\*HTML REQUIREMENTS/s)?.[0];
  if (templateSection) {
    console.log(templateSection.replace(/✅ \*\*HTML REQUIREMENTS.*/s, ''));
  }
  
  // Check command line arguments
  const args = process.argv.slice(2);
  const withLlm = args.includes('--with-llm');
  const providerArg = args.find(arg => arg.startsWith('--provider='));
  const apiKeyArg = args.find(arg => arg.startsWith('--api-key='));
  
  if (withLlm) {
    const provider = providerArg?.split('=')[1] || 'openai';
    const apiKey = apiKeyArg?.split('=')[1] || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('\n❌ Error: API key required for LLM test');
      console.log('   Set OPENAI_API_KEY environment variable or use --api-key=xxx');
      return;
    }
    
    console.log(`\n🤖 Testing with LLM (${provider})...`);
    try {
      // Import the LLM service
      const { UniversalLlmService } = await import('../src/services/universalLlmService');
      
      const response = await UniversalLlmService.generateText({
        provider,
        apiKey,
        prompt,
        maxTokens: 1000,
        temperature: 0.65
      });
      
      console.log('\n📧 Generated Response:');
      console.log('-'.repeat(60));
      console.log(response.substring(0, 500));
      console.log('...');
      
      // Try to parse JSON
      let emailBody = '';
      try {
        const cleaned = response.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.email_sequence && parsed.email_sequence[0]) {
          emailBody = parsed.email_sequence[0].email_body || '';
          console.log('\n📝 Extracted Email Body:');
          console.log('-'.repeat(60));
          console.log(emailBody);
        }
      } catch (e) {
        console.log('\n⚠️  Could not parse JSON response, checking raw response...');
        emailBody = response;
      }
      
      // Validate
      console.log('\n🔍 Validation Results:');
      console.log('='.repeat(60));
      const validation = validateEmail(emailBody, mockUser.email);
      
      if (validation.passed) {
        console.log('\n✅ ALL TESTS PASSED!');
        console.log('   The email correctly uses {{user.email}} template variable');
      } else {
        console.log('\n❌ VALIDATION FAILED:');
        validation.issues.forEach(issue => console.log(`   ${issue}`));
      }
      
      // Save full response
      const responsePath = path.join(__dirname, 'test-email-response.json');
      fs.writeFileSync(responsePath, JSON.stringify({ prompt, response, emailBody, validation }, null, 2));
      console.log(`\n💾 Full response saved to: ${responsePath}`);
      
    } catch (error: any) {
      console.error('\n❌ LLM Test Failed:', error.message);
    }
  } else {
    console.log('\n💡 To test with actual LLM, run:');
    console.log('   npm run test:email-generation -- --with-llm --provider=openai --api-key=your-key');
    console.log('   OR set OPENAI_API_KEY environment variable');
    
    console.log('\n✅ Prompt generation test completed');
    console.log('   Review the prompt file to verify template variable instructions are clear');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run the test
runTest().catch(console.error);

