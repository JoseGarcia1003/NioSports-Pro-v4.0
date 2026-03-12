// src/lib/stores/data.js
// ════════════════════════════════════════════════════════════════
// REEMPLAZA: window.TEAM_STATS, window.USER_PICKS_TOTALES,
//            window.USER_PICKS_AI, window.USER_BANKROLL,
//            window.AI_PICKS_TODAY, AppState.picks, AppState.bankroll
//
// PATRÓN IMPORTANTE — por qué separamos datos de UI:
// En el sistema actual, todo vive junto en AppState. Aquí separamos
// deliberadamente:
//   • ui.js   → estado efímero de la interfaz (tema, toasts, loading)
//   • data.js → datos persistentes del usuario y la temporada NBA
//   • auth.js → identidad del usuario (quién es)
//
// Esta separación importa porque los datos del usuario vienen de Firebase
// (async, pueden cambiar desde otro dispositivo), los datos de la NBA
// vienen de una API externa (pueden fallar), y el estado de UI es local
// y síncrono. Mezclarlos en un solo objeto hace que cualquier cambio
// en cualquier parte re-renderice todo. Con stores separados, solo
// re-renderizan los componentes que consumen el store que cambió.
// ════════════════════════════════════════════════════════════════

import { writable, derived } from 'svelte/store';

// ── Estadísticas de equipos NBA ───────────────────────────────────
// Cargadas desde /data/nba-stats.json (actualizado por el GitHub Action)
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

// ── Picks del usuario guardados en Firebase ───────────────────────
const _picks = writable({
  totales:    {},  // keyed by pickId
  ai:         {},
  backtesting: {},
  props:      {},
});

export const picksStore = {
  subscribe: _picks.subscribe,

  setByType(type, data) {
    _picks.update(p => ({ ...p, [type]: data || {} }));
  },

  // Helpers para obtener picks como array (más conveniente para iteración)
  getArray(type) {
    let p; _picks.subscribe(v => p = v)();
    return Object.values(p[type] || {});
  }
};

// Stores derivados para consumo directo en componentes
export const picksTotales    = derived(_picks, $p => Object.values($p.totales    || {}));
export const picksAI         = derived(_picks, $p => Object.values($p.ai         || {}));
export const picksBacktesting= derived(_picks, $p => Object.values($p.backtesting|| {}));

// ── Bankroll ──────────────────────────────────────────────────────
const _bankroll = writable({
  current:  0,
  initial:  0,
  history:  [],
  lastSync: null,
});

export const bankrollStore = {
  subscribe: _bankroll.subscribe,
  set(data) { _bankroll.set({ ...data, lastSync: new Date().toISOString() }); },
  getSnapshot() { let s; _bankroll.subscribe(v => s = v)(); return s; }
};

// Métricas derivadas del bankroll — se recalculan automáticamente
export const bankrollROI = derived(_bankroll, $b => {
  if (!$b.initial || $b.initial === 0) return 0;
  return (($b.current - $b.initial) / $b.initial * 100).toFixed(1);
});

export const bankrollPnL = derived(_bankroll, $b => $b.current - $b.initial);

// ── AI Picks de hoy (generados por picks-engine.js) ───────────────
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

// Store combinado para el banner de datos demo (lo consume DemoBanner.svelte)
// derived() con múltiples stores: se actualiza cuando CUALQUIERA cambia
export const demoStatus = derived(
  [_usingDemoStats, _usingDemoGames],
  ([$stats, $games]) => ({
    usingDemoStats: $stats,
    usingDemoGames: $games,
    anyDemoActive:  $stats || $games,
  })
);
