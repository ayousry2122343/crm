import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAIProvider, ChatMessage, ChatOptions } from './ai-provider.interface';
import { MockAIProvider } from './providers/mock.provider';
import { OllamaAIProvider } from './providers/ollama.provider';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly provider: IAIProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly mockProvider: MockAIProvider,
    private readonly ollamaProvider: OllamaAIProvider,
  ) {
    const providerName = this.config.get('AI_DEFAULT_PROVIDER', 'mock');
    switch (providerName) {
      case 'ollama':
        this.provider = this.ollamaProvider;
        break;
      default:
        this.provider = this.mockProvider;
    }
    this.logger.log(`AI provider: ${this.provider.name}`);
  }

  get providerName() {
    return this.provider.name;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    return this.provider.chat(messages, options);
  }

  async embed(text: string): Promise<number[]> {
    return this.provider.embed(text);
  }
}
