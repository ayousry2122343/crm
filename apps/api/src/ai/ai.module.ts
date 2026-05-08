import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { MockAIProvider } from './providers/mock.provider';
import { OllamaAIProvider } from './providers/ollama.provider';
import { EmailComposerService } from './email-composer/email-composer.service';
import { EmailComposerController } from './email-composer/email-composer.controller';
import { EmbeddingsService } from './embeddings/embeddings.service';

@Module({
  providers: [
    MockAIProvider,
    OllamaAIProvider,
    AIService,
    EmailComposerService,
    EmbeddingsService,
  ],
  controllers: [EmailComposerController],
  exports: [AIService, EmbeddingsService],
})
export class AIModule {}
