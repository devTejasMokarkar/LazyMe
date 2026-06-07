import { logger } from "@/lib/logger";

type Entry<T> = { value: T; expiresAt: number };
const store = new Map<string, Entry<unknown>>();

export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    logger.info({ key, ageMs: now - (hit.expiresAt - ttlMs) }, "memo cache hit");
    return Promise.resolve(hit.value);
  }

  const inFlightKey = `${key}:pending`;
  const pending = store.get(inFlightKey) as Entry<Promise<T>> | undefined;
  if (pending && pending.expiresAt > now) {
    logger.info({ key }, "memo dedup in-flight");
    return pending.value;
  }

  const promise = fn().then((value) => {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    store.delete(inFlightKey);
    return value;
  }).catch((err) => {
    store.delete(inFlightKey);
    throw err;
  });
  store.set(inFlightKey, { value: promise, expiresAt: now + 30000 });
  return promise;
}

export function clearMemo(): void {
  store.clear();
}
