import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  workspaceId: string;
  userId?: string;
  profileIds: string[];
  permissionKeys: Set<string>;
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantContext>();

  run<T>(ctx: TenantContext, fn: () => T): T {
    return this.als.run(ctx, fn);
  }

  getStore(): TenantContext | undefined {
    return this.als.getStore();
  }
}
