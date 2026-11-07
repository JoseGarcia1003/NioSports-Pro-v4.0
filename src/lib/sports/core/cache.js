// Read-through cache over any { get(key), set(key, value) } store (the
// provider_cache table in production, a Map in tests). Stale copies are served
// only when the provider fails, and are always labelled as stale.
export function memoryStore() {
  const m = new Map();
  return { async get(k) { return m.get(k) ?? null; }, async put(k, v) { m.set(k, v); } };
}

export async function cached(store, key, ttlMs, load, { now = () => Date.now() } = {}) {
  const hit = await store.get(key).catch(() => null);
  const age = hit ? now() - Date.parse(hit.fetchedAt) : Infinity;
  if (hit && age < ttlMs) return { value: hit.value, fetchedAt: hit.fetchedAt, source: 'cache', stale: false };
  try {
    const value = await load();
    const fetchedAt = new Date(now()).toISOString();
    await (store.put || store.set).call(store, key, { value, fetchedAt }).catch(() => {});
    return { value, fetchedAt, source: 'provider', stale: false };
  } catch (e) {
    if (hit) return { value: hit.value, fetchedAt: hit.fetchedAt, source: 'cache', stale: true, error: e?.code || 'provider_failed' };
    throw e;
  }
}
