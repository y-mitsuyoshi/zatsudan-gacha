interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 1日（本番環境と統一）

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

  // 開発環境用：メモリ使用量制限
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
}
