export async function getIdempotencyDb(supabase, userId, key) {
  if (!supabase || !userId || !key) return null;
  const { data, error } = await supabase
    .from('idempotency_keys')
    .select('response, expires_at')
    .eq('user_id', userId)
    .eq('key', key)
    .single();
  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // expired: remove and return null
    try { await supabase.from('idempotency_keys').delete().eq('user_id', userId).eq('key', key); } catch {}
    return null;
  }
  try {
    const { logInfo } = await import('./logging');
    logInfo('idempotency:get', 'cache-hit', { userId, key });
  } catch {}
  return data.response || null;
}

export async function setIdempotencyDb(supabase, userId, key, response, ttlMs = 5 * 60 * 1000) {
  if (!supabase || !userId || !key) return;
  const expiresAt = ttlMs > 0 ? new Date(Date.now() + ttlMs).toISOString() : null;
  const payload = {
    user_id: userId,
    key,
    response: response || null,
    expires_at: expiresAt,
  };
  try {
    await supabase.from('idempotency_keys').upsert(payload, { onConflict: ['user_id', 'key'] });
    try { const { logInfo } = await import('./logging'); logInfo('idempotency:set', 'cached', { userId, key }); } catch {}
  } catch (e) {
    try { const { logError } = await import('./logging'); logError('idempotency:set', 'db-fail', { userId, key, err: e?.message }); } catch {}
  }
}
