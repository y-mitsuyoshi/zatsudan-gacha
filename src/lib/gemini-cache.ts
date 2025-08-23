interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export function get(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  const isExpired = (Date.now() - entry.timestamp) > CACHE_DURATION_MS;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function set(key: string, data: any): void {
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
  };
  cache.set(key, entry);
}
