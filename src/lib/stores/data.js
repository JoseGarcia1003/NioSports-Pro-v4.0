// src/lib/stores/data.js
// ════════════════════════════════════════════════════════════════
// Stores de datos del usuario — ahora backed by Supabase.
// Firebase Auth se mantiene para identidad.
// Supabase es la única fuente de datos para picks y bankroll.
// ════════════════════════════════════════════════════════════════

import { writable, derived } from 'svelte/store';
import { getUserPicks, savePick as sbSavePick, updatePick, deletePick as sbDeletePick,
         getBankrollHistory, addBankrollTransaction, getUserProfile, upsertUserProfile
} from '$lib/supabase/client.js';

// ── Estado de carga ───────────────────────────────────────────
export const dataLoading = writable(false);
export const dataError = writable(null);

// ── Estadísticas de equipos NBA ───────────────────────────────
const _teamStats = writable({});
const _usingDemoStats = writable(false);

export const teamStats = {
  subscribe: _teamStats.subscribe,
  set(data) { _teamStats.set(data || {}); },
  setDemoMode(isDemo) { _usingDemoStats.set(isDemo); },
  getSnapshot() {
    let s; _teamStats.subscribe(v => s = v)(); return s;
  }
};
export const usingDemoStats = { subscribe: _usingDemoStats.subscribe };

// ── Picks del usuario (Supabase) ──────────────────────────────
const _picks = writable({
  totales:     [],
  ai:          [],
  backtesting: [],
  props:       [],
  all:         [],
});

export const picksStore = {
  subscribe: _picks.subscribe,

  setByType(type, data) {
    _picks.update(p => ({ ...p, [type]: data || [] }));
  },

  getArray(type) {
    let p; _picks.subscribe(v => p = v)();
    return p[type] || [];
  },

  /** Load all picks for a user from Supabase */
  async loadForUser(userId) {
    if (!userId) return;
    dataLoading.set(true);
    dataError.set(null);

    try {
      const allPicks = await getUserPicks(userId, { limit: 500 });

      const totales = allPicks.filter(p => p.source === 'totales' || p.source === 'manual');
      const ai = allPicks.filter(p => p.source === 'ai' || p.source === 'model');
      const backtesting = allPicks.filter(p => p.source === 'backtesting');
      const props = allPicks.filter(p => p.source === 'props');

      _picks.set({ totales, ai, backtesting, props, all: allPicks });
    } catch (err) {
      console.error('[data.js] Error loading picks:', err);
      dataError.set(err.message);
    } finally {
      dataLoading.set(false);
    }
  },

  /** Save a new pick to Supabase and update store */
  async save(pick) {
    try {
      const saved = await sbSavePick(pick);
      // Add to local store immediately
      _picks.update(p => {
        const type = pick.source || 'totales';
        const key = type === 'model' ? 'ai' : (type === 'manual' ? 'totales' : type);
        return {
          ...p,
          [key]: [saved, ...(p[key] || [])],
          all: [saved, ...(p.all || [])],
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
          arr.map(pick => pick.id === pickId ? { ...pick, ...updated } : pick);
        return {
          totales: updateInArray(p.totales),
          ai: updateInArray(p.ai),
          backtesting: updateInArray(p.backtesting),
          props: updateInArray(p.props),
          all: updateInArray(p.all),
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
        const filterOut = (arr) => arr.filter(pick => pick.id !== pickId);
        return {
          totales: filterOut(p.totales),
          ai: filterOut(p.ai),
          backtesting: filterOut(p.backtesting),
          props: filterOut(p.props),
          all: filterOut(p.all),
        };
      });
    } catch (err) {
      console.error('[data.js] Error deleting pick:', err);
      throw err;
    }
  },

  /** Clear all local data (on logout) */
  clear() {
    _picks.set({ totales: [], ai: [], backtesting: [], props: [], all: [] });
  }
};

// Stores derivados — same interface as before, pages don't need to change
export const picksTotales     = derived(_picks, $p => $p.totales || []);
export const picksAI          = derived(_picks, $p => $p.ai || []);
export const picksBacktesting = derived(_picks, $p => $p.backtesting || []);
export const allPicks         = derived(_picks, $p => $p.all || []);

// ── Bankroll (Supabase) ──────────────────────────────────────
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
      const [profile, history] = await Promise.all([
        getUserProfile(userId),
        getBankrollHistory(userId, 100),
      ]);

      const initial = profile?.initial_bankroll || 0;
      // Calculate current from initial + sum of transactions
      const totalPnL = history.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      _bankroll.set({
        current: initial + totalPnL,
        initial,
        history: history || [],
        lastSync: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[data.js] Error loading bankroll:', err);
    }
  },

  /** Add a transaction to Supabase and update store */
  async addTransaction(transaction) {
    try {
      const saved = await addBankrollTransaction(transaction);
      _bankroll.update(b => ({
        ...b,
        current: b.current + (transaction.amount || 0),
        history: [saved, ...b.history],
        lastSync: new Date().toISOString(),
      }));
      return saved;
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

export const bankrollROI = derived(_bankroll, $b => {
  if (!$b.initial || $b.initial === 0) return 0;
  return (($b.current - $b.initial) / $b.initial * 100).toFixed(1);
});

export const bankrollPnL = derived(_bankroll, $b => $b.current - $b.initial);

// ── AI Picks de hoy ──────────────────────────────────────────
const _aiPicksToday = writable([]);
const _aiPicksCacheDate = writable(null);
const _usingDemoGames = writable(false);

export const aiPicksStore = {
  subscribe: _aiPicksToday.subscribe,
  set(picks, date) {
    _aiPicksToday.set(picks || []);
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
 * @param {string} userId - Firebase UID
 * @param {Object} userInfo - { email, displayName }
 */
export async function loadUserData(userId, userInfo = {}) {
  if (!userId) return;

  // Ensure user profile exists in Supabase
  try {
    await upsertUserProfile({
      id: userId,
      email: userInfo.email || '',
      display_name: userInfo.displayName || '',
    });
  } catch (err) {
    console.warn('[data.js] Profile upsert warning:', err.message);
  }

  // Load picks and bankroll in parallel
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