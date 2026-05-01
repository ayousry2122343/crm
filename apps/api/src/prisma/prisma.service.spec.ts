import { PrismaService } from './prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';

describe('PrismaService', () => {
  it('extends PrismaClient and exposes lifecycle methods', () => {
    const svc = new PrismaService(new TenantContextService());
    expect(typeof svc.onModuleInit).toBe('function');
    expect(typeof svc.onModuleDestroy).toBe('function');
    expect(typeof svc.$connect).toBe('function');
    expect(typeof svc.$disconnect).toBe('function');
  });

  it('exposes a tenantClient extension', () => {
    const svc = new PrismaService(new TenantContextService());
    expect(svc.tenantClient).toBeDefined();
  });
});
