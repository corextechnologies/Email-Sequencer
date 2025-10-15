export type LLMProviderName = 'openai';
export interface LLMProvider {
    name: LLMProviderName;
    generate(input: {
        prompt: string;
        apiKey: string;
    }): Promise<string>;
}
export declare class OpenAIProvider implements LLMProvider {
    name: LLMProviderName;
    generate({ prompt, apiKey }: {
        prompt: string;
        apiKey: string;
    }): Promise<string>;
}
export declare class LLMRegistry {
    private static providers;
    static get(name: LLMProviderName): LLMProvider;
}
//# sourceMappingURL=llmProvider.d.ts.map