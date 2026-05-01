import { EmailService } from './email.service';

// Mock nodemailer transport
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(async (opts: any) => ({ messageId: 'mock-id-1', envelope: opts })),
    verify: jest.fn(async () => true),
  })),
}));

describe('EmailService', () => {
  beforeEach(() => {
    process.env.SMTP_HOST = 'localhost';
    process.env.SMTP_PORT = '1025';
    process.env.SMTP_FROM = 'CRM <noreply@crm.local>';
  });

  it('sends an email with rendered subject + body', async () => {
    const svc = new EmailService();
    const result = await svc.send({
      to: 'user@example.com',
      subject: 'Hello {{name}}',
      html: '<p>Hi {{name}}</p>',
      text: 'Hi {{name}}',
      vars: { name: 'Ahmed' },
    });
    expect(result.messageId).toBe('mock-id-1');
  });

  it('renders {{var}} merge tags', () => {
    const svc = new EmailService();
    expect(svc.render('Hi {{name}}', { name: 'Ahmed' })).toBe('Hi Ahmed');
    expect(svc.render('No vars', {})).toBe('No vars');
    expect(svc.render('Multi {{a}} and {{b}}', { a: 'x', b: 'y' })).toBe('Multi x and y');
    expect(svc.render('Missing {{x}}', {})).toBe('Missing ');
  });
});
