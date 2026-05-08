import { Test, TestingModule } from '@nestjs/testing';
import { DealController } from './deal.controller';
import { DealService } from './deal.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';

const mockService = {
  list: jest.fn(),
  kanban: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  moveStage: jest.fn(),
  archive: jest.fn(),
};

describe('DealController', () => {
  let ctrl: DealController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [DealController],
      providers: [{ provide: DealService, useValue: mockService }],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(DealController);
    jest.clearAllMocks();
  });

  it('list delegates to service.list', () => {
    const q = { limit: 20 } as any;
    ctrl.list(q);
    expect(mockService.list).toHaveBeenCalledWith(q);
  });

  it('kanban delegates to service.kanban', () => {
    ctrl.kanban('pipe_1');
    expect(mockService.kanban).toHaveBeenCalledWith('pipe_1');
  });

  it('get delegates to service.get', () => {
    ctrl.get('d_1');
    expect(mockService.get).toHaveBeenCalledWith('d_1');
  });

  it('create delegates to service.create', () => {
    const dto = { name: 'Deal', amount: '500' } as any;
    ctrl.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates to service.update', () => {
    const dto = { name: 'Updated' } as any;
    ctrl.update('d_1', dto);
    expect(mockService.update).toHaveBeenCalledWith('d_1', dto);
  });

  it('moveStage delegates to service.moveStage', () => {
    const dto = { stageId: 's_2' } as any;
    ctrl.moveStage('d_1', dto);
    expect(mockService.moveStage).toHaveBeenCalledWith('d_1', dto);
  });

  it('archive delegates to service.archive', () => {
    ctrl.archive('d_1');
    expect(mockService.archive).toHaveBeenCalledWith('d_1');
  });
});
