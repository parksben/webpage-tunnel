import { serve } from '../src/serve';
import { MessageType } from '../src/types';

// Store the original addEventListener
const originalAddEventListener = window.addEventListener;
const listeners: Array<{ type: string; listener: EventListener }> = [];

describe('serve', () => {
  beforeEach(() => {
    // Clear listeners
    listeners.length = 0;
    
    // Mock addEventListener to track listeners
    window.addEventListener = jest.fn((type: string, listener: EventListener) => {
      listeners.push({ type, listener: listener as EventListener });
      originalAddEventListener.call(window, type, listener);
    }) as any;
  });

  afterEach(() => {
    // Remove all listeners
    listeners.forEach(({ type, listener }) => {
      window.removeEventListener(type, listener);
    });
    
    // Restore original addEventListener
    window.addEventListener = originalAddEventListener;
  });

  it('should register message event listener', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    serve({
      testMethod: () => 'test',
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should handle handshake message', async () => {
    serve({
      testMethod: () => 'test',
    });

    const mockSource = {
      postMessage: jest.fn(),
    };

    const event = new MessageEvent('message', {
      data: {
        type: MessageType.HANDSHAKE,
        id: 'test-id',
      },
      origin: 'http://localhost',
      source: mockSource as any,
    });

    window.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSource.postMessage).toHaveBeenCalledWith(
      {
        type: MessageType.HANDSHAKE_ACK,
        id: 'test-id',
      },
      'http://localhost'
    );
  });

  it('should handle API request successfully', async () => {
    serve({
      getUserInfo: (params: { userId: string }) => ({
        status: 1,
        message: 'Success',
        data: { id: params.userId, name: 'John' },
      }),
    });

    const mockSource = {
      postMessage: jest.fn(),
    };

    const event = new MessageEvent('message', {
      data: {
        type: MessageType.REQUEST,
        id: 'request-id',
        method: 'getUserInfo',
        params: { userId: '123' },
      },
      origin: 'http://localhost',
      source: mockSource as any,
    });

    window.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSource.postMessage).toHaveBeenCalledWith(
      {
        type: MessageType.RESPONSE,
        id: 'request-id',
        result: {
          status: 1,
          message: 'Success',
          data: { id: '123', name: 'John' },
        },
      },
      'http://localhost'
    );
  });

  it('should handle async API request', async () => {
    serve({
      getDataAsync: async (params: { id: string }) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { id: params.id, data: 'async-data' };
      },
    });

    const mockSource = {
      postMessage: jest.fn(),
    };

    const event = new MessageEvent('message', {
      data: {
        type: MessageType.REQUEST,
        id: 'async-request-id',
        method: 'getDataAsync',
        params: { id: '456' },
      },
      origin: 'http://localhost',
      source: mockSource as any,
    });

    window.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockSource.postMessage).toHaveBeenCalledWith(
      {
        type: MessageType.RESPONSE,
        id: 'async-request-id',
        result: { id: '456', data: 'async-data' },
      },
      'http://localhost'
    );
  });

  it('should handle method not found error', async () => {
    serve({
      existingMethod: () => 'test',
    });

    const mockSource = {
      postMessage: jest.fn(),
    };

    const event = new MessageEvent('message', {
      data: {
        type: MessageType.REQUEST,
        id: 'error-request-id',
        method: 'nonExistentMethod',
        params: {},
      },
      origin: 'http://localhost',
      source: mockSource as any,
    });

    window.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSource.postMessage).toHaveBeenCalledWith(
      {
        type: MessageType.RESPONSE,
        id: 'error-request-id',
        error: 'Method nonExistentMethod not found',
      },
      'http://localhost'
    );
  });

  it('should handle API method error', async () => {
    serve({
      errorMethod: () => {
        throw new Error('Test error');
      },
    });

    const mockSource = {
      postMessage: jest.fn(),
    };

    const event = new MessageEvent('message', {
      data: {
        type: MessageType.REQUEST,
        id: 'error-request-id',
        method: 'errorMethod',
        params: {},
      },
      origin: 'http://localhost',
      source: mockSource as any,
    });

    window.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSource.postMessage).toHaveBeenCalledWith(
      {
        type: MessageType.RESPONSE,
        id: 'error-request-id',
        error: 'Test error',
      },
      'http://localhost'
    );
  });
});
