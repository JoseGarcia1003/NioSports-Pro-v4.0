// src/lib/stores/ui.js
// ════════════════════════════════════════════════════════════════
// REEMPLAZA: window.currentView, window.previousView, AppState.currentView,
//            y los setters de navegación de state.js
//
// La navegación en SvelteKit es manejada por el router automáticamente
// cuando usas <a href="/picks"> o la función goto() de SvelteKit.
// Este store existe para el estado de UI que no es navegación de URL:
// el tema (dark/light), si el nav móvil está abierto, toasts activos, etc.
// ════════════════════════════════════════════════════════════════

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// ── Tema oscuro/claro ─────────────────────────────────────────────
// Lee la preferencia guardada en localStorage, o la preferencia del OS.
function getInitialTheme() {
  if (!browser) return 'dark';  // SSR: siempre dark (no hay localStorage)
  const saved = localStorage.getItem('ns_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const _theme = writable(getInitialTheme());

export const theme = {
  subscribe: _theme.subscribe,
  toggle() {
    _theme.update(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      if (browser) {
        localStorage.setItem('ns_theme', next);
        document.documentElement.setAttribute('data-theme', next);
      }
      return next;
    });
  },
  set(value) {
    _theme.set(value);
    if (browser) {
      localStorage.setItem('ns_theme', value);
      document.documentElement.setAttribute('data-theme', value);
    }
  }
};

// ── Nav móvil ─────────────────────────────────────────────────────
export const mobileNavOpen = writable(false);

// ── Toast notifications ───────────────────────────────────────────
// En el proyecto actual, los toasts usan window.showToast() global.
// Aquí los gestionamos como un array en un store — cada componente
// puede añadir toasts y el componente <ToastContainer> los renderiza.

const _toasts = writable([]);
let _toastId = 0;

export const toasts = {
  subscribe: _toasts.subscribe,

  show({ message, type = 'info', duration = 3500 }) {
    const id = ++_toastId;
    _toasts.update(ts => [...ts, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  },

  dismiss(id) {
    _toasts.update(ts => ts.filter(t => t.id !== id));
  },

  // Atajos tipados
  success(message, duration)  { return this.show({ message, type: 'success', duration }); },
  error(message, duration)    { return this.show({ message, type: 'error',   duration: duration ?? 5000 }); },
  warning(message, duration)  { return this.show({ message, type: 'warning', duration }); },
};

// ── Loading overlay ───────────────────────────────────────────────
export const globalLoading = writable(false);

// ── Firebase connection status ────────────────────────────────────
export const firebaseStatus = writable('connecting'); // 'connecting' | 'ready' | 'error'

// ── Data source indicator (conecta con picks-engine) ──────────────
// Este store es el equivalente del evento 'ns:data-source-changed'
// que implementamos en Fase 1. En lugar de CustomEvents, usamos
// un store que el banner de demo lee directamente.
export const dataSource = writable({
  usingDemoStats: false,
  usingDemoGames: false,
  anyDemoActive:  false,
});

export const isDemoActive = derived(dataSource, $ds => $ds.anyDemoActive);
