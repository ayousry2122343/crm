import { Test, TestingModule } from '@nestjs/testing';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';

const mockService = {
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  archive: jest.fn(),
  recalculateProgress: jest.fn(),
};

describe('GoalController', () => {
  let ctrl: GoalController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [GoalController],
      providers: [{ provide: GoalService, useValue: mockService }],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(GoalController);
    jest.clearAllMocks();
  });

  it('list delegates to service.list', () => {
    const q = { limit: 20 } as any;
    ctrl.list(q);
    expect(mockService.list).toHaveBeenCalledWith(q);
  });

  it('get delegates to service.get', () => {
    ctrl.get('g_1');
    expect(mockService.get).toHaveBeenCalledWith('g_1');
  });

  it('create delegates to service.create', () => {
    const dto = { name: 'Q1 Goal', metric: 'DEALS_WON' } as any;
    ctrl.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates to service.update', () => {
    const dto = { name: 'Updated' } as any;
    ctrl.update('g_1', dto);
    expect(mockService.update).toHaveBeenCalledWith('g_1', dto);
  });

  it('archive delegates to service.archive', () => {
    ctrl.archive('g_1');
    expect(mockService.archive).toHaveBeenCalledWith('g_1');
  });

  it('recalculate delegates to service.recalculateProgress', () => {
    ctrl.recalculate('g_1');
    expect(mockService.recalculateProgress).toHaveBeenCalledWith('g_1');
  });
});
