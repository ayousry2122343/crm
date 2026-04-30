import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it('returns ok status', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(typeof result.timestamp).toBe('string');
  });
});
