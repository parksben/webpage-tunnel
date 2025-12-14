import { Request, serve } from '../src/index';

describe('Integration', () => {
  it('should export serve and Request', () => {
    expect(serve).toBeDefined();
    expect(Request).toBeDefined();
    expect(typeof serve).toBe('function');
    expect(typeof Request).toBe('function');
  });
});
