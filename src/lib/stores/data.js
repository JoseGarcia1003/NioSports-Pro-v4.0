import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
// src/lib/stores/data.js
// ════════════════════════════════════════════════════════════════
// Stores de datos del usuario — backed by Supabase.
// Firebase Auth se mantiene para identidad.
// Supabase es la única fuente de datos para picks y bankroll.
// ════════════════════════════════════════════════════════════════

import { writable, derived } from 'svelte/store';
import { getUserPicks, savePick as sbSavePick, updatePick, deletePick as sbDeletePick,
         getBankrollHistory, addBankrollTransaction, getUserProfile, upsertUserProfile
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
    if (!userId) return;
    dataLoading.set(true);
    dataError.set(null);

    try {
      const raw = await getUserPicks(userId, { limit: 500 });

      // ✅ FIX: garantiza array antes de cualquier .filter()
      const allPicks = toArray(raw);

      const totales     = allPicks.filter(p => p.source === 'totales' || p.source === 'manual');
      const ai          = allPicks.filter(p => p.source === 'ai'      || p.source === 'model');
      const backtesting = allPicks.filter(p => p.source === 'backtesting');
      const props       = allPicks.filter(p => p.source === 'props');

      _picks.set({ totales, ai, backtesting, props, all: allPicks });
    } catch (err) {
      console.error('[data.js] Error loading picks:', err);
      dataError.set(err.message);
      // ✅ FIX: en caso de error no deja el store en estado inválido
      _picks.set({ ...EMPTY_PICKS });
    } finally {
      dataLoading.set(false);
    }
  },

  /** Save a new pick to Supabase and update store */
  async save(pick) {
    try {
      const saved = await sbSavePick(pick);
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
      console.error('[data.js] Error saving pick:', err);
      throw err;
    }
  },

  /** Update a pick in Supabase and update store */
  async update(pickId, updates) {
    try {
      const updated = await updatePick(pickId, updates);
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
      console.error('[data.js] Error updating pick:', err);
      throw err;
    }
  },

  /** Delete a pick from Supabase and update store */
  async remove(pickId) {
    try {
      await sbDeletePick(pickId);
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
      console.error('[data.js] Error deleting pick:', err);
      throw err;
    }
  },

  /** Clear all local data (on logout) */
  clear() {
    _picks.set({ ...EMPTY_PICKS });
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
    if (!userId) return;
    try {
      const response = await authenticatedFetch('/api/bankroll');
      if (!response.ok) throw new Error('Bankroll unavailable');
      const result = await response.json();
      const wallet = result.wallet || {};
      _bankroll.set({
        current: Number(wallet.available_minor || 0) / 100,
        initial: (Number(wallet.deposited_minor || 0) - Number(wallet.withdrawn_minor || 0)) / 100,
        profit: Number(wallet.profit_minor || 0) / 100,
        reserved: Number(wallet.reserved_minor || 0) / 100,
        settledStake: Number(wallet.settled_stake_minor || 0) / 100,
        history: result.entries.map(e => ({ ...e, type: e.kind, amount: e.delta_minor / 100, balance: e.balance_minor / 100 })),
        lastSync: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[data.js] Error loading bankroll:', err);
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
  if (!userId) return;

  try {
    await upsertUserProfile({
      id:           userId,
      email:        userInfo.email        || '',
      display_name: userInfo.displayName  || '',
    });
  } catch (err) {
    console.warn('[data.js] Profile upsert warning:', err.message);
  }

  await Promise.all([
    picksStore.loadForUser(userId),
    bankrollStore.loadForUser(userId),
  ]);
}

/**
 * Clear all user data. Call on logout.
 */
export function clearUserData() {
  picksStore.clear();
  bankrollStore.clear();
  dataError.set(null);
}