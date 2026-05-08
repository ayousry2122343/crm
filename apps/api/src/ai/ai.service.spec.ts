import { AIService } from './ai.service';
import { MockAIProvider } from './providers/mock.provider';
import { OllamaAIProvider } from './providers/ollama.provider';
import { ConfigService } from '@nestjs/config';

function buildSvc(provider = 'mock') {
  const config = { get: jest.fn((key: string, def?: string) => (key === 'AI_DEFAULT_PROVIDER' ? provider : def)) } as any;
  const mockProvider = new MockAIProvider();
  const ollamaProvider = new OllamaAIProvider(config);
  const svc = new AIService(config, mockProvider, ollamaProvider);
  return { svc, mockProvider, ollamaProvider };
}

describe('AIService', () => {
  it('defaults to mock provider', () => {
    const { svc } = buildSvc();
    expect(svc.providerName).toBe('mock');
  });

  it('selects ollama provider when configured', () => {
    const { svc } = buildSvc('ollama');
    expect(svc.providerName).toBe('ollama');
  });
});

describe('AIService.chat (mock)', () => {
  it('returns a deterministic mock response', async () => {
    const { svc } = buildSvc();
    const result = await svc.chat([{ role: 'user', content: 'Hello' }]);
    expect(result).toMatch(/\[mock AI response: [a-f0-9]+\]/);
  });

  it('returns JSON when responseFormat is json', async () => {
    const { svc } = buildSvc();
    const result = await svc.chat([{ role: 'user', content: 'test' }], { responseFormat: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('subject');
    expect(parsed).toHaveProperty('body');
  });

  it('is deterministic for same input', async () => {
    const { svc } = buildSvc();
    const a = await svc.chat([{ role: 'user', content: 'same input' }]);
    const b = await svc.chat([{ role: 'user', content: 'same input' }]);
    expect(a).toBe(b);
  });

  it('differs for different input', async () => {
    const { svc } = buildSvc();
    const a = await svc.chat([{ role: 'user', content: 'input A' }]);
    const b = await svc.chat([{ role: 'user', content: 'input B' }]);
    expect(a).not.toBe(b);
  });
});

describe('AIService.embed (mock)', () => {
  it('returns 1536-dim vector', async () => {
    const { svc } = buildSvc();
    const vec = await svc.embed('Hello world');
    expect(vec).toHaveLength(1536);
    expect(typeof vec[0]).toBe('number');
  });

  it('returns normalized values between -1 and 1', async () => {
    const { svc } = buildSvc();
    const vec = await svc.embed('test embedding');
    for (const v of vec) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
