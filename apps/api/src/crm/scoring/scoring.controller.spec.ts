import { Test, TestingModule } from '@nestjs/testing';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';

const mockService = {
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  archive: jest.fn(),
  scoreEntity: jest.fn(),
  bulkRescore: jest.fn(),
};

describe('ScoringController', () => {
  let ctrl: ScoringController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [ScoringController],
      providers: [{ provide: ScoringService, useValue: mockService }],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ScoringController);
    jest.clearAllMocks();
  });

  it('list delegates to service.list', () => {
    const q = { cursor: 'c1', limit: 10 } as any;
    ctrl.list(q);
    expect(mockService.list).toHaveBeenCalledWith(q);
  });

  it('get delegates to service.get', () => {
    ctrl.get('sr_1');
    expect(mockService.get).toHaveBeenCalledWith('sr_1');
  });

  it('create delegates to service.create', () => {
    const dto = { name: 'Rule' } as any;
    ctrl.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates to service.update', () => {
    const dto = { name: 'Updated' } as any;
    ctrl.update('sr_1', dto);
    expect(mockService.update).toHaveBeenCalledWith('sr_1', dto);
  });

  it('archive delegates to service.archive', () => {
    ctrl.archive('sr_1');
    expect(mockService.archive).toHaveBeenCalledWith('sr_1');
  });

  it('score delegates to service.scoreEntity', () => {
    ctrl.score('Person', 'p_1');
    expect(mockService.scoreEntity).toHaveBeenCalledWith('Person', 'p_1');
  });

  it('bulkRescore delegates to service.bulkRescore', () => {
    ctrl.bulkRescore('Deal');
    expect(mockService.bulkRescore).toHaveBeenCalledWith('Deal');
  });
});
