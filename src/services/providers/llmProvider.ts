export type LLMProviderName = 'openai';

export interface LLMProvider {
	name: LLMProviderName;
	generate(input: { prompt: string; apiKey: string }): Promise<string>;
}

export class OpenAIProvider implements LLMProvider {
	name: LLMProviderName = 'openai';
	async generate({ prompt, apiKey }: { prompt: string; apiKey: string }): Promise<string> {
		// Placeholder: real call would use openai SDK
		if (!apiKey) throw new Error('Missing API key');
		return `LLM output for: ${prompt.substring(0, 40)}...`;
	}
}

export class LLMRegistry {
	private static providers: Record<string, LLMProvider> = {
		openai: new OpenAIProvider(),
	};

	static get(name: LLMProviderName): LLMProvider {
		const p = this.providers[name];
		if (!p) throw new Error('Provider not found');
		return p;
	}
}


