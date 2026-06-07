import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { withRateLimit } from '../rate-limit';

describe('withRateLimit', () => {
  beforeEach(() => {
    vi.useRealTimers();
    delete process.env.AI_RATE_RPS;
    delete process.env.AI_RATE_BURST;
  });

  afterEach(() => {
    delete process.env.AI_RATE_RPS;
    delete process.env.AI_RATE_BURST;
  });

  it('passes through when capacity is available', async () => {
    process.env.AI_RATE_BURST = '5';
    process.env.AI_RATE_RPS = '100';
    const fn = vi.fn().mockResolvedValue('ok');
    const r = await withRateLimit(fn);
    expect(r).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('queues when bucket is empty and resolves after refill', async () => {
    vi.useFakeTimers();
    process.env.AI_RATE_BURST = '1';
    process.env.AI_RATE_RPS = '1';

    const fn1 = vi.fn().mockResolvedValue('first');
    const p1 = withRateLimit(fn1);

    await vi.advanceTimersByTimeAsync(0);
    expect(fn1).toHaveBeenCalledTimes(1);

    const fn2 = vi.fn().mockResolvedValue('second');
    const p2 = withRateLimit(fn2);

    expect(fn2).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1100);
    await p1;
    await p2;
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('uses default rate of 0.5 RPS when env not set', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const r = await withRateLimit(fn);
    expect(r).toBe(42);
  });

  it('multiple parallel calls share the bucket', async () => {
    process.env.AI_RATE_BURST = '3';
    process.env.AI_RATE_RPS = '100';
    const fn = vi.fn().mockImplementation(async (i: number) => `v${i}`);
    const results = await Promise.all([
      withRateLimit(() => fn(1)),
      withRateLimit(() => fn(2)),
      withRateLimit(() => fn(3)),
    ]);
    expect(results).toEqual(['v1', 'v2', 'v3']);
  });
});
