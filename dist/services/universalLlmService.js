"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalLlmService = void 0;
const node_fetch_1 = __importStar(require("node-fetch"));
class UniversalLlmService {
    static async generateText(options) {
        const { provider, apiKey, prompt, maxTokens = 3000, temperature = 0.7 } = options;
        try {
            const normalized = provider.toLowerCase();
            switch (normalized) {
                case 'openai':
                    return await this.generateWithOpenAI(apiKey, prompt, maxTokens, temperature);
                case 'claude':
                case 'anthropic':
                    return await this.generateWithAnthropic(apiKey, prompt, maxTokens, temperature);
                case 'gemini':
                    return await this.generateWithGemini(apiKey, prompt, maxTokens, temperature);
                case 'mistral':
                    return await this.generateWithMistral(apiKey, prompt, maxTokens, temperature);
                case 'groq':
                    return await this.generateWithGroq(apiKey, prompt, maxTokens, temperature);
                case 'cohere':
                    return await this.generateWithCohere(apiKey, prompt, maxTokens, temperature);
                case 'perplexity':
                    return await this.generateWithPerplexity(apiKey, prompt, maxTokens, temperature);
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        }
        catch (error) {
            throw new Error(`LLM generation failed: ${error?.message || 'Unknown error'}`);
        }
    }
    static async generateWithOpenAI(apiKey, prompt, maxTokens, temperature) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            console.log('Making OpenAI API call...');
            console.log('Model: gpt-3.5-turbo');
            console.log('Max tokens:', maxTokens);
            console.log('Temperature:', temperature);
            const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo', // Changed from gpt-4 to gpt-3.5-turbo for broader access
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: temperature,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            console.log('OpenAI response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('OpenAI API error response:', errorText);
                throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            console.log('OpenAI response data keys:', Object.keys(data));
            return data.choices[0]?.message?.content || '';
        }
        catch (err) {
            clearTimeout(timeout);
            console.error('OpenAI generation error:', err);
            throw new Error(`OpenAI generation error: ${err?.message || err}`);
        }
    }
    static async generateWithAnthropic(apiKey, prompt, maxTokens, temperature) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            const headers = new node_fetch_1.Headers();
            headers.set('x-api-key', apiKey);
            headers.set('anthropic-version', '2023-06-01');
            headers.set('Content-Type', 'application/json');
            const response = await (0, node_fetch_1.default)('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: maxTokens,
                    temperature: temperature,
                    messages: [{ role: 'user', content: prompt }],
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            return data.content[0]?.text || '';
        }
        catch (err) {
            clearTimeout(timeout);
            throw new Error(`Anthropic generation error: ${err?.message || err}`);
        }
    }
    static async generateWithGemini(apiKey, prompt, maxTokens, temperature) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // Increased to 60 seconds
        try {
            console.log('Making Gemini API call...');
            console.log('Model: gemini-pro-latest');
            console.log('Max tokens:', maxTokens);
            console.log('Temperature:', temperature);
            // Use the latest Gemini Pro model
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${encodeURIComponent(apiKey)}`;
            const response = await (0, node_fetch_1.default)(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: maxTokens,
                        temperature: temperature,
                    },
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            console.log('Gemini response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error response:', errorText);
                throw new Error(`Gemini API error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            console.log('Gemini response data keys:', Object.keys(data));
            console.log('Gemini response structure:', JSON.stringify(data, null, 2));
            // Handle different response structures
            if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                // Check if the response was truncated due to token limit
                if (candidate.finishReason === 'MAX_TOKENS') {
                    console.log('⚠️ Response truncated due to token limit');
                }
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    return candidate.content.parts[0].text || '';
                }
                // If no parts but has content, check for role
                if (candidate.content && candidate.content.role === 'model' && !candidate.content.parts) {
                    console.log('⚠️ Response has no text parts, likely truncated');
                    return 'Response truncated - no text content available';
                }
            }
            // Fallback: try to find text in the response
            const responseText = JSON.stringify(data);
            console.log('No text found in expected structure, full response:', responseText);
            return 'No text content found in response';
        }
        catch (err) {
            clearTimeout(timeout);
            console.error('Gemini generation error:', err);
            throw new Error(`Gemini generation error: ${err?.message || err}`);
        }
    }
    static async generateWithMistral(apiKey, prompt, maxTokens, temperature) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await (0, node_fetch_1.default)('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'mistral-large-latest',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: temperature,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Mistral API error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        }
        catch (err) {
            clearTimeout(timeout);
            throw new Error(`Mistral generation error: ${err?.message || err}`);
        }
    }
    static async generateWithGroq(apiKey, prompt, maxTokens, temperature) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await (0, node_fetch_1.default)('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: temperature,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        }
        catch (err) {
            clearTimeout(timeout);
            throw new Error(`Groq generation error: ${err?.message || err}`);
        }
    }
    static async generateWithCohere(apiKey, prompt, maxTokens, temperature) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await (0, node_fetch_1.default)('https://api.cohere.ai/v1/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'command',
                    prompt: prompt,
                    max_tokens: maxTokens,
                    temperature: temperature,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Cohere API error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            return data.generations[0]?.text || '';
        }
        catch (err) {
            clearTimeout(timeout);
            throw new Error(`Cohere generation error: ${err?.message || err}`);
        }
    }
    static async generateWithPerplexity(apiKey, prompt, maxTokens, temperature) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await (0, node_fetch_1.default)('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.1-sonar-small-128k-online',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature: temperature,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        }
        catch (err) {
            clearTimeout(timeout);
            throw new Error(`Perplexity generation error: ${err?.message || err}`);
        }
    }
    static async testKey(provider, apiKey) {
        try {
            const normalized = provider.toLowerCase();
            switch (normalized) {
                case 'openai':
                    return await this.testOpenAIKey(apiKey);
                case 'claude':
                case 'anthropic':
                    return await this.testAnthropicKey(apiKey);
                case 'gemini':
                    return await this.testGeminiKey(apiKey);
                case 'mistral':
                    return await this.testMistralKey(apiKey);
                case 'groq':
                    return await this.testGroqKey(apiKey);
                case 'cohere':
                    return await this.testCohereKey(apiKey);
                case 'perplexity':
                    return await this.testPerplexityKey(apiKey);
                default:
                    return { valid: false, error: `Unsupported provider: ${provider}` };
            }
        }
        catch (error) {
            return { valid: false, error: error?.message || 'Unknown error' };
        }
    }
    static async testOpenAIKey(apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await (0, node_fetch_1.default)('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.status === 200)
                return { valid: true };
            const text = await res.text();
            return { valid: false, error: `OpenAI validation failed (${res.status}): ${truncate(text)}` };
        }
        catch (err) {
            clearTimeout(timeout);
            return { valid: false, error: `OpenAI validation error: ${err?.message || err}` };
        }
    }
    static async testAnthropicKey(apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const headers = new node_fetch_1.Headers();
            headers.set('x-api-key', apiKey);
            headers.set('anthropic-version', '2023-06-01');
            const res = await (0, node_fetch_1.default)('https://api.anthropic.com/v1/models', {
                method: 'GET',
                headers,
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.status === 200)
                return { valid: true };
            const text = await res.text();
            return { valid: false, error: `Anthropic validation failed (${res.status}): ${truncate(text)}` };
        }
        catch (err) {
            clearTimeout(timeout);
            return { valid: false, error: `Anthropic validation error: ${err?.message || err}` };
        }
    }
    static async testGeminiKey(apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`;
            const res = await (0, node_fetch_1.default)(url, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.status === 200)
                return { valid: true };
            const text = await res.text();
            return { valid: false, error: `Gemini validation failed (${res.status}): ${truncate(text)}` };
        }
        catch (err) {
            clearTimeout(timeout);
            return { valid: false, error: `Gemini validation error: ${err?.message || err}` };
        }
    }
    static async testMistralKey(apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await (0, node_fetch_1.default)('https://api.mistral.ai/v1/models', {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.status === 200)
                return { valid: true };
            const text = await res.text();
            return { valid: false, error: `Mistral validation failed (${res.status}): ${truncate(text)}` };
        }
        catch (err) {
            clearTimeout(timeout);
            return { valid: false, error: `Mistral validation error: ${err?.message || err}` };
        }
    }
    static async testGroqKey(apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await (0, node_fetch_1.default)('https://api.groq.com/openai/v1/models', {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.status === 200)
                return { valid: true };
            const text = await res.text();
            return { valid: false, error: `Groq validation failed (${res.status}): ${truncate(text)}` };
        }
        catch (err) {
            clearTimeout(timeout);
            return { valid: false, error: `Groq validation error: ${err?.message || err}` };
        }
    }
    static async testCohereKey(apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await (0, node_fetch_1.default)('https://api.cohere.ai/v1/models', {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.status === 200)
                return { valid: true };
            const text = await res.text();
            return { valid: false, error: `Cohere validation failed (${res.status}): ${truncate(text)}` };
        }
        catch (err) {
            clearTimeout(timeout);
            return { valid: false, error: `Cohere validation error: ${err?.message || err}` };
        }
    }
    static async testPerplexityKey(apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await (0, node_fetch_1.default)('https://api.perplexity.ai/v1/models', {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.status === 200)
                return { valid: true };
            const text = await res.text();
            return { valid: false, error: `Perplexity validation failed (${res.status}): ${truncate(text)}` };
        }
        catch (err) {
            clearTimeout(timeout);
            return { valid: false, error: `Perplexity validation error: ${err?.message || err}` };
        }
    }
}
exports.UniversalLlmService = UniversalLlmService;
function truncate(text, max = 300) {
    if (!text)
        return '';
    if (text.length <= max)
        return text;
    return text.slice(0, max) + '...';
}
//# sourceMappingURL=universalLlmService.js.map