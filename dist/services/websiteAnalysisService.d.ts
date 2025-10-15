export interface WebsiteAnalysisResult {
    companyName: string;
    industry: string;
    description: string;
    products: string;
    targetMarket: string;
    challenges: string;
    valueProposition: string;
}
export declare class WebsiteAnalysisService {
    /**
     * Analyze website using AI and return structured business info
     */
    static analyzeWebsite(url: string, provider: string, apiKey: string): Promise<WebsiteAnalysisResult>;
    private static normalizeUrl;
    private static fetchWebsiteContent;
    private static createPrompt;
    private static parseAIResponse;
    private static extractDomain;
    private static fallback;
}
//# sourceMappingURL=websiteAnalysisService.d.ts.map