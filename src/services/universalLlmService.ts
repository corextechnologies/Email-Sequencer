import fetch, { Headers } from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Provider = 'openai' | 'claude' | 'anthropic' | 'gemini' | 'mistral' | 'groq' | 'cohere' | 'perplexity';

export interface GenerateTextOptions {
  provider: string;
  apiKey: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export class UniversalLlmService {
  static async generateText(options: GenerateTextOptions): Promise<string> {
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
    } catch (error: any) {
      throw new Error(`LLM generation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  private static async generateWithOpenAI(apiKey: string, prompt: string, maxTokens: number, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      console.log('Making OpenAI API call...');
      console.log('Model: gpt-3.5-turbo');
      console.log('Max tokens:', maxTokens);
      console.log('Temperature:', temperature);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        } as any,
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // Changed from gpt-4 to gpt-3.5-turbo for broader access
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
        signal: controller.signal as any,
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
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('OpenAI generation error:', err);
      throw new Error(`OpenAI generation error: ${err?.message || err}`);
    }
  }

  private static async generateWithAnthropic(apiKey: string, prompt: string, maxTokens: number, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      const headers = new Headers();
      headers.set('x-api-key', apiKey);
      headers.set('anthropic-version', '2023-06-01');
      headers.set('Content-Type', 'application/json');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal as any,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.content[0]?.text || '';
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Anthropic generation error: ${err?.message || err}`);
    }
  }

  private static async generateWithGemini(apiKey: string, prompt: string, maxTokens: number, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // Increased to 60 seconds
    
    try {
      console.log('Making Gemini API call...');
      console.log('Model: gemini-pro-latest');
      console.log('Max tokens:', maxTokens);
      console.log('Temperature:', temperature);
      
      // Use the latest Gemini Pro model
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${encodeURIComponent(apiKey)}`;
      
      const response = await fetch(url, {
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
        signal: controller.signal as any,
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
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('Gemini generation error:', err);
      throw new Error(`Gemini generation error: ${err?.message || err}`);
    }
  }

  private static async generateWithMistral(apiKey: string, prompt: string, maxTokens: number, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        } as any,
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
        signal: controller.signal as any,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Mistral generation error: ${err?.message || err}`);
    }
  }

  private static async generateWithGroq(apiKey: string, prompt: string, maxTokens: number, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        } as any,
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
        signal: controller.signal as any,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Groq generation error: ${err?.message || err}`);
    }
  }

  private static async generateWithCohere(apiKey: string, prompt: string, maxTokens: number, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch('https://api.cohere.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        } as any,
        body: JSON.stringify({
          model: 'command',
          prompt: prompt,
          max_tokens: maxTokens,
          temperature: temperature,
        }),
        signal: controller.signal as any,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cohere API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.generations[0]?.text || '';
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Cohere generation error: ${err?.message || err}`);
    }
  }

  private static async generateWithPerplexity(apiKey: string, prompt: string, maxTokens: number, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        } as any,
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
        signal: controller.signal as any,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Perplexity generation error: ${err?.message || err}`);
    }
  }

  static async testKey(provider: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
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
    } catch (error: any) {
      return { valid: false, error: error?.message || 'Unknown error' };
    }
  }

  private static async testOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        } as any,
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      if (res.status === 200) return { valid: true };
      const text = await res.text();
      return { valid: false, error: `OpenAI validation failed (${res.status}): ${truncate(text)}` };
    } catch (err: any) {
      clearTimeout(timeout);
      return { valid: false, error: `OpenAI validation error: ${err?.message || err}` };
    }
  }

  private static async testAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const headers = new Headers();
      headers.set('x-api-key', apiKey);
      headers.set('anthropic-version', '2023-06-01');
      const res = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers,
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      if (res.status === 200) return { valid: true };
      const text = await res.text();
      return { valid: false, error: `Anthropic validation failed (${res.status}): ${truncate(text)}` };
    } catch (err: any) {
      clearTimeout(timeout);
      return { valid: false, error: `Anthropic validation error: ${err?.message || err}` };
    }
  }

  private static async testGeminiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      if (res.status === 200) return { valid: true };
      const text = await res.text();
      return { valid: false, error: `Gemini validation failed (${res.status}): ${truncate(text)}` };
    } catch (err: any) {
      clearTimeout(timeout);
      return { valid: false, error: `Gemini validation error: ${err?.message || err}` };
    }
  }

  private static async testMistralKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://api.mistral.ai/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` } as any,
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      if (res.status === 200) return { valid: true };
      const text = await res.text();
      return { valid: false, error: `Mistral validation failed (${res.status}): ${truncate(text)}` };
    } catch (err: any) {
      clearTimeout(timeout);
      return { valid: false, error: `Mistral validation error: ${err?.message || err}` };
    }
  }

  private static async testGroqKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` } as any,
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      if (res.status === 200) return { valid: true };
      const text = await res.text();
      return { valid: false, error: `Groq validation failed (${res.status}): ${truncate(text)}` };
    } catch (err: any) {
      clearTimeout(timeout);
      return { valid: false, error: `Groq validation error: ${err?.message || err}` };
    }
  }

  private static async testCohereKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://api.cohere.ai/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` } as any,
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      if (res.status === 200) return { valid: true };
      const text = await res.text();
      return { valid: false, error: `Cohere validation failed (${res.status}): ${truncate(text)}` };
    } catch (err: any) {
      clearTimeout(timeout);
      return { valid: false, error: `Cohere validation error: ${err?.message || err}` };
    }
  }

  private static async testPerplexityKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://api.perplexity.ai/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` } as any,
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      if (res.status === 200) return { valid: true };
      const text = await res.text();
      return { valid: false, error: `Perplexity validation failed (${res.status}): ${truncate(text)}` };
    } catch (err: any) {
      clearTimeout(timeout);
      return { valid: false, error: `Perplexity validation error: ${err?.message || err}` };
    }
  }
}

function truncate(text: string, max = 300): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}


