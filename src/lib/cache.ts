interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class SimpleCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();

  set(key: string, data: T, ttl: number = 300000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

import { ResumeData } from "@/features/ai/prompts/resume.prompts";

export const resumeCache = new SimpleCache<ResumeData>();
export const coverLetterCache = new SimpleCache<string>();

// Cleanup expired cache items every 10 minutes
setInterval(() => {
  resumeCache.cleanup();
  coverLetterCache.cleanup();
}, 600000);
