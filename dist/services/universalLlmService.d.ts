export interface GenerateTextOptions {
    provider: string;
    apiKey: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
}
export declare class UniversalLlmService {
    static generateText(options: GenerateTextOptions): Promise<string>;
    private static generateWithOpenAI;
    private static generateWithAnthropic;
    private static generateWithGemini;
    private static generateWithMistral;
    private static generateWithGroq;
    private static generateWithCohere;
    private static generateWithPerplexity;
    static testKey(provider: string, apiKey: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
    private static testOpenAIKey;
    private static testAnthropicKey;
    private static testGeminiKey;
    private static testMistralKey;
    private static testGroqKey;
    private static testCohereKey;
    private static testPerplexityKey;
}
//# sourceMappingURL=universalLlmService.d.ts.map