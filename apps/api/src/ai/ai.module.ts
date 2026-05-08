import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { MockAIProvider } from './providers/mock.provider';
import { OllamaAIProvider } from './providers/ollama.provider';
import { EmailComposerService } from './email-composer/email-composer.service';
import { EmailComposerController } from './email-composer/email-composer.controller';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { CopilotService } from './copilot/copilot.service';
import { CopilotController } from './copilot/copilot.controller';

@Module({
  providers: [
    MockAIProvider,
    OllamaAIProvider,
    AIService,
    EmailComposerService,
    EmbeddingsService,
    CopilotService,
  ],
  controllers: [EmailComposerController, CopilotController],
  exports: [AIService, EmbeddingsService, CopilotService],
})
export class AIModule {}
