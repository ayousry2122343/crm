import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PermissionGuard } from '../core/rbac/permission.guard';

const mockService = {
  list: jest.fn(),
  unreadCount: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  getPreferences: jest.fn(),
  upsertPreference: jest.fn(),
};

describe('NotificationController', () => {
  let ctrl: NotificationController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: mockService }],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(NotificationController);
    jest.clearAllMocks();
  });

  it('list delegates to service.list', () => {
    const q = { limit: 20 } as any;
    ctrl.list(q);
    expect(mockService.list).toHaveBeenCalledWith(q);
  });

  it('unreadCount wraps count in object', async () => {
    mockService.unreadCount.mockResolvedValue(5);
    const result = await ctrl.unreadCount();
    expect(result).toEqual({ count: 5 });
  });

  it('markRead delegates to service.markRead', () => {
    ctrl.markRead('n_1');
    expect(mockService.markRead).toHaveBeenCalledWith('n_1');
  });

  it('markAllRead delegates to service.markAllRead', () => {
    ctrl.markAllRead();
    expect(mockService.markAllRead).toHaveBeenCalled();
  });

  it('getPreferences delegates to service.getPreferences', () => {
    ctrl.getPreferences();
    expect(mockService.getPreferences).toHaveBeenCalled();
  });

  it('upsertPreference delegates to service.upsertPreference', () => {
    const dto = { channel: 'EMAIL', eventType: 'DEAL_ASSIGNED', enabled: true } as any;
    ctrl.upsertPreference(dto);
    expect(mockService.upsertPreference).toHaveBeenCalledWith(dto);
  });
});
