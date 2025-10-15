"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMRegistry = exports.OpenAIProvider = void 0;
class OpenAIProvider {
    constructor() {
        this.name = 'openai';
    }
    async generate({ prompt, apiKey }) {
        // Placeholder: real call would use openai SDK
        if (!apiKey)
            throw new Error('Missing API key');
        return `LLM output for: ${prompt.substring(0, 40)}...`;
    }
}
exports.OpenAIProvider = OpenAIProvider;
class LLMRegistry {
    static get(name) {
        const p = this.providers[name];
        if (!p)
            throw new Error('Provider not found');
        return p;
    }
}
exports.LLMRegistry = LLMRegistry;
LLMRegistry.providers = {
    openai: new OpenAIProvider(),
};
//# sourceMappingURL=llmProvider.js.map