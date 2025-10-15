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
exports.WebsiteAnalysisService = void 0;
// src/services/websiteAnalysisService.ts
const universalLlmService_1 = require("./universalLlmService");
class WebsiteAnalysisService {
    /**
     * Analyze website using AI and return structured business info
     */
    static async analyzeWebsite(url, provider, apiKey) {
        try {
            console.log(`🔍 Analyzing website: ${url}`);
            const normalizedUrl = this.normalizeUrl(url);
            const content = await this.fetchWebsiteContent(normalizedUrl);
            const prompt = this.createPrompt(normalizedUrl, content);
            const aiResponse = await universalLlmService_1.UniversalLlmService.generateText({
                provider,
                apiKey,
                prompt,
                maxTokens: 2000,
                temperature: 0.4
            });
            console.log('✅ AI response received');
            return this.parseAIResponse(aiResponse, normalizedUrl);
        }
        catch (error) {
            console.error('❌ WebsiteAnalysisService error:', error);
            return this.fallback(url);
        }
    }
    static normalizeUrl(url) {
        const trimmed = url.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
            return trimmed;
        if (trimmed.startsWith('www.'))
            return `https://${trimmed}`;
        return `https://${trimmed}`;
    }
    static async fetchWebsiteContent(url) {
        const fetch = await Promise.resolve().then(() => __importStar(require('node-fetch')));
        const response = await fetch.default(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmailMarketing/1.0)' }
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const text = await response.text();
        // Clean HTML
        return text.replace(/<script[^>]*>.*?<\/script>/gs, '')
            .replace(/<style[^>]*>.*?<\/style>/gs, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 4000);
    }
    static createPrompt(url, content) {
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
    static parseAIResponse(aiResponse, url) {
        const lines = aiResponse.split('\n').map(l => l.trim());
        const fields = {};
        let currentField = null;
        let currentContent = '';
        for (const line of lines) {
            if (line.includes(':')) {
                if (currentField)
                    fields[currentField] = currentContent.trim();
                const [key, ...rest] = line.split(':');
                currentField = key.trim().toUpperCase();
                currentContent = rest.join(':').trim();
            }
            else if (currentField) {
                currentContent += ' ' + line;
            }
        }
        if (currentField)
            fields[currentField] = currentContent.trim();
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
    static extractDomain(url) {
        try {
            const domain = new URL(url).host.replace('www.', '');
            return domain.split('.')[0].replace(/^\w/, c => c.toUpperCase());
        }
        catch {
            return 'Company';
        }
    }
    static fallback(url) {
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
exports.WebsiteAnalysisService = WebsiteAnalysisService;
//# sourceMappingURL=websiteAnalysisService.js.map