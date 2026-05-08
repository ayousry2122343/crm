import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

const mockOn = vi.fn();
const mockDisconnect = vi.fn();
const mockSocket = {
  connected: false,
  on: mockOn,
  disconnect: mockDisconnect,
};

const mockIo = vi.fn(() => mockSocket);

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

const mockGetToken = vi.fn(() => 'test-token');
vi.mock('@/api/client', () => ({
  getAccessToken: (...args: unknown[]) => mockGetToken(...args),
}));

const mockAddFromSocket = vi.fn();
vi.mock('@/pinia/notification.store', () => ({
  useNotificationStore: () => ({
    addFromSocket: mockAddFromSocket,
  }),
}));

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  it('exports connect, disconnect, and connected', async () => {
    const { useSocket } = await import('./useSocket');
    const result = useSocket();
    expect(typeof result.connect).toBe('function');
    expect(typeof result.disconnect).toBe('function');
    expect(result.connected).toBeDefined();
  });

  it('connect creates socket with auth token', async () => {
    const { useSocket } = await import('./useSocket');
    const { connect } = useSocket();
    connect();
    expect(mockIo).toHaveBeenCalledWith('/notifications', expect.objectContaining({
      auth: { token: 'test-token' },
      transports: ['websocket'],
    }));
  });

  it('connect skips when no token', async () => {
    mockGetToken.mockReturnValueOnce(null as any);
    const { useSocket } = await import('./useSocket');
    const { connect } = useSocket();
    connect();
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('connect registers event listeners', async () => {
    const { useSocket } = await import('./useSocket');
    const { connect } = useSocket();
    connect();
    const events = mockOn.mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('connect');
    expect(events).toContain('disconnect');
    expect(events).toContain('notification');
  });

  it('notification event calls addFromSocket', async () => {
    const { useSocket } = await import('./useSocket');
    const { connect } = useSocket();
    connect();
    const notifHandler = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'notification')?.[1] as (n: unknown) => void;
    expect(notifHandler).toBeDefined();
    const fakeNotif = { id: 'n1', message: 'hello' };
    notifHandler(fakeNotif);
    expect(mockAddFromSocket).toHaveBeenCalledWith(fakeNotif);
  });

  it('disconnect closes socket', async () => {
    const { useSocket } = await import('./useSocket');
    const { connect, disconnect } = useSocket();
    connect();
    disconnect();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('disconnect is safe when no socket exists', async () => {
    const { useSocket } = await import('./useSocket');
    const { disconnect } = useSocket();
    expect(() => disconnect()).not.toThrow();
  });
});
