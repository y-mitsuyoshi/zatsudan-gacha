// Note: This is a simple in-memory rate limiter.
// In a serverless environment, each instance will have its own counter,
// so the rate limit is not enforced globally across all instances.
// For a production-ready solution, consider using a centralized store like Redis.

const RPM_LIMIT = 15; // Requests per minute
const RPD_LIMIT = 50; // Requests per day

const requestTimestamps: number[] = [];

// Clean up timestamps older than 24 hours to prevent memory leak
setInterval(() => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const firstValidIndex = requestTimestamps.findIndex(ts => ts > twentyFourHoursAgo);
    if (firstValidIndex > 0) {
        requestTimestamps.splice(0, firstValidIndex);
    }
}, 60 * 60 * 1000); // Run every hour

export function isRateLimited(): boolean {
    const now = Date.now();

    // --- Daily Limit Check ---
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const requestsInLast24Hours = requestTimestamps.filter(ts => ts > twentyFourHoursAgo).length;

    if (requestsInLast24Hours >= RPD_LIMIT) {
        console.warn(`Rate limit exceeded: RPD limit of ${RPD_LIMIT} reached.`);
        return true;
    }

    // --- Minute Limit Check ---
    const oneMinuteAgo = now - 60 * 1000;
    const requestsInLastMinute = requestTimestamps.filter(ts => ts > oneMinuteAgo).length;

    if (requestsInLastMinute >= RPM_LIMIT) {
        console.warn(`Rate limit exceeded: RPM limit of ${RPM_LIMIT} reached.`);
        return true;
    }

    // If not rate-limited, record the current request
    requestTimestamps.push(now);

    return false;
}
