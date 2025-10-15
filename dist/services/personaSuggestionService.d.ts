export interface PersonaSuggestionResult {
    bestPersonaName: string;
    matchConfidence: number;
    reason: string;
}
export declare function suggestPersonaForContact(userId: number, contactId: string, provider: string, apiKey: string): Promise<PersonaSuggestionResult | {
    error: string;
}>;
//# sourceMappingURL=personaSuggestionService.d.ts.map