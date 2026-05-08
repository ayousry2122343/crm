import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { IAIProvider, ChatMessage, ChatOptions } from '../ai-provider.interface';

@Injectable()
export class MockAIProvider implements IAIProvider {
  readonly name = 'mock';

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const lastMsg = messages[messages.length - 1]?.content ?? '';
    const hash = createHash('md5').update(lastMsg).digest('hex').slice(0, 8);

    if (options?.responseFormat === 'json') {
      return JSON.stringify({
        subject: `[mock subject: ${hash}]`,
        body: `[mock body for: ${hash}]`,
      });
    }
    return `[mock AI response: ${hash}]`;
  }

  async embed(text: string): Promise<number[]> {
    const hash = createHash('md5').update(text).digest('hex');
    return Array.from({ length: 1536 }, (_, i) => {
      const byte = parseInt(hash[(i * 2) % 32] + hash[(i * 2 + 1) % 32], 16);
      return (byte - 128) / 128;
    });
  }
}
