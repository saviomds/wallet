const store = new Map();

function now() {
  return Date.now();
}

// key -> { value, expiresAt }
export function getIdempotency(key) {
  if (!key) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setIdempotency(key, value, ttlMs = 5 * 60 * 1000) {
  if (!key) return;
  const expiresAt = ttlMs > 0 ? now() + ttlMs : undefined;
  store.set(key, { value, expiresAt });
}

export function _clearIdempotency() {
  store.clear();
}
