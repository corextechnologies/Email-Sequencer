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
export declare class PersonaGenerationService {
    /**
     * Generate personas from questionnaire data
     */
    static generatePersonasFromQuestionnaire(userId: number, provider: string, apiKey: string, questionnaireData: QuestionnaireData, options: GenerationOptions): Promise<string[]>;
    /**
     * Create the persona generation prompt based on questionnaire data and options
     */
    private static createPersonaGenerationPrompt;
    /**
     * Parse AI response into persona objects
     */
    private static parseAIResponseToPersonas;
    /**
     * Create a default persona as fallback
     */
    private static createDefaultPersona;
    /**
     * Insert persona into database
     */
    private static insertPersonaToDatabase;
}
//# sourceMappingURL=personaGenerationService.d.ts.map