import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAIProvider, ChatMessage, ChatOptions } from '../ai-provider.interface';

@Injectable()
export class OllamaAIProvider implements IAIProvider {
  readonly name = 'ollama';
  private readonly logger = new Logger(OllamaAIProvider.name);
  private readonly baseUrl: string;
  private readonly chatModel: string;
  private readonly embedModel: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.chatModel = this.config.get('OLLAMA_MODEL', 'llama3.1:8b');
    this.embedModel = this.config.get('OLLAMA_EMBED_MODEL', 'nomic-embed-text');
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.chatModel,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
        ...(options?.responseFormat === 'json' && {
          response_format: { type: 'json_object' },
        }),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Ollama chat error ${res.status}: ${text}`);
      throw new Error(`Ollama chat failed: ${res.status}`);
    }

    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return json.choices[0].message.content;
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embedModel, prompt: text }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Ollama embed error ${res.status}: ${errText}`);
      throw new Error(`Ollama embed failed: ${res.status}`);
    }

    const json = (await res.json()) as { embedding: number[] };
    return json.embedding;
  }
}
