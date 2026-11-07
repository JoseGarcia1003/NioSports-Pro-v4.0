// Resilient HTTP for provider adapters: timeout, bounded retries with jittered
// exponential backoff (only on network errors, 429 and 5xx), a per-provider
// token bucket, and a request log hook. No secrets are ever logged.

export class ProviderError extends Error {
  constructor(code, message, { status = null, retryable = false } = {}) { super(message); this.code = code; this.status = status; this.retryable = retryable; }
}

/** Token bucket: `capacity` requests per `perMs`. Shared per provider id. */
export function rateLimiter({ capacity, perMs, now = () => Date.now() }) {
  let tokens = capacity, last = now();
  return {
    take() {
      const t = now();
      tokens = Math.min(capacity, tokens + ((t - last) / perMs) * capacity); last = t;
      if (tokens < 1) return false;
      tokens -= 1; return true;
    },
    get remaining() { return Math.floor(tokens); }
  };
}

const redact = url => url.replace(/([?&](api[_-]?key|apikey|key|token)=)[^&]+/gi, '$1***');

/**
 * @param {string} url
 * @param {{ provider: string, headers?: object, timeoutMs?: number, retries?: number, limiter?: any,
 *   fetchImpl?: typeof fetch, sleep?: (ms:number)=>Promise<void>, log?: (entry:object)=>void, parse?: 'json'|'bytes' }} opts
 */
export async function providerRequest(url, opts) {
  const { provider, headers = {}, timeoutMs = 10000, retries = 2, limiter = null, fetchImpl = fetch,
    sleep = ms => new Promise(r => setTimeout(r, ms)), log = () => {}, parse = 'json' } = opts;
  if (limiter && !limiter.take()) { log({ provider, url: redact(url), outcome: 'rate_limited_locally' }); throw new ProviderError('rate_limited', 'Local request budget exhausted', { retryable: true }); }
  let attempt = 0;
  for (;;) {
    const started = Date.now();
    try {
      const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      const entry = { provider, url: redact(url), status: res.status, ms: Date.now() - started, attempt };
      if (res.ok) {
        log({ ...entry, outcome: 'ok' });
        const body = parse === 'bytes' ? new Uint8Array(await res.arrayBuffer()) : await res.json().catch(() => { throw new ProviderError('bad_json', 'Response is not JSON', { status: res.status }); });
        return { body, status: res.status, headers: res.headers };
      }
      const retryable = res.status === 429 || res.status >= 500;
      log({ ...entry, outcome: retryable ? 'retryable' : 'failed' });
      if (!retryable || attempt >= retries) throw new ProviderError(res.status === 401 || res.status === 403 ? 'unauthorized' : res.status === 429 ? 'rate_limited' : 'http_error', `HTTP ${res.status}`, { status: res.status, retryable });
    } catch (e) {
      if (e instanceof ProviderError && !e.retryable) throw e;
      if (e instanceof ProviderError && attempt >= retries) throw e;
      if (!(e instanceof ProviderError)) {
        log({ provider, url: redact(url), outcome: e?.name === 'TimeoutError' ? 'timeout' : 'network', ms: Date.now() - started, attempt });
        if (attempt >= retries) throw new ProviderError(e?.name === 'TimeoutError' ? 'timeout' : 'network', 'Provider unreachable', { retryable: true });
      }
    }
    attempt++;
    await sleep(Math.min(8000, 400 * 2 ** attempt) * (0.75 + Math.random() * 0.5));
  }
}
