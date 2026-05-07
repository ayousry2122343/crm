import { BadRequestException } from '@nestjs/common';
import { FormSubmissionService } from './form-submission.service';

function makePrisma() {
  return {
    person: { findFirst: jest.fn(), create: jest.fn() },
    formSubmission: { create: jest.fn() },
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const svc = new FormSubmissionService(prisma as any);
  return { svc, prisma };
}

const fields = [
  { key: 'email', type: 'email', required: true },
  { key: 'name', type: 'text', required: true },
];
const mappings = { email: 'email', name: 'fullName' };

describe('FormSubmissionService.submit', () => {
  it('silently returns ok when honeypot is filled', async () => {
    const { svc } = buildSvc();
    const result = await svc.submit(
      'ws_1', 'f_1', fields, mappings,
      { data: { email: 'bot@spam.com', name: 'Bot' }, _honeypot: 'gotcha' },
      '1.2.3.4', 'Mozilla', 5, true,
    );
    expect(result).toEqual({ ok: true });
  });

  it('creates person and submission for valid data', async () => {
    const { svc, prisma } = buildSvc();
    prisma.person.findFirst.mockResolvedValue(null);
    prisma.person.create.mockResolvedValue({ id: 'p_1' });
    prisma.formSubmission.create.mockResolvedValue({ id: 'sub_1' });

    const result = await svc.submit(
      'ws_1', 'f_1', fields, mappings,
      { data: { email: 'ahmed@test.com', name: 'Ahmed' }, _honeypot: '' },
      '1.2.3.4', 'Mozilla', 5, true,
    );
    expect(result.id).toBe('sub_1');
    expect(prisma.person.create).toHaveBeenCalled();
    const personData = prisma.person.create.mock.calls[0][0].data;
    expect(personData.email).toBe('ahmed@test.com');
    expect(personData.fullName).toBe('Ahmed');
    expect(personData.source).toBe('FORM');
  });

  it('links to existing person by email', async () => {
    const { svc, prisma } = buildSvc();
    prisma.person.findFirst.mockResolvedValue({ id: 'p_existing' });
    prisma.formSubmission.create.mockResolvedValue({ id: 'sub_2' });

    await svc.submit(
      'ws_1', 'f_1', fields, mappings,
      { data: { email: 'existing@test.com', name: 'Existing' }, _honeypot: '' },
      '2.3.4.5', 'Mozilla', 5, true,
    );
    expect(prisma.person.create).not.toHaveBeenCalled();
    const subData = prisma.formSubmission.create.mock.calls[0][0].data;
    expect(subData.personId).toBe('p_existing');
  });

  it('throws on missing required field', async () => {
    const { svc } = buildSvc();
    await expect(
      svc.submit(
        'ws_1', 'f_1', fields, mappings,
        { data: { email: 'test@test.com', name: '' }, _honeypot: '' },
        '3.4.5.6', 'Mozilla', 5, true,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('enforces rate limit', async () => {
    const { svc, prisma } = buildSvc();
    prisma.person.findFirst.mockResolvedValue(null);
    prisma.person.create.mockResolvedValue({ id: 'p_new' });
    prisma.formSubmission.create.mockResolvedValue({ id: 'sub_x' });

    const ip = '10.0.0.1';
    for (let i = 0; i < 2; i++) {
      await svc.submit(
        'ws_1', 'f_1', fields, mappings,
        { data: { email: `u${i}@test.com`, name: `U${i}` }, _honeypot: '' },
        ip, 'Mozilla', 2, true,
      );
    }

    await expect(
      svc.submit(
        'ws_1', 'f_1', fields, mappings,
        { data: { email: 'extra@test.com', name: 'Extra' }, _honeypot: '' },
        ip, 'Mozilla', 2, true,
      ),
    ).rejects.toThrow('Rate limit exceeded');
  });
});
