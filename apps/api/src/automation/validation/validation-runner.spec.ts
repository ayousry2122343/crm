import { ValidationRunner } from './validation-runner';

function makePrisma() {
  return {
    validationRule: { findMany: jest.fn() },
  };
}

function buildRunner() {
  const prisma = makePrisma();
  const runner = new ValidationRunner(prisma as any);
  return { runner, prisma };
}

describe('ValidationRunner.run', () => {
  it('returns valid when no rules exist', async () => {
    const { runner, prisma } = buildRunner();
    prisma.validationRule.findMany.mockResolvedValue([]);
    const result = await runner.run('ws_1', 'Person', { email: 'test@test.com' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid when all rules pass', async () => {
    const { runner, prisma } = buildRunner();
    prisma.validationRule.findMany.mockResolvedValue([
      {
        id: 'vr_1',
        expression: { op: 'AND', items: [{ field: 'email', op: 'isNotNull', value: null }] },
        errorMessage: { en: 'Email required' },
      },
    ]);
    const result = await runner.run('ws_1', 'Person', { email: 'ahmed@test.com' });
    expect(result.valid).toBe(true);
  });

  it('returns errors when rule fails', async () => {
    const { runner, prisma } = buildRunner();
    prisma.validationRule.findMany.mockResolvedValue([
      {
        id: 'vr_1',
        expression: { op: 'AND', items: [{ field: 'email', op: 'isNotNull', value: null }] },
        errorMessage: { en: 'Email required', ar: 'البريد مطلوب' },
      },
    ]);
    const result = await runner.run('ws_1', 'Person', { email: null });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].ruleId).toBe('vr_1');
    expect(result.errors[0].message.ar).toBe('البريد مطلوب');
  });

  it('reports multiple failing rules', async () => {
    const { runner, prisma } = buildRunner();
    prisma.validationRule.findMany.mockResolvedValue([
      {
        id: 'vr_1',
        expression: { op: 'AND', items: [{ field: 'email', op: 'isNotNull', value: null }] },
        errorMessage: { en: 'Email required' },
      },
      {
        id: 'vr_2',
        expression: { op: 'AND', items: [{ field: 'fullName', op: 'isNotNull', value: null }] },
        errorMessage: { en: 'Name required' },
      },
    ]);
    const result = await runner.run('ws_1', 'Person', { email: null, fullName: null });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
