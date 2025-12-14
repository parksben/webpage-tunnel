import { Request } from '../src/Request';

describe('Request', () => {
  beforeEach(() => {
    // Clear document body
    document.body.innerHTML = '';
  });

  it('should create Request instance with methods', () => {
    const request = new Request({
      server: 'http://localhost:3000',
      methods: ['getUserInfo', 'getPlayList'],
      timeout: 5000,
    });

    expect(request).toBeDefined();
    expect(typeof (request as any).getUserInfo).toBe('function');
    expect(typeof (request as any).getPlayList).toBe('function');

    request.destroy();
  });

  it('should extract origin correctly', () => {
    const request = new Request({
      server: 'http://localhost:3000/page?param=value',
      methods: ['test'],
    });

    expect((request as any).targetOrigin).toBe('http://localhost:3000');

    request.destroy();
  });

  it('should cleanup resources on destroy', () => {
    const request = new Request({
      server: 'http://localhost:3000',
      methods: ['testMethod'],
    });

    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    request.destroy();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    expect((request as any).targetWindow).toBeNull();
    expect((request as any).connected).toBe(false);
  });
});
