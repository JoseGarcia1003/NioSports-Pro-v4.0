import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
// src/lib/stores/data.js
// ════════════════════════════════════════════════════════════════
// Stores de datos del usuario — backed by Supabase.
// Firebase Auth se mantiene para identidad.
// Supabase es la única fuente de datos para picks y bankroll.
// ════════════════════════════════════════════════════════════════

import { writable, derived } from 'svelte/store';
import { authStore } from '$lib/stores/auth.js';
import { getUserPicks, savePick as sbSavePick, updatePick, deletePick as sbDeletePick,
         upsertUserProfile
} from '$lib/supabase/client.js';

// ── Helpers de seguridad ──────────────────────────────────────
/** Garantiza que cualquier valor sea siempre un array */
function toArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.values(val);
  return [];
}

// ── Estado de carga ───────────────────────────────────────────
export const dataLoading = writable(false);
export const dataError   = writable(null);

// Every async operation belongs to one session, including a second login by the
// same user. Clearing a store also invalidates its pending work independently.
let activeUserId = null;
let sessionGeneration = 0;
let picksGeneration = 0;
let picksLoad = 0;
let bankrollLoad = 0;

function sessionFor(userId = activeUserId) {
  if (!userId || userId !== activeUserId || userId !== authStore.getSnapshot().userId) return null;
  return { userId, generation: sessionGeneration };
}

function currentSession(session) {
  return session && session.generation === sessionGeneration && session.userId === activeUserId &&
    session.userId === authStore.getSnapshot().userId;
}

function sessionChanged() {
  return new DOMException('La sesión cambió. Vuelve a cargar tus datos.', 'AbortError');
}

function requireSession(userId = activeUserId) {
  const session = sessionFor(userId);
  if (!session) throw sessionChanged();
  return session;
}

function requireCurrentPicks(session, generation) {
  if (!currentSession(session) || generation !== picksGeneration) throw sessionChanged();
}

// ── Estadísticas de equipos NBA ───────────────────────────────
const _teamStats      = writable({});
const _usingDemoStats = writable(false);

export const teamStats = {
  subscribe: _teamStats.subscribe,
  set(data)           { _teamStats.set(data || {}); },
  setDemoMode(isDemo) { _usingDemoStats.set(isDemo); },
  getSnapshot() {
    let s; _teamStats.subscribe(v => s = v)(); return s;
  }
};
export const usingDemoStats = { subscribe: _usingDemoStats.subscribe };

// ── Picks del usuario (Supabase) ──────────────────────────────
const EMPTY_PICKS = { totales: [], ai: [], backtesting: [], props: [], all: [] };

const _picks = writable({ ...EMPTY_PICKS });

export const picksStore = {
  subscribe: _picks.subscribe,

  setByType(type, data) {
    _picks.update(p => ({ ...p, [type]: toArray(data) }));
  },

  getArray(type) {
    let p; _picks.subscribe(v => p = v)();
    return toArray(p[type]);
  },

  /** Load all picks for a user from Supabase */
  async loadForUser(userId) {
    const session = sessionFor(userId);
    if (!session) return;
    const request = ++picksLoad;
    const current = () => currentSession(session) && request === picksLoad;
    dataLoading.set(true);
    dataError.set(null);

    try {
      const raw = await getUserPicks(userId, { limit: 500 });
      if (!current()) return;

      // ✅ FIX: garantiza array antes de cualquier .filter()
      const allPicks = toArray(raw).filter(pick => pick?.user_id === session.userId);

      const totales     = allPicks.filter(p => p.source === 'totales' || p.source === 'manual');
      const ai          = allPicks.filter(p => p.source === 'ai'      || p.source === 'model');
      const backtesting = allPicks.filter(p => p.source === 'backtesting');
      const props       = allPicks.filter(p => p.source === 'props');

      _picks.set({ totales, ai, backtesting, props, all: allPicks });
    } catch (err) {
      if (!current()) return;
      console.error('[data.js] Error loading picks:', err);
      dataError.set(err.message);
      // ✅ FIX: en caso de error no deja el store en estado inválido
      _picks.set({ ...EMPTY_PICKS });
    } finally {
      if (current()) dataLoading.set(false);
    }
  },

  /** Save a new pick to Supabase and update store */
  async save(pick) {
    const session = requireSession();
    if (pick?.user_id !== session.userId) throw sessionChanged();
    const generation = picksGeneration;
    try {
      const saved = await sbSavePick(pick);
      requireCurrentPicks(session, generation);
      if (saved?.user_id !== session.userId) throw new Error('El pick guardado no pertenece a la cuenta activa.');
      _picks.update(p => {
        const source = pick.source || 'totales';
        const key    = source === 'model' ? 'ai' : (source === 'manual' ? 'totales' : source);
        const bucket = toArray(p[key]);
        return {
          ...p,
          [key]: [saved, ...bucket],
          all:   [saved, ...toArray(p.all)],
        };
      });
      return saved;
    } catch (err) {
      if (currentSession(session) && err.name !== 'AbortError') console.error('[data.js] Error saving pick:', err);
      throw err;
    }
  },

  /** Update a pick in Supabase and update store */
  async update(pickId, updates) {
    const session = requireSession();
    const generation = picksGeneration;
    if (updates.user_id !== undefined && updates.user_id !== session.userId) throw sessionChanged();
    try {
      const updated = await updatePick(pickId, updates);
      requireCurrentPicks(session, generation);
      if (updated?.user_id !== session.userId) throw new Error('El pick actualizado no pertenece a la cuenta activa.');
      _picks.update(p => {
        const updateInArray = (arr) =>
          toArray(arr).map(pick => pick.id === pickId ? { ...pick, ...updated } : pick);
        return {
          totales:     updateInArray(p.totales),
          ai:          updateInArray(p.ai),
          backtesting: updateInArray(p.backtesting),
          props:       updateInArray(p.props),
          all:         updateInArray(p.all),
        };
      });
      return updated;
    } catch (err) {
      if (currentSession(session) && err.name !== 'AbortError') console.error('[data.js] Error updating pick:', err);
      throw err;
    }
  },

  /** Delete a pick from Supabase and update store */
  async remove(pickId) {
    const session = requireSession();
    const generation = picksGeneration;
    try {
      await sbDeletePick(pickId);
      requireCurrentPicks(session, generation);
      _picks.update(p => {
        const filterOut = (arr) => toArray(arr).filter(pick => pick.id !== pickId);
        return {
          totales:     filterOut(p.totales),
          ai:          filterOut(p.ai),
          backtesting: filterOut(p.backtesting),
          props:       filterOut(p.props),
          all:         filterOut(p.all),
        };
      });
    } catch (err) {
      if (currentSession(session) && err.name !== 'AbortError') console.error('[data.js] Error deleting pick:', err);
      throw err;
    }
  },

  /** Clear all local data (on logout) */
  clear() {
    picksGeneration++;
    picksLoad++;
    _picks.set({ ...EMPTY_PICKS });
    dataLoading.set(false);
    dataError.set(null);
  }
};

// Stores derivados — siempre arrays garantizados
export const picksTotales     = derived(_picks, $p => toArray($p.totales));
export const picksAI          = derived(_picks, $p => toArray($p.ai));
export const picksBacktesting = derived(_picks, $p => toArray($p.backtesting));
export const allPicks         = derived(_picks, $p => toArray($p.all));

// ── Bankroll (Supabase) ───────────────────────────────────────
const _bankroll = writable({
  current:  0,
  initial:  0,
  history:  [],
  lastSync: null,
});

export const bankrollStore = {
  subscribe: _bankroll.subscribe,

  set(data) {
    _bankroll.set({ ...data, lastSync: new Date().toISOString() });
  },

  getSnapshot() {
    let s; _bankroll.subscribe(v => s = v)(); return s;
  },

  /** Load bankroll data from Supabase */
  async loadForUser(userId) {
    const session = sessionFor(userId);
    if (!session) return;
    const request = ++bankrollLoad;
    const current = () => currentSession(session) && request === bankrollLoad;
    try {
      const response = await authenticatedFetch('/api/bankroll');
      if (!current()) return;
      if (!response.ok) throw new Error('Bankroll unavailable');
      const result = await response.json();
      if (!current()) return;
      const wallet = result.wallet || {};
      _bankroll.set({
        current: Number(wallet.available_minor || 0) / 100,
        initial: (Number(wallet.deposited_minor || 0) - Number(wallet.withdrawn_minor || 0)) / 100,
        profit: Number(wallet.profit_minor || 0) / 100,
        reserved: Number(wallet.reserved_minor || 0) / 100,
        settledStake: Number(wallet.settled_stake_minor || 0) / 100,
        history: toArray(result.entries).map(e => ({ ...e, type: e.kind, amount: e.delta_minor / 100, balance: e.balance_minor / 100 })),
        lastSync: new Date().toISOString(),
      });
    } catch (err) {
      if (current()) console.error('[data.js] Error loading bankroll:', err);
    }
  },

  /** Add a transaction to Supabase and update store */
  async addTransaction(transaction) {
    try {
      throw new Error('Registra movimientos y liquida tickets desde el nuevo panel de bankroll.');
    } catch (err) {
      console.error('[data.js] Error adding transaction:', err);
      throw err;
    }
  },

  /** Clear on logout */
  clear() {
    bankrollLoad++;
    _bankroll.set({ current: 0, initial: 0, history: [], lastSync: null });
  }
};

export const bankrollROI = derived(_bankroll, b => b.settledStake > 0 ? ((b.profit || 0) / b.settledStake * 100).toFixed(1) : null);
export const bankrollPnL = derived(_bankroll, b => b.profit ?? null);

// ── AI Picks de hoy ──────────────────────────────────────────
const _aiPicksToday     = writable([]);
const _aiPicksCacheDate = writable(null);
const _usingDemoGames   = writable(false);

export const aiPicksStore = {
  subscribe: _aiPicksToday.subscribe,
  set(picks, date) {
    _aiPicksToday.set(toArray(picks));
    _aiPicksCacheDate.set(date || new Date().toDateString());
  },
  setDemoMode(isDemo) { _usingDemoGames.set(isDemo); },
};

export const usingDemoGames = { subscribe: _usingDemoGames.subscribe };

export const demoStatus = derived(
  [_usingDemoStats, _usingDemoGames],
  ([$stats, $games]) => ({
    usingDemoStats: $stats,
    usingDemoGames: $games,
    anyDemoActive:  $stats || $games,
  })
);

// ═══════════════════════════════════════════════════════════════
// MASTER LOADER — call on auth state change
// ═══════════════════════════════════════════════════════════════

/**
 * Load all user data from Supabase. Call when user logs in.
 * @param {string} userId  - Firebase UID
 * @param {Object} userInfo - { email, displayName }
 */
export async function loadUserData(userId, userInfo = {}) {
  const session = sessionFor(userId);
  if (!session) return;

  try {
    await upsertUserProfile({
      id:           userId,
      email:        userInfo.email        || '',
      display_name: userInfo.displayName  || '',
    });
  } catch (err) {
    if (currentSession(session)) console.warn('[data.js] Profile upsert warning:', err.message);
  }

  if (!currentSession(session)) return;
  await Promise.all([
    picksStore.loadForUser(userId),
    bankrollStore.loadForUser(userId),
  ]);
}

/**
 * Clear all user data. Call on logout.
 */
export function clearUserData() {
  sessionGeneration++;
  activeUserId = null;
  picksStore.clear();
  bankrollStore.clear();
  _aiPicksToday.set([]);
  _aiPicksCacheDate.set(null);
  _usingDemoGames.set(false);
}

// Clear synchronously on every auth transition, including Firebase auth errors.
// The master loader can then await profile setup without exposing the old owner.
authStore.subscribe(({ userId }) => {
  if (userId === activeUserId) return;
  clearUserData();
  activeUserId = userId;
});
