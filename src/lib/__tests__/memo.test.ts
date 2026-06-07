import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { memo, clearMemo } from '../memo';

describe('memo', () => {
  beforeEach(() => {
    clearMemo();
    vi.useRealTimers();
  });

  afterEach(() => {
    clearMemo();
  });

  it('calls fn on first call and caches the result', async () => {
    const fn = vi.fn().mockResolvedValue('result-1');
    const a = await memo('k1', 1000, fn);
    const b = await memo('k1', 1000, fn);
    expect(a).toBe('result-1');
    expect(b).toBe('result-1');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('expires cache after TTL', async () => {
    vi.useFakeTimers();
    const fn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');
    const a = await memo('k2', 1000, fn);
    expect(a).toBe('first');
    vi.advanceTimersByTime(1500);
    const b = await memo('k2', 1000, fn);
    expect(b).toBe('second');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent in-flight calls', async () => {
    let resolveFn: (v: string) => void = () => {};
    const fn = vi.fn().mockImplementation(
      () => new Promise<string>((r) => { resolveFn = r; })
    );
    const p1 = memo('k3', 1000, fn);
    const p2 = memo('k3', 1000, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    resolveFn('shared');
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe('shared');
    expect(b).toBe('shared');
  });

  it('different keys do not share cache', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce('a')
      .mockResolvedValueOnce('b');
    const x = await memo('ka', 1000, fn);
    const y = await memo('kb', 1000, fn);
    expect(x).toBe('a');
    expect(y).toBe('b');
  });

  it('re-fetches after a failed call (does not cache error)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok');
    await expect(memo('k4', 1000, fn)).rejects.toThrow('boom');
    const result = await memo('k4', 1000, fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
