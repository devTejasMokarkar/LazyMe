import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleCache } from '../cache';

describe('SimpleCache', () => {
  let cache: SimpleCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new SimpleCache<string>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns null for missing key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('returns null for expired item', () => {
    cache.set('key1', 'value1', 100);
    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(101);
    expect(cache.get('key1')).toBeNull();
  });

  it('uses default TTL of 5 minutes', () => {
    cache.set('key1', 'value1');
    vi.advanceTimersByTime(300000 - 1);
    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(2);
    expect(cache.get('key1')).toBeNull();
  });

  it('clears all items', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();

    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  it('removes only expired items on cleanup', () => {
    cache.set('fresh', 'value', 1000);
    cache.set('stale', 'old', -1);

    cache.cleanup();

    expect(cache.get('fresh')).toBe('value');
    expect(cache.get('stale')).toBeNull();
  });

  it('overwrites existing key', () => {
    cache.set('key1', 'first');
    cache.set('key1', 'second');
    expect(cache.get('key1')).toBe('second');
  });

  it('handles different value types', () => {
    const numCache = new SimpleCache<number>();
    numCache.set('num', 42);
    expect(numCache.get('num')).toBe(42);

    const objCache = new SimpleCache<{ a: number }>();
    objCache.set('obj', { a: 1 });
    expect(objCache.get('obj')).toEqual({ a: 1 });
  });
});
