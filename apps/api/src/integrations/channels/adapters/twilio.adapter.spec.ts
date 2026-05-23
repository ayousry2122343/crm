import { TwilioAdapter } from './twilio.adapter';

describe('TwilioAdapter', () => {
  let adapter: TwilioAdapter;

  beforeEach(() => {
    adapter = new TwilioAdapter();
  });

  describe('send', () => {
    it('calls Twilio API and returns externalId', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM123abc' });
      const mockClient = { messages: { create: mockCreate } };
      jest.spyOn(adapter as any, 'getClient').mockReturnValue(mockClient);

      const result = await adapter.send(
        { credentials: { accountSid: 'AC_test', authToken: 'tok' }, phoneNumber: '+15551234567' },
        '+201001234567',
        'Hello from CRM',
      );

      expect(result.externalId).toBe('SM123abc');
      expect(mockCreate).toHaveBeenCalledWith({
        body: 'Hello from CRM',
        from: '+15551234567',
        to: '+201001234567',
      });
    });

    it('includes MediaUrl when mediaUrl option is provided', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM456def' });
      const mockClient = { messages: { create: mockCreate } };
      jest.spyOn(adapter as any, 'getClient').mockReturnValue(mockClient);

      await adapter.send(
        { credentials: { accountSid: 'AC_test', authToken: 'tok' }, phoneNumber: '+15551234567' },
        '+201001234567',
        'See attachment',
        { mediaUrl: 'https://example.com/image.png' },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ mediaUrl: ['https://example.com/image.png'] }),
      );
    });
  });

  describe('parseWebhook', () => {
    it('parses Twilio inbound SMS webhook payload', () => {
      const payload = {
        MessageSid: 'SM_incoming_1',
        From: '+201001234567',
        To: '+15551234567',
        Body: 'Help needed',
        NumMedia: '0',
      };

      const parsed = adapter.parseWebhook(payload, {});

      expect(parsed.externalId).toBe('SM_incoming_1');
      expect(parsed.from).toBe('+201001234567');
      expect(parsed.to).toBe('+15551234567');
      expect(parsed.content).toBe('Help needed');
      expect(parsed.contentType).toBe('TEXT');
    });

    it('parses media messages with contentType IMAGE', () => {
      const payload = {
        MessageSid: 'SM_media_1',
        From: '+201001234567',
        To: '+15551234567',
        Body: '',
        NumMedia: '1',
        MediaUrl0: 'https://api.twilio.com/media/img.jpg',
        MediaContentType0: 'image/jpeg',
      };

      const parsed = adapter.parseWebhook(payload, {});

      expect(parsed.contentType).toBe('IMAGE');
      expect(parsed.mediaUrl).toBe('https://api.twilio.com/media/img.jpg');
    });
  });

  describe('validateWebhook', () => {
    it('returns true for valid Twilio signature', () => {
      jest.spyOn(adapter as any, 'computeSignature').mockReturnValue('validSig');
      const result = adapter.validateWebhook(
        {},
        { 'x-twilio-signature': 'validSig' },
        'whsec_test',
      );
      expect(result).toBe(true);
    });

    it('returns false for invalid signature', () => {
      jest.spyOn(adapter as any, 'computeSignature').mockReturnValue('expectedSig');
      const result = adapter.validateWebhook(
        {},
        { 'x-twilio-signature': 'wrongSig' },
        'whsec_test',
      );
      expect(result).toBe(false);
    });
  });

  describe('getMessageStatus', () => {
    it('fetches status from Twilio API', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ status: 'delivered' });
      const mockClient = { messages: jest.fn().mockReturnValue({ fetch: mockFetch }) };
      jest.spyOn(adapter as any, 'getClient').mockReturnValue(mockClient);

      const status = await adapter.getMessageStatus(
        { credentials: { accountSid: 'AC_test', authToken: 'tok' } },
        'SM123abc',
      );

      expect(status).toBe('DELIVERED');
    });
  });
});
