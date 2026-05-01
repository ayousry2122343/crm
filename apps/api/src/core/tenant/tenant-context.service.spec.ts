import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  it('returns undefined outside of run()', () => {
    const svc = new TenantContextService();
    expect(svc.getStore()).toBeUndefined();
  });

  it('stores and retrieves a workspaceId via run/getStore', () => {
    const svc = new TenantContextService();
    svc.run(
      { workspaceId: 'ws_1', userId: 'u_1', profileIds: [], permissionKeys: new Set() },
      () => {
        const store = svc.getStore();
        expect(store?.workspaceId).toBe('ws_1');
        expect(store?.userId).toBe('u_1');
        expect(store?.profileIds).toEqual([]);
        expect(store?.permissionKeys.size).toBe(0);
      }
    );
  });

  it('isolates contexts across nested run() calls', () => {
    const svc = new TenantContextService();
    svc.run(
      { workspaceId: 'ws_outer', profileIds: [], permissionKeys: new Set() },
      () => {
        svc.run(
          { workspaceId: 'ws_inner', profileIds: [], permissionKeys: new Set() },
          () => {
            expect(svc.getStore()?.workspaceId).toBe('ws_inner');
          }
        );
        expect(svc.getStore()?.workspaceId).toBe('ws_outer');
      }
    );
  });
});
