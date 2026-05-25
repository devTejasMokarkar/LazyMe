import { describe, it, expect } from 'vitest';
import { createLogger } from '../logger';

describe('logger', () => {
  it('createLogger returns a child logger with module name', () => {
    const childLogger = createLogger('test-module');
    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');
    expect(typeof childLogger.error).toBe('function');
    expect(typeof childLogger.warn).toBe('function');
  });

  it('child logger can log messages', () => {
    const childLogger = createLogger('test-module');
    expect(() => {
      childLogger.info({ msg: 'test message' });
      childLogger.error({ msg: 'error message' });
      childLogger.warn({ msg: 'warn message' });
    }).not.toThrow();
  });
});
