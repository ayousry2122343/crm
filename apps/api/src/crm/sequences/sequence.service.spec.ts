import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SequenceService } from './sequence.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    sequence: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sequenceEnrollment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    person: {
      findUnique: jest.fn(),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new SequenceService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

const steps = [
  { action: 'send_email', templateId: 't_1', delay: 1, delayUnit: 'days' },
  { action: 'send_email', templateId: 't_2', delay: 3, delayUnit: 'days' },
];

describe('SequenceService.create', () => {
  it('creates a sequence and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.sequence.create.mockResolvedValue({
      id: 's_1',
      workspaceId: 'ws_1',
      name: 'Welcome Drip',
      steps,
    });
    await tenant.run(ctx(), async () => {
      const result = await svc.create({ name: 'Welcome Drip', steps });
      expect(result.id).toBe('s_1');
      expect(prisma.sequence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ workspaceId: 'ws_1', name: 'Welcome Drip' }),
        }),
      );
      expect(audit.log).toHaveBeenCalled();
    });
  });
});

describe('SequenceService.list', () => {
  it('returns paginated sequences', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequence.findMany.mockResolvedValue([
      { id: 's_1', name: 'A' },
    ]);
    const result = await tenant.run(ctx(), async () => svc.list({}));
    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });
});

describe('SequenceService.get', () => {
  it('returns sequence by id', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({
      id: 's_1',
      workspaceId: 'ws_1',
      archivedAt: null,
      enrollments: [],
    });
    const result = await tenant.run(ctx(), async () => svc.get('s_1'));
    expect(result.id).toBe('s_1');
  });

  it('throws for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({
      id: 's_1',
      workspaceId: 'OTHER',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('s_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('SequenceService.update', () => {
  it('updates sequence fields', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({
      id: 's_1',
      workspaceId: 'ws_1',
    });
    prisma.sequence.update.mockResolvedValue({ id: 's_1', name: 'Updated' });
    await tenant.run(ctx(), async () => {
      const result = await svc.update('s_1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(audit.logUpdate).toHaveBeenCalled();
    });
  });
});

describe('SequenceService.enroll', () => {
  it('enrolls a person in a sequence', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({
      id: 's_1',
      workspaceId: 'ws_1',
      steps,
    });
    prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_1' });
    prisma.sequenceEnrollment.findUnique.mockResolvedValue(null);
    prisma.sequenceEnrollment.create.mockResolvedValue({
      id: 'e_1',
      sequenceId: 's_1',
      personId: 'p_1',
      status: 'ACTIVE',
      currentStep: 0,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.enroll('s_1', 'p_1');
      expect(result.status).toBe('ACTIVE');
      expect(prisma.sequenceEnrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sequenceId: 's_1',
            personId: 'p_1',
            currentStep: 0,
          }),
        }),
      );
    });
  });

  it('throws if already actively enrolled', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({
      id: 's_1',
      workspaceId: 'ws_1',
      steps,
    });
    prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_1' });
    prisma.sequenceEnrollment.findUnique.mockResolvedValue({
      id: 'e_1',
      status: 'ACTIVE',
    });

    await expect(
      tenant.run(ctx(), async () => svc.enroll('s_1', 'p_1')),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws for empty steps', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({
      id: 's_1',
      workspaceId: 'ws_1',
      steps: [],
    });

    await expect(
      tenant.run(ctx(), async () => svc.enroll('s_1', 'p_1')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('re-enrolls a previously exited person', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({
      id: 's_1',
      workspaceId: 'ws_1',
      steps,
    });
    prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_1' });
    prisma.sequenceEnrollment.findUnique.mockResolvedValue({
      id: 'e_1',
      status: 'EXITED',
    });
    prisma.sequenceEnrollment.update.mockResolvedValue({
      id: 'e_1',
      status: 'ACTIVE',
      currentStep: 0,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.enroll('s_1', 'p_1');
      expect(result.status).toBe('ACTIVE');
    });
  });
});

describe('SequenceService.pauseEnrollment', () => {
  it('pauses an ACTIVE enrollment', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequenceEnrollment.findUnique.mockResolvedValue({
      id: 'e_1',
      workspaceId: 'ws_1',
      status: 'ACTIVE',
    });
    prisma.sequenceEnrollment.update.mockResolvedValue({
      id: 'e_1',
      status: 'PAUSED',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.pauseEnrollment('e_1');
      expect(result.status).toBe('PAUSED');
    });
  });

  it('throws for non-ACTIVE enrollment', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequenceEnrollment.findUnique.mockResolvedValue({
      id: 'e_1',
      workspaceId: 'ws_1',
      status: 'COMPLETED',
    });

    await expect(
      tenant.run(ctx(), async () => svc.pauseEnrollment('e_1')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SequenceService.resumeEnrollment', () => {
  it('resumes a PAUSED enrollment', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequenceEnrollment.findUnique.mockResolvedValue({
      id: 'e_1',
      workspaceId: 'ws_1',
      status: 'PAUSED',
      currentStep: 1,
      sequenceId: 's_1',
    });
    prisma.sequence.findUnique.mockResolvedValue({
      id: 's_1',
      steps,
    });
    prisma.sequenceEnrollment.update.mockResolvedValue({
      id: 'e_1',
      status: 'ACTIVE',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.resumeEnrollment('e_1');
      expect(result.status).toBe('ACTIVE');
    });
  });
});

describe('SequenceService.exitEnrollment', () => {
  it('exits an enrollment', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequenceEnrollment.findUnique.mockResolvedValue({
      id: 'e_1',
      workspaceId: 'ws_1',
      status: 'ACTIVE',
    });
    prisma.sequenceEnrollment.update.mockResolvedValue({
      id: 'e_1',
      status: 'EXITED',
      exitReason: 'manual',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.exitEnrollment('e_1');
      expect(result.status).toBe('EXITED');
      expect(result.exitReason).toBe('manual');
    });
  });
});

describe('SequenceService.processStep', () => {
  it('advances to next step', async () => {
    const { svc, prisma } = buildSvc();
    prisma.sequenceEnrollment.findUnique.mockResolvedValue({
      id: 'e_1',
      status: 'ACTIVE',
      currentStep: 0,
      sequence: { steps },
      person: { id: 'p_1', email: 'a@test.com' },
    });
    prisma.sequenceEnrollment.update.mockResolvedValue({
      id: 'e_1',
      currentStep: 1,
    });

    await svc.processStep('e_1');
    const args = prisma.sequenceEnrollment.update.mock.calls[0][0];
    expect(args.data.currentStep).toBe(1);
    expect(args.data.nextRunAt).toBeInstanceOf(Date);
  });

  it('completes when last step is reached', async () => {
    const { svc, prisma } = buildSvc();
    prisma.sequenceEnrollment.findUnique.mockResolvedValue({
      id: 'e_1',
      status: 'ACTIVE',
      currentStep: 1,
      sequence: { steps },
      person: { id: 'p_1', email: 'a@test.com' },
    });
    prisma.sequenceEnrollment.update.mockResolvedValue({
      id: 'e_1',
      status: 'COMPLETED',
    });

    await svc.processStep('e_1');
    const args = prisma.sequenceEnrollment.update.mock.calls[0][0];
    expect(args.data.status).toBe('COMPLETED');
    expect(args.data.completedAt).toBeInstanceOf(Date);
  });
});

describe('SequenceService.archive', () => {
  it('archives a sequence', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({ id: 's_1', workspaceId: 'ws_1' });
    prisma.sequence.update.mockResolvedValue({ id: 's_1', archivedAt: new Date() });
    await tenant.run(ctx(), async () => {
      await svc.archive('s_1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'Sequence', action: 'DELETE' }),
      );
    });
  });

  it('throws for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sequence.findUnique.mockResolvedValue({ id: 's_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => svc.archive('s_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
