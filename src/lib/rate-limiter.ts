// Development/fallback limiter. Production uses the Firebase Functions limiter.
// This is still keyed per client and only counts requests that actually reach
// the upstream AI provider.

const RPM_LIMIT = 15;
const RPD_LIMIT = 50;
const MAX_TRACKED_CLIENTS = 5_000;

const requestTimestampsByClient = new Map<string, number[]>();

function pruneAndGet(clientKey: string, now: number): number[] {
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const timestamps = (requestTimestampsByClient.get(clientKey) ?? [])
    .filter((timestamp) => timestamp > twentyFourHoursAgo);

  // Refresh insertion order so the oldest active client is evicted first.
  requestTimestampsByClient.delete(clientKey);
  requestTimestampsByClient.set(clientKey, timestamps);
  return timestamps;
}

function evictOldestClientIfNeeded(): void {
  if (requestTimestampsByClient.size <= MAX_TRACKED_CLIENTS) {
    return;
  }
  const oldestKey = requestTimestampsByClient.keys().next().value;
  if (oldestKey !== undefined) {
    requestTimestampsByClient.delete(oldestKey);
  }
}

export function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const timestamps = pruneAndGet(clientKey, now);
  const oneMinuteAgo = now - 60 * 1000;
  const requestsInLastMinute = timestamps.filter((timestamp) => timestamp > oneMinuteAgo).length;

  if (timestamps.length >= RPD_LIMIT || requestsInLastMinute >= RPM_LIMIT) {
    requestTimestampsByClient.set(clientKey, timestamps);
    return true;
  }

  timestamps.push(now);
  requestTimestampsByClient.set(clientKey, timestamps);
  evictOldestClientIfNeeded();
  return false;
}

export function resetRateLimiter(): void {
  requestTimestampsByClient.clear();
}
