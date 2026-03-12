// src/lib/stores/auth.js
// ════════════════════════════════════════════════════════════════
// REEMPLAZA: window.currentUser, window.userId, window.isAuthenticated,
//            AppState.currentUser, y toda la lógica de sesión de auth.js
//
// CONCEPTO CLAVE — Svelte stores vs window.*:
// Un store de Svelte es un objeto con un método .subscribe(callback) que
// llama al callback cada vez que el valor cambia. La sintaxis $storeName
// en componentes .svelte es azúcar sintáctica para esa suscripción —
// cuando el componente se destruye, la suscripción se cancela sola.
//
// El patrón "writable derivado" que usamos aquí:
//   • writable(initialValue) → store que cualquiera puede modificar
//   • derived(stores, fn)    → store de solo lectura que se recalcula
//     automáticamente cuando cambien los stores de los que depende
//
// Ejemplo de uso en un componente .svelte:
//   import { authStore, isAuthenticated } from '$lib/stores/auth'
//   // $authStore.user.displayName — reactivo, sin event listeners manuales
// ════════════════════════════════════════════════════════════════

import { writable, derived } from 'svelte/store';

// ── Estado base de autenticación ─────────────────────────────────
// Este es el único punto de verdad para el estado de auth.
// Solo auth.js (este archivo) y firebase.js deberían escribir aquí.
const _authState = writable({
  user:            null,     // Objeto Firebase User (uid, email, displayName, photoURL...)
  userId:          null,     // Shortcut: user.uid
  loading:         true,     // true mientras Firebase verifica la sesión al inicio
  error:           null,     // Error del último intento de login
  sessionId:       null,     // ID de sesión para binding multi-dispositivo
  deviceId:        null,     // ID de dispositivo (localStorage)
});

// ── Stores derivados de solo lectura ─────────────────────────────
// Estos son los que los componentes consumen. No pueden ser modificados
// directamente — si intentas hacer $isAuthenticated = true, Svelte lanza
// un error en tiempo de compilación. La fuente de verdad es _authState.

/** true cuando el usuario tiene sesión activa */
export const isAuthenticated = derived(_authState, $s => !!$s.user);

/** true mientras Firebase aún no confirmó el estado de sesión inicial */
export const authLoading = derived(_authState, $s => $s.loading);

/** El objeto User de Firebase, o null si no hay sesión */
export const currentUser = derived(_authState, $s => $s.user);

/** Solo el UID, para evitar pasar el objeto User completo a componentes simples */
export const userId = derived(_authState, $s => $s.userId);

// ── API pública del store (las únicas funciones que modifican _authState) ─
// Esta separación entre "el estado" y "cómo se modifica" es el patrón
// que en frameworks más pesados se llama Redux o Vuex. En Svelte lo
// implementamos sin librería externa porque el lenguaje ya lo soporta.

export const authStore = {
  // Exponer el subscribe para que derived() y $authStore funcionen
  subscribe: _authState.subscribe,

  // Llamado por firebase.js cuando onAuthStateChanged dispara
  setUser(user) {
    _authState.update(s => ({
      ...s,
      user,
      userId:  user?.uid ?? null,
      loading: false,
      error:   null,
    }));
  },

  // Llamado al inicio mientras Firebase carga
  setLoading(loading) {
    _authState.update(s => ({ ...s, loading }));
  },

  // Llamado cuando login/register falla
  setError(error) {
    _authState.update(s => ({ ...s, error }));
  },

  // Limpiar estado al logout (firebase.js llama esto después de signOut)
  clear() {
    _authState.set({
      user:      null,
      userId:    null,
      loading:   false,
      error:     null,
      sessionId: null,
      deviceId:  null,
    });
  },

  // Obtener snapshot del estado actual sin suscribirse
  // Útil en funciones async que no son componentes Svelte
  getSnapshot() {
    let current;
    _authState.subscribe(s => (current = s))();
    return current;
  }
};
