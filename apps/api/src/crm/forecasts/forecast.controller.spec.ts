import { Test, TestingModule } from '@nestjs/testing';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';

const mockService = {
  getByPeriod: jest.fn(),
  generateForecast: jest.fn(),
  updateEntry: jest.fn(),
  takeSnapshot: jest.fn(),
  getSnapshots: jest.fn(),
};

describe('ForecastController', () => {
  let ctrl: ForecastController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [ForecastController],
      providers: [{ provide: ForecastService, useValue: mockService }],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ForecastController);
    jest.clearAllMocks();
  });

  it('getByPeriod returns forecast when found', async () => {
    const forecast = { id: 'f_1', periodType: 'MONTHLY' };
    mockService.getByPeriod.mockResolvedValue(forecast);
    const result = await ctrl.getByPeriod('MONTHLY', '2026-01', 'pipe_1');
    expect(result).toEqual(forecast);
    expect(mockService.getByPeriod).toHaveBeenCalledWith('MONTHLY', '2026-01');
  });

  it('getByPeriod falls back to generateForecast on error', async () => {
    const generated = { id: 'f_2', periodType: 'MONTHLY' };
    mockService.getByPeriod.mockRejectedValue(new Error('Not found'));
    mockService.generateForecast.mockResolvedValue(generated);
    const result = await ctrl.getByPeriod('MONTHLY', '2026-01', 'pipe_1');
    expect(result).toEqual(generated);
    expect(mockService.generateForecast).toHaveBeenCalledWith({
      periodType: 'MONTHLY',
      date: '2026-01',
      pipelineId: 'pipe_1',
    });
  });

  it('generate delegates to service.generateForecast', () => {
    const dto = { periodType: 'QUARTERLY', date: '2026-Q1' } as any;
    ctrl.generate(dto);
    expect(mockService.generateForecast).toHaveBeenCalledWith(dto);
  });

  it('updateEntry delegates to service.updateEntry', () => {
    const dto = { manualOverride: '5000' } as any;
    ctrl.updateEntry('fe_1', dto);
    expect(mockService.updateEntry).toHaveBeenCalledWith('fe_1', dto);
  });

  it('takeSnapshot delegates to service.takeSnapshot', () => {
    ctrl.takeSnapshot('fp_1');
    expect(mockService.takeSnapshot).toHaveBeenCalledWith('fp_1');
  });

  it('getSnapshots delegates to service.getSnapshots', () => {
    ctrl.getSnapshots('fp_1');
    expect(mockService.getSnapshots).toHaveBeenCalledWith('fp_1');
  });
});
