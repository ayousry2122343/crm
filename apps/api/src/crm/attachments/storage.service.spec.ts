import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((args) => ({ ...args, _cmd: 'Put' })),
  GetObjectCommand: jest.fn().mockImplementation((args) => ({ ...args, _cmd: 'Get' })),
  DeleteObjectCommand: jest.fn().mockImplementation((args) => ({ ...args, _cmd: 'Delete' })),
  HeadBucketCommand: jest.fn().mockImplementation((args) => ({ ...args, _cmd: 'Head' })),
  CreateBucketCommand: jest.fn().mockImplementation((args) => ({ ...args, _cmd: 'Create' })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com/key'),
}));

function buildService() {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      const map: Record<string, string> = {
        MINIO_BUCKET: 'test-bucket',
        MINIO_ENDPOINT: 'http://localhost:9000',
        MINIO_ACCESS_KEY: 'test',
        MINIO_SECRET_KEY: 'test',
      };
      return map[key] ?? fallback;
    }),
  } as unknown as ConfigService;
  const svc = new StorageService(config);
  return svc;
}

describe('StorageService', () => {
  let svc: StorageService;

  beforeEach(() => {
    svc = buildService();
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('checks if bucket exists and creates it when missing', async () => {
      mockSend.mockRejectedValueOnce(new Error('NotFound')).mockResolvedValueOnce({});
      await svc.onModuleInit();
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[0][0]).toMatchObject({ _cmd: 'Head' });
      expect(mockSend.mock.calls[1][0]).toMatchObject({ _cmd: 'Create' });
    });

    it('skips creation when bucket already exists', async () => {
      mockSend.mockResolvedValueOnce({});
      await svc.onModuleInit();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0]).toMatchObject({ _cmd: 'Head' });
    });
  });

  describe('upload', () => {
    it('sends PutObjectCommand with correct params', async () => {
      mockSend.mockResolvedValue({});
      const buf = Buffer.from('file-content');
      await svc.upload('uploads/file.pdf', buf, 'application/pdf');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _cmd: 'Put',
          Bucket: 'test-bucket',
          Key: 'uploads/file.pdf',
          Body: buf,
          ContentType: 'application/pdf',
        }),
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('returns a signed URL', async () => {
      const { getSignedUrl: mockGetSigned } = require('@aws-sdk/s3-request-presigner');
      const url = await svc.getPresignedUrl('uploads/file.pdf');
      expect(url).toBe('https://signed-url.example.com/key');
      expect(mockGetSigned).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ _cmd: 'Get', Bucket: 'test-bucket', Key: 'uploads/file.pdf' }),
        { expiresIn: 3600 },
      );
    });

    it('accepts custom expiresIn', async () => {
      const { getSignedUrl: mockGetSigned } = require('@aws-sdk/s3-request-presigner');
      await svc.getPresignedUrl('key', 600);
      expect(mockGetSigned).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 600 },
      );
    });
  });

  describe('getStream', () => {
    it('returns Body from GetObjectCommand response', async () => {
      const fakeStream = { pipe: jest.fn() };
      mockSend.mockResolvedValue({ Body: fakeStream });
      const result = await svc.getStream('uploads/file.pdf');
      expect(result).toBe(fakeStream);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ _cmd: 'Get', Key: 'uploads/file.pdf' }),
      );
    });
  });

  describe('delete', () => {
    it('sends DeleteObjectCommand with correct params', async () => {
      mockSend.mockResolvedValue({});
      await svc.delete('uploads/file.pdf');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ _cmd: 'Delete', Bucket: 'test-bucket', Key: 'uploads/file.pdf' }),
      );
    });
  });

  describe('error handling', () => {
    it('propagates S3 errors on upload', async () => {
      mockSend.mockRejectedValue(new Error('AccessDenied'));
      await expect(svc.upload('k', Buffer.from(''), 'text/plain')).rejects.toThrow('AccessDenied');
    });

    it('propagates S3 errors on delete', async () => {
      mockSend.mockRejectedValue(new Error('NoSuchKey'));
      await expect(svc.delete('missing')).rejects.toThrow('NoSuchKey');
    });
  });
});
