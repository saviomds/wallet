const buckets = new Map();

function now() {
  return Date.now();
}

export function isRateLimited(key, limit = 10, windowMs = 60_000) {
  // key: IP or user identifier
  const ts = now();
  const entry = buckets.get(key) || [];
  // keep only timestamps within window
  const windowStart = ts - windowMs;
  const recent = entry.filter(t => t >= windowStart);
  recent.push(ts);
  buckets.set(key, recent);
  const allowed = recent.length <= limit;
  const retryAfter = allowed ? 0 : Math.ceil((recent[0] + windowMs - ts) / 1000);
  return { allowed, retryAfter };
}

// For testing and cleanup
export function _resetBuckets() {
  buckets.clear();
}
