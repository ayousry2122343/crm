import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('extends PrismaClient and exposes lifecycle methods', () => {
    const svc = new PrismaService();
    expect(typeof svc.onModuleInit).toBe('function');
    expect(typeof svc.onModuleDestroy).toBe('function');
    expect(typeof svc.$connect).toBe('function');
    expect(typeof svc.$disconnect).toBe('function');
  });
});
