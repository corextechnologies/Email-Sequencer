import { Database } from '../database/connection';
import { UniversalLlmService } from './universalLlmService';
import { EncryptionHelper } from '../utils/encryption';

export interface QuestionnaireData {
  companyName: string;
  industry: string;
  description: string;
  products: string;
  targetAudience: string;
  challenges: string;
  valueProposition: string;
}

export interface GenerationOptions {
  generateMultiple: boolean;
  enhanceWithIndustryInsights: boolean;
}

export interface PersonaData {
  name: string;
  description: string;
  targetAudience: string;
  jobTitles: string[];
  companySize: string;
  ageRange: string;
  location: string;
  geographicLocation: string;
  incomeRange: string;
  educationLevel: string;
  decisionMakingRole: string;
  painPoints: string[];
  goals: string[];
  challenges: string[];
  motivations: string[];
  buyingTriggers: string[];
  communicationTone: string;
  communicationStyle: string;
  messageFrequency: string;
  preferredChannels: string[];
  preferredContentTypes: string[];
  industryTerms: string[];
  keywordPreferences: string[];
  commonObjections: string[];
  objectionResponses: Record<string, string>;
  bestContactTimes: string[];
  responsePatterns: {
    typical_response_time: string;
    preferred_email_length: string;
    engagement_level: string;
  };
  aiConfidenceScore: number;
  isNegativePersona: boolean;
}

export interface AIResponse {
  personas: PersonaData[];
}

export class PersonaGenerationService {
  /**
   * Generate personas from questionnaire data
   */
  static async generatePersonasFromQuestionnaire(
    userId: number,
    provider: string,
    apiKey: string,
    questionnaireData: QuestionnaireData,
    options: GenerationOptions
  ): Promise<string[]> {
    try {
      console.log(`Starting persona generation for ${questionnaireData.companyName}`);

      // Get the AI prompt for persona generation
      const prompt = this.createPersonaGenerationPrompt(
        questionnaireData,
        options
      );

      // Call AI service
      console.log('Calling AI service for persona generation...');
      console.log('Provider:', provider);
      console.log('API Key length:', apiKey ? apiKey.length : 0);
      console.log('Prompt length:', prompt.length);
      
      const aiResponse = await UniversalLlmService.generateText({
        provider,
        apiKey,
        prompt,
        maxTokens: 3000, // Reduced token limit to avoid timeouts
        temperature: 0.3
      });

      console.log('AI response received, parsing personas...');
      console.log('Response length:', aiResponse.length);
      console.log('Response preview:', aiResponse.substring(0, 200) + '...');

      // Check if response indicates token limit exceeded
      if (aiResponse.includes('Response truncated - no text content available') || 
          aiResponse.includes('No text content found in response') ||
          aiResponse.length < 100) {
        throw new Error('TOKEN_LIMIT_EXCEEDED');
      }

      // Parse the AI response into personas
      const personas = this.parseAIResponseToPersonas(aiResponse, questionnaireData.industry);

      // Save personas to database
      const personaIds: string[] = [];
      for (const persona of personas) {
        const id = await this.insertPersonaToDatabase(userId, persona);
        personaIds.push(id);
        console.log(`Saved persona: ${persona.name} with ID: ${id}`);
      }

      console.log(`Successfully generated ${personaIds.length} personas`);
      return personaIds;

    } catch (error: any) {
      console.error('Failed to generate personas:', error);
      throw error;
    }
  }

  /**
   * Create the persona generation prompt based on questionnaire data and options
   */
  private static createPersonaGenerationPrompt(
    questionnaireData: QuestionnaireData,
    options: GenerationOptions
  ): string {
    const { companyName, industry, description, products, targetAudience, challenges, valueProposition } = questionnaireData;
    const { generateMultiple, enhanceWithIndustryInsights } = options;

    const personaCount = generateMultiple ? "3-5 distinct personas" : "1 detailed persona";

    let prompt = `You are an expert marketing strategist specializing in customer persona development for email marketing campaigns.

CRITICAL: The fields companySize, location, and geographicLocation must be SINGLE STRING VALUES, NOT ARRAYS. 
Example: "companySize": "11-50" NOT "companySize": ["11-50", "51-200"]

BUSINESS CONTEXT:
Company: ${companyName}
Industry: ${industry}
Description: ${description}
Products/Services: ${products}
Target Audience: ${targetAudience}
Customer Challenges: ${challenges}
Value Proposition: ${valueProposition}

TASK: Generate ${personaCount} for email marketing campaigns. These personas will be used to:
1. Categorize and segment contact lists
2. Personalize email content and messaging
3. Optimize send times and frequency
4. Improve engagement and conversion rates

For EACH persona, provide the following in a structured JSON array format:

{
    "personas": [
        {
            "name": "[Title of Persona (not person name) - e.g., 'Tech-Savvy Decision Maker']",
            "description": "[2-3 sentence overview of this persona]",
            "targetAudience": "[Specific audience segment this represents]",
            "jobTitles": ["List", "of", "common", "job", "titles"],
            "companySize": "11-50",
            "ageRange": "25-45", 
            "location": "Urban",
            "geographicLocation": "North America",
            "incomeRange": "$75k-$150k",
            "educationLevel": "Bachelor's degree or higher",
            "decisionMakingRole": "Decision Maker|Influencer|End User",
            
            "painPoints": ["List", "of", "specific", "pain", "points"],
            "goals": ["Professional", "and", "business", "goals"],
            "challenges": ["Daily", "challenges", "they", "face"],
            "motivations": ["What", "drives", "their", "decisions"],
            "buyingTriggers": ["Events", "that", "trigger", "purchase", "decisions"],
            
            "communicationTone": "PROFESSIONAL|CASUAL|FRIENDLY|AUTHORITATIVE|CONSULTATIVE",
            "communicationStyle": "Direct|Consultative|Educational|Analytical",
            "messageFrequency": "WEEKLY|BIWEEKLY|MONTHLY",
            "preferredChannels": ["Email", "LinkedIn", "Phone"],
            "preferredContentTypes": ["case_studies", "white_papers", "demos", "webinars"],
            "industryTerms": ["Industry", "specific", "terminology"],
            "keywordPreferences": ["Keywords", "that", "resonate"],
            
            "commonObjections": ["Price", "too", "high", "Need", "approval"],
            "objectionResponses": {
                "Price too high": "Focus on ROI and value",
                "Need approval": "Provide executive summary materials"
            },
            
            "bestContactTimes": ["Tuesday 10am", "Thursday 2pm"],
            "responsePatterns": {
                "typical_response_time": "24-48 hours",
                "preferred_email_length": "Short and concise",
                "engagement_level": "High|Medium|Low"
            },
            
            "aiConfidenceScore": 0.85,
            "isNegativePersona": false
        }
    ]
}

IMPORTANT GUIDELINES:
1. Make personas SPECIFIC and ACTIONABLE for email marketing
2. Include realistic job titles and company sizes based on the target audience
3. Pain points should directly relate to what the company solves
4. Communication preferences should guide email campaign strategy
5. Include objection handling to improve email conversion
6. Each persona should be distinctly different from others
7. Base all data on the provided business context
8. CRITICAL: companySize, location, and geographicLocation must be SINGLE VALUES (strings), not arrays
9. For companySize, use formats like "11-50", "51-200", "201-500" (single value only)
10. For location, use formats like "Urban", "Suburban", "Rural" (single value only)
11. For geographicLocation, use formats like "North America", "Europe", "Asia-Pacific" (single value only)

Focus on creating personas that will directly improve:
- Email open rates through better subject lines
- Click-through rates with relevant content
- Conversion rates by addressing specific pain points
- Overall engagement through proper timing and frequency`;

    if (enhanceWithIndustryInsights) {
      prompt += "\n\nEnhance each persona with realistic industry-specific insights and benchmarks.";
    }

    prompt += "\n\nProvide ONLY the JSON response, no additional text or explanation.";

    return prompt;
  }

  /**
   * Parse AI response into persona objects
   */
  private static parseAIResponseToPersonas(aiResponse: string, industry: string): PersonaData[] {
    const personas: PersonaData[] = [];

    try {
      // Clean the response and parse JSON
      let cleanedResponse = aiResponse.trim()
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

      // Check if response is truncated or empty
      if (cleanedResponse === 'Response truncated - no text content available' || 
          cleanedResponse === 'No text content found in response' ||
          cleanedResponse.length < 50) {
        console.log('⚠️ Response is truncated or empty, using fallback persona');
        throw new Error('Response truncated or empty');
      }

      // Handle truncated JSON by finding the last complete persona
      if (!cleanedResponse.endsWith('}') && !cleanedResponse.endsWith(']')) {
        console.log('⚠️ Response appears truncated, attempting to fix...');
        
        // Find the last complete persona object by looking for complete field structures
        let lastValidEnd = -1;
        
        // Look for complete persona objects by finding patterns like "field": "value"
        const fieldPattern = /"[^"]+"\s*:\s*"[^"]*"/g;
        let match;
        let lastFieldEnd = -1;
        
        while ((match = fieldPattern.exec(cleanedResponse)) !== null) {
          lastFieldEnd = match.index + match[0].length;
        }
        
        if (lastFieldEnd > 0) {
          // Find the last complete object by looking backwards for a closing brace
          for (let i = lastFieldEnd; i >= 0; i--) {
            if (cleanedResponse[i] === '}') {
              lastValidEnd = i;
              break;
            }
          }
        }
        
        if (lastValidEnd > 0) {
          // Find the start of the personas array
          const personasStart = cleanedResponse.indexOf('"personas": [');
          if (personasStart > 0) {
            const beforePersonas = cleanedResponse.substring(0, personasStart + 13);
            const personasContent = cleanedResponse.substring(personasStart + 13, lastValidEnd + 1);
            cleanedResponse = beforePersonas + personasContent + ']}';
            console.log('✅ Attempted to fix truncated JSON');
          }
        } else {
          // If we can't find a complete persona, try to extract just the first one
          const firstPersonaStart = cleanedResponse.indexOf('{');
          const firstPersonaEnd = cleanedResponse.lastIndexOf('}');
          if (firstPersonaStart >= 0 && firstPersonaEnd > firstPersonaStart) {
            const firstPersona = cleanedResponse.substring(firstPersonaStart, firstPersonaEnd + 1);
            cleanedResponse = `{"personas": [${firstPersona}]}`;
            console.log('✅ Extracted first persona from truncated response');
          }
        }
      }

      const jsonResponse: AIResponse = JSON.parse(cleanedResponse);
      const personasArray = jsonResponse.personas;

      for (const personaJson of personasArray) {
        // Helper function to extract single value from array or string
        const extractSingleValue = (value: any, defaultValue: string): string => {
          if (Array.isArray(value)) {
            return value.length > 0 ? value[0].toString() : defaultValue;
          }
          return value || defaultValue;
        };

        const persona: PersonaData = {
          name: personaJson.name || `Persona ${personas.length + 1}`,
          description: personaJson.description || 'AI-generated persona',
          targetAudience: personaJson.targetAudience || 'General audience',
          jobTitles: Array.isArray(personaJson.jobTitles) ? personaJson.jobTitles : ['Professional'],
          companySize: (() => {
            const result = extractSingleValue(personaJson.companySize, '11-50');
            console.log('🔍 Company Size - Raw:', personaJson.companySize, 'Extracted:', result);
            return result;
          })(),
          ageRange: personaJson.ageRange || '25-55',
          location: extractSingleValue(personaJson.location, 'Urban'),
          geographicLocation: extractSingleValue(personaJson.geographicLocation, 'North America'),
          incomeRange: personaJson.incomeRange || '',
          educationLevel: personaJson.educationLevel || '',
          decisionMakingRole: personaJson.decisionMakingRole || 'Influencer',
          painPoints: Array.isArray(personaJson.painPoints) ? personaJson.painPoints : ['Efficiency', 'Cost', 'Quality'],
          goals: Array.isArray(personaJson.goals) ? personaJson.goals : ['Growth', 'Efficiency'],
          challenges: Array.isArray(personaJson.challenges) ? personaJson.challenges : ['Time constraints', 'Budget'],
          motivations: Array.isArray(personaJson.motivations) ? personaJson.motivations : ['Success', 'Innovation'],
          buyingTriggers: Array.isArray(personaJson.buyingTriggers) ? personaJson.buyingTriggers : ['Need', 'Opportunity'],
          communicationTone: personaJson.communicationTone || 'PROFESSIONAL',
          communicationStyle: personaJson.communicationStyle || 'Professional',
          messageFrequency: personaJson.messageFrequency || 'WEEKLY',
          preferredChannels: Array.isArray(personaJson.preferredChannels) ? personaJson.preferredChannels : ['Email'],
          preferredContentTypes: Array.isArray(personaJson.preferredContentTypes) ? personaJson.preferredContentTypes : ['articles', 'case_studies'],
          industryTerms: Array.isArray(personaJson.industryTerms) ? personaJson.industryTerms : [],
          keywordPreferences: Array.isArray(personaJson.keywordPreferences) ? personaJson.keywordPreferences : [],
          commonObjections: Array.isArray(personaJson.commonObjections) ? personaJson.commonObjections : ['Price', 'Timing'],
          objectionResponses: personaJson.objectionResponses || {},
          bestContactTimes: Array.isArray(personaJson.bestContactTimes) ? personaJson.bestContactTimes : ['Weekday mornings'],
          responsePatterns: personaJson.responsePatterns || {
            typical_response_time: '24-48 hours',
            preferred_email_length: 'Concise',
            engagement_level: 'Medium'
          },
          aiConfidenceScore: personaJson.aiConfidenceScore || 0.75,
          isNegativePersona: personaJson.isNegativePersona || false
        };

        personas.push(persona);
      }

    } catch (error) {
      console.error('Failed to parse AI response, creating default persona', error);
      console.log('Raw AI response that failed to parse:', aiResponse.substring(0, 500) + '...');

      // Create at least one default persona as fallback
      personas.push(this.createDefaultPersona(industry));
    }

    return personas;
  }

  /**
   * Create a default persona as fallback
   */
  private static createDefaultPersona(industry: string): PersonaData {
    return {
      name: 'Primary Decision Maker',
      description: 'Key decision maker in target organizations',
      targetAudience: `Business professionals in ${industry}`,
      jobTitles: ['Manager', 'Director', 'VP'],
      companySize: '11-50',
      ageRange: '30-50',
      location: 'Urban',
      geographicLocation: 'North America',
      incomeRange: '$75k-$150k',
      educationLevel: 'Bachelor\'s degree or higher',
      decisionMakingRole: 'Decision Maker',
      painPoints: [
        'Operational inefficiency',
        'High costs',
        'Lack of visibility',
        'Manual processes'
      ],
      goals: [
        'Improve efficiency',
        'Reduce costs',
        'Scale operations',
        'Drive growth'
      ],
      challenges: [
        'Limited resources',
        'Time constraints',
        'Technical complexity'
      ],
      motivations: [
        'Career advancement',
        'Team success',
        'Innovation'
      ],
      buyingTriggers: [
        'Budget availability',
        'Problem urgency',
        'Competitive pressure'
      ],
      communicationTone: 'PROFESSIONAL',
      communicationStyle: 'Professional and data-driven',
      messageFrequency: 'WEEKLY',
      preferredChannels: ['Email', 'LinkedIn'],
      preferredContentTypes: ['case_studies', 'demos', 'white_papers'],
      industryTerms: [],
      keywordPreferences: [],
      commonObjections: ['Price', 'Implementation time', 'Change management'],
      objectionResponses: {
        'Price': 'Focus on ROI and long-term value',
        'Implementation time': 'Highlight quick wins and phased approach'
      },
      bestContactTimes: ['Tuesday-Thursday', '10am-3pm'],
      responsePatterns: {
        typical_response_time: '24-48 hours',
        preferred_email_length: 'Concise with bullet points',
        engagement_level: 'Medium'
      },
      aiConfidenceScore: 0.5,
      isNegativePersona: false
    };
  }

  /**
   * Insert persona into database
   */
  private static async insertPersonaToDatabase(userId: number, persona: PersonaData): Promise<string> {
    const query = `
      INSERT INTO personas (
        user_id, name, industry, role, company_size, location, description,
        current_challenges, change_events, interests_priorities, communication_style,
        demographics, content_preferences, buying_triggers, geographic_location
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING id
    `;

    console.log('💾 Saving to database:');
    console.log('  - Company Size:', persona.companySize, typeof persona.companySize);
    console.log('  - Location:', persona.location, typeof persona.location);
    console.log('  - Geographic Location:', persona.geographicLocation, typeof persona.geographicLocation);

    const values = [
      userId,
      persona.name,
      persona.targetAudience, // Using targetAudience as industry for now
      persona.decisionMakingRole,
      persona.companySize,
      persona.location,
      persona.description,
      JSON.stringify(persona.painPoints),
      JSON.stringify(persona.buyingTriggers),
      JSON.stringify(persona.goals),
      persona.communicationStyle,
      JSON.stringify({
        ageRange: persona.ageRange,
        incomeRange: persona.incomeRange,
        educationLevel: persona.educationLevel
      }),
      JSON.stringify(persona.preferredContentTypes),
      JSON.stringify(persona.buyingTriggers),
      persona.geographicLocation // Single value, not JSON stringified
    ];

    const result = await Database.query(query, values);
    return result.rows[0].id;
  }
}
