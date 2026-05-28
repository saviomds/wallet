const buckets = new Map();

function now() {
  return Date.now();
}

// Async rate limiter. When Supabase service key is configured, persist counters
// to the `rate_limits` table. Callers should `await isRateLimited(...)`.
export async function isRateLimited(key, limit = 10, windowMs = 60_000) {
  // If Supabase service key is available, use DB-backed counters
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      // Use atomic RPC to increment and return the new count/window_start
      const rpcName = 'rate_limit_increment';
      const { data: rpcData, error: rpcErr } = await supabase.rpc(rpcName, { p_key: key, p_window_ms: windowMs });
      if (!rpcErr && rpcData && rpcData.length) {
        const row = rpcData[0];
        const ws = new Date(row.window_start).getTime();
        const newCount = Number(row.count || 0);
        const allowed = newCount <= limit;
        const retryAfter = allowed ? 0 : Math.ceil((ws + windowMs - Date.now()) / 1000);
        try { const { logInfo } = await import('./logging'); if (!allowed) logInfo('rateLimiter', 'blocked', { key, newCount, limit }); } catch {}
        return { allowed, retryAfter };
      }
      // fallthrough to in-memory if rpc failed
    } catch (e) {
      try { const { logError } = await import('./logging'); logError('rateLimiter', 'rpc-fail', { key, err: e?.message }); } catch {}
    }
  }

  // In-memory fallback (single-process)
  const ts = now();
  const entry = buckets.get(key) || [];
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
