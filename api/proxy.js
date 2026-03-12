// api/proxy.js — NioSports Pro v4 Proxy (Upstash Redis rate limiting)
// ════════════════════════════════════════════════════════════════
// Vercel Serverless Function que actúa como proxy seguro hacia
// la API de BallDontLie. Funciona como una API privada — el API key
// nunca sale al cliente.
//
// VARIABLES DE ENTORNO requeridas en Vercel:
//   BALLDONTLIE_API_KEY         — tu API key de BallDontLie
//   NS_PROXY_SECRET             — secret HMAC para tokens internos
//   UPSTASH_REDIS_REST_URL      — auto-inyectada por Upstash marketplace
//   UPSTASH_REDIS_REST_TOKEN    — auto-inyectada por Upstash marketplace
//
// FALLBACK: Si Upstash no está configurado (dev local), usa Maps
// en memoria. Funciona pero no persiste entre instancias serverless.
// ════════════════════════════════════════════════════════════════

import { Redis } from "@upstash/redis";

// ── Cliente Redis (lazy init) ─────────────────────────────────────
let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
  }
  return _redis; // null → usa fallback en memoria
}

// ── Configuración ─────────────────────────────────────────────────
const API_BASE          = "https://api.balldontlie.io/v1";
const ALLOWED_ENDPOINTS = ["/players", "/season_averages", "/stats", "/games", "/teams"];

// ⚠️  ALLOWED_ORIGINS: lista de orígenes que pueden llamar al proxy.
//     Actualizar cuando cambies el dominio de producción en Vercel.
const ALLOWED_ORIGINS = [
  // Producción actual
  "https://nio-sports-pro-v4-0.vercel.app",
  // Producción anterior (mantener si hay usuarios activos)
  "https://nio-sports-pro.vercel.app",
  // GitHub Pages (legacy)
  "https://josegarcia1003.github.io",
  // Dev local
  "http://localhost:5173",
  "http://localhost:4173",  // vite preview
];

// Los previews de Vercel tienen URLs dinámicas — permitirlos todos
// en staging. En producción real esto se puede desactivar.
const VERCEL_PREVIEW_RE = /^https:\/\/nio-sports-pro-v4-[a-z0-9-]+\.vercel\.app$/i;

// Rate limiting
const BURST_CAPACITY      = 25;
const BURST_REFILL_MS     = 10_000;
const BURST_REFILL_TOKENS = 25;
const SUSTAINED_WINDOW_MS = 10 * 60_000;
const SUSTAINED_MAX       = 180;
const WINDOW_MS           = 60_000;
const LIMITS = { ipOnlyPerMin: 10, ipPerMin: 60, tokenPerMin: 120 };
const BAN_TTL_S   = 30;
const BURST_TTL_S = 300;

// ── Fallback en memoria (dev local sin Redis) ─────────────────────
function getMemStore() {
  if (!global.__NS_MEM_STORE__) {
    global.__NS_MEM_STORE__ = {
      burst:     new Map(),
      sustained: new Map(),
      bans:      new Map(),
      ipHits:    new Map(),
      tokenHits: new Map(),
    };
  }
  return global.__NS_MEM_STORE__;
}

// ════════════════════════════════════════════════════════════════
// CAPA DE RATE LIMITING
// ════════════════════════════════════════════════════════════════

async function isBanned(key) {
  const r = getRedis();
  if (r) return !!(await r.get(`ban:${key}`));
  const store = getMemStore();
  const until = store.bans.get(key);
  if (!until) return false;
  if (Date.now() > until) { store.bans.delete(key); return false; }
  return true;
}

async function banKey(key) {
  const r = getRedis();
  if (r) { await r.set(`ban:${key}`, 1, { ex: BAN_TTL_S }); return; }
  getMemStore().bans.set(key, Date.now() + BAN_TTL_S * 1000);
}

async function allowBurst(key, weight) {
  const r = getRedis();
  if (r) {
    const storeKey = `burst:${key}`;
    const t = Date.now();
    let entry = await r.get(storeKey);
    if (!entry) entry = { tokens: BURST_CAPACITY, last: t };
    const steps = Math.floor((t - entry.last) / BURST_REFILL_MS);
    if (steps > 0) {
      entry.tokens = Math.min(BURST_CAPACITY, entry.tokens + steps * BURST_REFILL_TOKENS);
      entry.last  += steps * BURST_REFILL_MS;
    }
    const allowed = entry.tokens >= weight;
    if (allowed) entry.tokens -= weight;
    await r.set(storeKey, entry, { ex: BURST_TTL_S });
    return allowed;
  }
  // Fallback memoria
  const store = getMemStore();
  const t     = Date.now();
  const entry = store.burst.get(key) || { tokens: BURST_CAPACITY, last: t };
  const steps = Math.floor((t - entry.last) / BURST_REFILL_MS);
  if (steps > 0) {
    entry.tokens = Math.min(BURST_CAPACITY, entry.tokens + steps * BURST_REFILL_TOKENS);
    entry.last  += steps * BURST_REFILL_MS;
  }
  const allowed = entry.tokens >= weight;
  if (allowed) entry.tokens -= weight;
  store.burst.set(key, entry);
  return allowed;
}

async function allowSustained(key, weight) {
  const r = getRedis();
  if (r) {
    const winIdx   = Math.floor(Date.now() / SUSTAINED_WINDOW_MS);
    const storeKey = `sust:${key}:${winIdx}`;
    const count    = await r.incrby(storeKey, weight);
    if (count === weight) await r.expire(storeKey, Math.ceil(SUSTAINED_WINDOW_MS / 1000) * 2);
    return count <= SUSTAINED_MAX;
  }
  const store  = getMemStore();
  const t      = Date.now();
  const arr    = store.sustained.get(key) || [];
  const cutoff = t - SUSTAINED_WINDOW_MS;
  let i = 0;
  while (i < arr.length && arr[i] < cutoff) i++;
  if (i > 0) arr.splice(0, i);
  for (let j = 0; j < weight; j++) arr.push(t);
  store.sustained.set(key, arr);
  return arr.length <= SUSTAINED_MAX;
}

async function takeHit(prefix, key) {
  const r = getRedis();
  if (r) {
    const minIdx   = Math.floor(Date.now() / WINDOW_MS);
    const storeKey = `${prefix}:min:${key}:${minIdx}`;
    const count    = await r.incr(storeKey);
    if (count === 1) await r.expire(storeKey, 120);
    return count;
  }
  const store  = getMemStore();
  const map    = prefix === 'ip' ? store.ipHits : store.tokenHits;
  const t      = Date.now();
  const arr    = map.get(key) || [];
  const cutoff = t - WINDOW_MS;
  let i = 0;
  while (i < arr.length && arr[i] < cutoff) i++;
  if (i > 0) arr.splice(0, i);
  arr.push(t); map.set(key, arr);
  return arr.length;
}

// ════════════════════════════════════════════════════════════════
// HMAC / Token interno (firmado, no JWT estándar)
// ════════════════════════════════════════════════════════════════

async function hmacSHA256(secret, payload) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig   = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const bytes = new Uint8Array(sig);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlEncode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}

async function makeToken(secret, data) {
  const h = b64urlEncode({ alg: "HS256", typ: "NSJWT" });
  const p = b64urlEncode(data);
  return `${h}.${p}.${await hmacSHA256(secret, `${h}.${p}`)}`;
}

async function verifyToken(secret, token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return { ok: false };
  const [h, p, sig] = parts;
  if (sig !== await hmacSHA256(secret, `${h}.${p}`)) return { ok: false };
  return { ok: true, payload: b64urlDecode(p) };
}

// ── Helpers ───────────────────────────────────────────────────────
function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (!xf) return "unknown";
  return String(xf).split(",")[0].trim() || "unknown";
}
function routeWeight(ep) { return ep.startsWith("/stats") ? 2 : 1; }
function basicBotRisk(req) {
  const ua = String(req.headers["user-agent"]      || "");
  const al = String(req.headers["accept-language"] || "");
  let risk = 0;
  if (!ua || ua.length < 10)    risk += 2;
  if (!al)                       risk++;
  if (/bot|crawl|spider/i.test(ua)) risk += 2;
  return risk;
}

function setCorsHeaders(res, origin) {
  res.setHeader("Access-Control-Allow-Origin",  origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-NS-Token, X-Firebase-UID, Authorization");
  res.setHeader("Access-Control-Max-Age",       "86400");
  res.setHeader("Vary", "Origin");
}

// ════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const origin = String(req.headers["origin"] || "");
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || VERCEL_PREVIEW_RE.test(origin);

  if (!isAllowed && origin) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  if (isAllowed) setCorsHeaders(res, origin);

  // Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Solo GET y POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.NS_PROXY_SECRET;
  if (!secret) {
    console.error("[proxy] NS_PROXY_SECRET no configurado");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const ip  = getClientIp(req);
  const ua  = String(req.headers["user-agent"] || "");
  const uid = String(req.headers["x-firebase-uid"] || "");

  // ── Endpoint de inicialización (obtener token) ────────────────────
  if (req.query?.init === "1") {
    const jti   = crypto.randomUUID();
    const t     = Date.now();
    const token = await makeToken(secret, {
      jti, ip,
      uaHash: (await hmacSHA256(secret, ua)).slice(0, 16),
      iat: t, exp: t + 10 * 60_000
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ token, expiresInMs: 10 * 60_000 });
  }

  // ── Validar token HMAC ────────────────────────────────────────────
  const nsToken  = req.headers["x-ns-token"];
  let tokenOk    = false;
  let tokenJti   = null;

  if (nsToken) {
    const v = await verifyToken(secret, nsToken);
    if (v.ok) {
      const p      = v.payload || {};
      const uaHash = (await hmacSHA256(secret, ua)).slice(0, 16);
      if (
        typeof p.exp === "number" && Date.now() <= p.exp &&
        p.ip === ip && p.uaHash === uaHash &&
        typeof p.jti === "string"
      ) {
        tokenOk  = true;
        tokenJti = p.jti;
      }
    }
  }

  // ── Clave compuesta de rate limit ─────────────────────────────────
  const rlKey = tokenOk
    ? (uid ? `ip:${ip}|uid:${uid}|tok:${tokenJti}` : `ip:${ip}|tok:${tokenJti}`)
    : (uid ? `ip:${ip}|uid:${uid}` : `ip:${ip}`);

  const endpointStr = String(req.query?.endpoint || "");
  const weight      = Math.min(5, routeWeight(endpointStr) + Math.min(basicBotRisk(req), 3));

  // ── Chequeos de rate limit ────────────────────────────────────────
  if (await isBanned(rlKey)) {
    res.setHeader("Retry-After", String(BAN_TTL_S));
    return res.status(429).json({ error: "Too many requests. Cooldown active." });
  }

  const [okBurst, okSust] = await Promise.all([
    allowBurst(rlKey, weight),
    allowSustained(rlKey, weight),
  ]);

  if (!okBurst || !okSust) {
    await banKey(rlKey);
    res.setHeader("Retry-After", String(BAN_TTL_S));
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const ipCount = await takeHit("ip", ip);
  if (!tokenOk && ipCount > LIMITS.ipOnlyPerMin) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      error: "Rate limit (sin token). Llama a /api/proxy?init=1 primero."
    });
  }
  if (tokenOk) {
    if (ipCount > LIMITS.ipPerMin) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Rate limit (ip)." });
    }
    const tokenCount = await takeHit("tok", tokenJti);
    if (tokenCount > LIMITS.tokenPerMin) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Rate limit (token)." });
    }
  }

  // ── Validar endpoint ──────────────────────────────────────────────
  if (!endpointStr) {
    return res.status(400).json({ error: "Falta el parámetro endpoint" });
  }
  if (!ALLOWED_ENDPOINTS.some(a => endpointStr.startsWith(a))) {
    return res.status(403).json({ error: "Endpoint no permitido" });
  }
  if (endpointStr.includes("http://") || endpointStr.includes("https://")) {
    return res.status(403).json({ error: "Endpoint inválido" });
  }

  // ── Llamada a BallDontLie API ─────────────────────────────────────
  try {
    const rawKey = String(process.env.BALLDONTLIE_API_KEY || "").trim();
    if (!rawKey) {
      return res.status(500).json({
        error: "BALLDONTLIE_API_KEY no configurado en Vercel",
        hint:  "Ve a Vercel → Settings → Environment Variables"
      });
    }

    const authHeader = /^bearer\s+/i.test(rawKey) ? rawKey : `Bearer ${rawKey}`;
    const upstream   = await fetch(`${API_BASE}${endpointStr}`, {
      headers: {
        Authorization:  authHeader,
        Accept:         "application/json",
        "User-Agent":   "NioSports-Pro-Proxy/4.0",
      },
    });

    const text = await upstream.text();
    let data   = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");

    if (data === null) {
      return res.status(upstream.status).json({
        error:           "La API upstream devolvió JSON inválido",
        upstreamStatus:  upstream.status,
        upstreamSnippet: String(text || "").slice(0, 200),
      });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("[proxy] Upstream error:", err?.message);
    return res.status(502).json({ error: "Error al conectar con la API upstream" });
  }
}