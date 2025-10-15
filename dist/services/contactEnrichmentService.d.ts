export interface EnrichmentResult {
    professional_context: string;
    recent_activity: string;
    company_insights: string;
    communication_style: string;
    personality_summary: string;
    engagement_insights: string;
    key_quotes_or_posts: string[];
    enriched_json: any;
}
/**
 * Enrich contact with AI-powered insights
 */
export declare function enrichContactWithAI(userId: number, contactId: string, provider: string, apiKey: string): Promise<EnrichmentResult | {
    error: string;
}>;
/**
 * Get enriched data for a contact
 */
export declare function getEnrichedData(userId: number, contactId: string): Promise<EnrichmentResult | {
    error: string;
}>;
//# sourceMappingURL=contactEnrichmentService.d.ts.map