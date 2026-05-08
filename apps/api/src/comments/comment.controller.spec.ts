import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { PermissionGuard } from '../core/rbac/permission.guard';

const mockService = {
  create: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
  pin: jest.fn(),
  archive: jest.fn(),
  follow: jest.fn(),
  unfollow: jest.fn(),
  listFollowers: jest.fn(),
};

describe('CommentController', () => {
  let ctrl: CommentController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [{ provide: CommentService, useValue: mockService }],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CommentController);
    jest.clearAllMocks();
  });

  it('create delegates to service.create', () => {
    const dto = { body: 'Hello', entityType: 'Deal', entityId: 'd_1' } as any;
    ctrl.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('list delegates to service.list with entity params', () => {
    const q = { limit: 20 } as any;
    ctrl.list('Deal', 'd_1', q);
    expect(mockService.list).toHaveBeenCalledWith('Deal', 'd_1', q);
  });

  it('update delegates to service.update', () => {
    const dto = { body: 'Updated' } as any;
    ctrl.update('c_1', dto);
    expect(mockService.update).toHaveBeenCalledWith('c_1', dto);
  });

  it('pin delegates to service.pin with true', () => {
    ctrl.pin('c_1');
    expect(mockService.pin).toHaveBeenCalledWith('c_1', true);
  });

  it('unpin delegates to service.pin with false', () => {
    ctrl.unpin('c_1');
    expect(mockService.pin).toHaveBeenCalledWith('c_1', false);
  });

  it('archive delegates to service.archive', () => {
    ctrl.archive('c_1');
    expect(mockService.archive).toHaveBeenCalledWith('c_1');
  });

  it('follow delegates to service.follow', () => {
    ctrl.follow('Deal', 'd_1');
    expect(mockService.follow).toHaveBeenCalledWith('Deal', 'd_1');
  });

  it('unfollow delegates to service.unfollow', () => {
    ctrl.unfollow('Deal', 'd_1');
    expect(mockService.unfollow).toHaveBeenCalledWith('Deal', 'd_1');
  });

  it('listFollowers delegates to service.listFollowers', () => {
    ctrl.listFollowers('Deal', 'd_1');
    expect(mockService.listFollowers).toHaveBeenCalledWith('Deal', 'd_1');
  });
});
