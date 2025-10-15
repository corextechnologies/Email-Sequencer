// src/services/websiteAnalysisService.ts
import { UniversalLlmService } from './universalLlmService';

export interface WebsiteAnalysisResult {
  companyName: string;
  industry: string;
  description: string;
  products: string;
  targetMarket: string;
  challenges: string;
  valueProposition: string;
}

export class WebsiteAnalysisService {
  /**
   * Analyze website using AI and return structured business info
   */
  static async analyzeWebsite(
    url: string,
    provider: string,
    apiKey: string
  ): Promise<WebsiteAnalysisResult> {
    try {
      console.log(`🔍 Analyzing website: ${url}`);

      const normalizedUrl = this.normalizeUrl(url);
      const content = await this.fetchWebsiteContent(normalizedUrl);
      const prompt = this.createPrompt(normalizedUrl, content);

      const aiResponse = await UniversalLlmService.generateText({
        provider,
        apiKey,
        prompt,
        maxTokens: 2000,
        temperature: 0.4
      });

      console.log('✅ AI response received');
      return this.parseAIResponse(aiResponse, normalizedUrl);
    } catch (error) {
      console.error('❌ WebsiteAnalysisService error:', error);
      return this.fallback(url);
    }
  }

  private static normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('www.')) return `https://${trimmed}`;
    return `https://${trimmed}`;
  }

  private static async fetchWebsiteContent(url: string): Promise<string> {
    const fetch = await import('node-fetch');
    const response = await fetch.default(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmailMarketing/1.0)' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    // Clean HTML
    return text.replace(/<script[^>]*>.*?<\/script>/gs, '')
               .replace(/<style[^>]*>.*?<\/style>/gs, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim()
               .slice(0, 4000);
  }

  private static createPrompt(url: string, content: string): string {
    return `
You are a business analyst. Analyze the website and provide ONLY these fields:

URL: ${url}
Website Content: ${content}

Return fields:

COMPANY_NAME:
INDUSTRY:
BUSINESS_DESCRIPTION:
PRODUCTS_SERVICES:
TARGET_AUDIENCE:
CUSTOMER_CHALLENGES:
VALUE_PROPOSITION:
    `.trim();
  }

  private static parseAIResponse(aiResponse: string, url: string): WebsiteAnalysisResult {
    const lines = aiResponse.split('\n').map(l => l.trim());
    const fields: Record<string, string> = {};

    let currentField: string | null = null;
    let currentContent = '';

    for (const line of lines) {
      if (line.includes(':')) {
        if (currentField) fields[currentField] = currentContent.trim();
        const [key, ...rest] = line.split(':');
        currentField = key.trim().toUpperCase();
        currentContent = rest.join(':').trim();
      } else if (currentField) {
        currentContent += ' ' + line;
      }
    }
    if (currentField) fields[currentField] = currentContent.trim();

    return {
      companyName: fields['COMPANY_NAME'] || this.extractDomain(url),
      industry: fields['INDUSTRY'] || 'Professional Services',
      description: fields['BUSINESS_DESCRIPTION'] || 'Professional services company',
      products: fields['PRODUCTS_SERVICES'] || 'Professional services and solutions',
      targetMarket: fields['TARGET_AUDIENCE'] || 'Businesses seeking professional services',
      challenges: fields['CUSTOMER_CHALLENGES'] || 'Operational challenges and growth needs',
      valueProposition: fields['VALUE_PROPOSITION'] || 'Expertise and proven results'
    };
  }

  private static extractDomain(url: string): string {
    try {
      const domain = new URL(url).host.replace('www.', '');
      return domain.split('.')[0].replace(/^\w/, c => c.toUpperCase());
    } catch {
      return 'Company';
    }
  }

  private static fallback(url: string): WebsiteAnalysisResult {
    const domain = this.extractDomain(url);
    return {
      companyName: domain,
      industry: 'Professional Services',
      description: 'Professional services company providing business solutions',
      products: 'Professional services and business solutions',
      targetMarket: 'Businesses seeking professional services',
      challenges: 'Helping businesses overcome operational challenges and improve efficiency',
      valueProposition: 'Professional expertise and proven results'
    };
  }
}
