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
    await supabase.from('idempotency_keys').delete().eq('user_id', userId).eq('key', key);
    return null;
  }
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
  await supabase.from('idempotency_keys').upsert(payload, { onConflict: ['user_id', 'key'] });
}
