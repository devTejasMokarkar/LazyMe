import { logger } from "@/lib/logger";

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private queue: Array<() => void> = [];

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil(((1 - this.tokens) / this.refillPerSecond) * 1000);
    logger.warn({ waitMs, queueSize: this.queue.length }, "rate limit: queued");
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.tokens = Math.max(0, this.tokens - 1);
        resolve();
      }, waitMs);
      this.queue.push(() => {
        clearTimeout(timer);
        this.tokens = Math.max(0, this.tokens - 1);
        resolve();
      });
    });
  }
}

let bucket: TokenBucket | null = null;

function getBucket(): TokenBucket {
  if (!bucket) {
    const rps = parseFloat(process.env.AI_RATE_RPS || "0.5");
    const capacity = parseInt(process.env.AI_RATE_BURST || "3", 10);
    bucket = new TokenBucket(capacity, rps);
    logger.info({ rps, capacity }, "AI rate limiter initialized");
  }
  return bucket;
}

export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  await getBucket().acquire();
  return fn();
}
