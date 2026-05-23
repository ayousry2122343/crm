import { TwilioWhatsAppAdapter } from './twilio-whatsapp.adapter';

describe('TwilioWhatsAppAdapter', () => {
  let adapter: TwilioWhatsAppAdapter;

  beforeEach(() => {
    adapter = new TwilioWhatsAppAdapter();
  });

  describe('send', () => {
    it('prefixes phone numbers with whatsapp:', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM_wa_1' });
      const mockClient = { messages: { create: mockCreate } };
      jest.spyOn(adapter as any, 'getClient').mockReturnValue(mockClient);

      await adapter.send(
        { credentials: { accountSid: 'AC_test', authToken: 'tok' }, phoneNumber: '+15551234567' },
        '+201001234567',
        'Hello via WhatsApp',
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'whatsapp:+15551234567',
          to: 'whatsapp:+201001234567',
        }),
      );
    });

    it('sends template message with content SID when templateName is provided', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM_wa_tpl_1' });
      const mockClient = { messages: { create: mockCreate } };
      jest.spyOn(adapter as any, 'getClient').mockReturnValue(mockClient);

      await adapter.send(
        { credentials: { accountSid: 'AC_test', authToken: 'tok' }, phoneNumber: '+15551234567' },
        '+201001234567',
        '',
        { templateName: 'order_confirmation', templateVariables: { '1': 'ORD-123' } },
      );

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.contentSid).toBeDefined();
    });

    it('includes MediaUrl for rich media', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM_wa_media' });
      const mockClient = { messages: { create: mockCreate } };
      jest.spyOn(adapter as any, 'getClient').mockReturnValue(mockClient);

      await adapter.send(
        { credentials: { accountSid: 'AC_test', authToken: 'tok' }, phoneNumber: '+15551234567' },
        '+201001234567',
        'See image',
        { mediaUrl: 'https://example.com/photo.jpg' },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaUrl: ['https://example.com/photo.jpg'],
        }),
      );
    });
  });

  describe('parseWebhook', () => {
    it('parses WhatsApp inbound with whatsapp: prefix stripped', () => {
      const payload = {
        MessageSid: 'SM_wa_in',
        From: 'whatsapp:+201001234567',
        To: 'whatsapp:+15551234567',
        Body: 'Need help',
        NumMedia: '0',
      };

      const parsed = adapter.parseWebhook(payload, {});

      expect(parsed.from).toBe('+201001234567');
      expect(parsed.to).toBe('+15551234567');
      expect(parsed.content).toBe('Need help');
    });
  });

  describe('isWithinSessionWindow', () => {
    it('returns true when last inbound is within 24 hours', () => {
      const lastInbound = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      expect(adapter.isWithinSessionWindow(lastInbound)).toBe(true);
    });

    it('returns false when last inbound is older than 24 hours', () => {
      const lastInbound = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      expect(adapter.isWithinSessionWindow(lastInbound)).toBe(false);
    });

    it('returns false when no last inbound', () => {
      expect(adapter.isWithinSessionWindow(null)).toBe(false);
    });
  });

  describe('fillTemplate', () => {
    it('replaces numbered placeholders with variables', () => {
      const body = 'Hello {{1}}, your order {{2}} is ready';
      const result = adapter.fillTemplate(body, { '1': 'Ahmed', '2': 'ORD-456' });
      expect(result).toBe('Hello Ahmed, your order ORD-456 is ready');
    });

    it('leaves unreplaced placeholders intact', () => {
      const body = 'Hello {{1}}, code: {{2}}';
      const result = adapter.fillTemplate(body, { '1': 'Sara' });
      expect(result).toBe('Hello Sara, code: {{2}}');
    });
  });
});
