// src/lib/firebase/index.js
// ════════════════════════════════════════════════════════════════
// REEMPLAZA: scripts/firebase-init.js y el patrón window.auth, window.database
//
// DIFERENCIA CLAVE con el sistema actual:
// firebase-init.js usaba el SDK "compat" de Firebase (firebase.auth(),
// firebase.database()) que es una capa de compatibilidad con Firebase v8.
// Aquí usamos el SDK modular v10 directamente, que permite tree shaking:
// Vite solo incluye en el bundle las funciones de Firebase que realmente
// importamos. El SDK compat siempre incluye todo Firebase.
//
// PATRÓN SINGLETON con inicialización lazy:
// La función getFirebase() inicializa Firebase exactamente una vez,
// la primera vez que se llama. Llamadas posteriores devuelven la misma
// instancia. Esto evita el patrón de "esperar con setInterval" que
// usaba firebase-init.js para detectar cuándo cargaba el SDK global.
// ════════════════════════════════════════════════════════════════

import { initializeApp, getApps }         from 'firebase/app';
import { getAuth, onAuthStateChanged,
         signInWithEmailAndPassword,
         createUserWithEmailAndPassword,
         signInWithPopup, GoogleAuthProvider,
         signOut, sendPasswordResetEmail }  from 'firebase/auth';
import { getDatabase, ref, get, set,
         push, remove, onValue, off }      from 'firebase/database';

import { authStore }                        from '$lib/stores/auth';
import { firebaseStatus }                   from '$lib/stores/ui';
import { browser }                          from '$app/environment';

// ── Singleton ─────────────────────────────────────────────────────
let _app  = null;
let _auth = null;
let _db   = null;
let _unsubscribeAuth = null;

/**
 * Inicializar Firebase (idempotente — seguro de llamar múltiples veces).
 * La configuración viene de variables de entorno PUBLIC_* que Vite
 * expone al cliente. Las variables sin el prefijo PUBLIC_ nunca
 * llegan al bundle del cliente.
 */
export async function initFirebase() {
  if (!browser) return; // No ejecutar en SSR
  if (_app) return;     // Ya inicializado

  // Si hay apps ya registradas (HMR en desarrollo), reutilizarlas
  if (getApps().length > 0) {
    _app  = getApps()[0];
  } else {
    const config = {
      apiKey:            import.meta.env.PUBLIC_FIREBASE_API_KEY,
      authDomain:        import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL:       import.meta.env.PUBLIC_FIREBASE_DATABASE_URL,
      projectId:         import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.PUBLIC_FIREBASE_APP_ID,
    };

    _app = initializeApp(config);
  }

  _auth = getAuth(_app);
  _db   = getDatabase(_app);

  // Escuchar cambios de autenticación y actualizar el store
  // onAuthStateChanged retorna una función para cancelar la suscripción
  _unsubscribeAuth = onAuthStateChanged(_auth, (user) => {
    authStore.setUser(user);
    firebaseStatus.set(user ? 'ready' : 'ready');
  }, (error) => {
    console.error('[Firebase] Auth error:', error);
    authStore.setError(error.message);
    firebaseStatus.set('error');
  });

  firebaseStatus.set('ready');
}

// ── Getters seguros (lanzas error si llamas antes de initFirebase) ─
function requireAuth() {
  if (!_auth) throw new Error('Firebase Auth no inicializado. Llama initFirebase() primero.');
  return _auth;
}
function requireDb() {
  if (!_db) throw new Error('Firebase Database no inicializado. Llama initFirebase() primero.');
  return _db;
}

// ════════════════════════════════════════════════════════════════
// AUTH — métodos de autenticación
// ════════════════════════════════════════════════════════════════

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(requireAuth(), email, password);
  return cred.user;
}

export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(requireAuth(), email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(requireAuth(), provider);
  return cred.user;
}

export async function logout() {
  await signOut(requireAuth());
  authStore.clear();
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(requireAuth(), email);
}

// ════════════════════════════════════════════════════════════════
// DATABASE — operaciones de Realtime Database
// Estas funciones reemplazan window.firebaseRead / window.firebaseWrite
// ════════════════════════════════════════════════════════════════

/**
 * Leer datos de una ruta de RTDB una sola vez.
 * Equivalente al antiguo window.firebaseRead(path)
 */
export async function dbRead(path) {
  const snapshot = await get(ref(requireDb(), path));
  return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Escribir datos en una ruta de RTDB.
 * Equivalente al antiguo window.firebaseWrite(path, data)
 */
export async function dbWrite(path, data) {
  await set(ref(requireDb(), path), data);
}

/**
 * Añadir un elemento a una lista de RTDB (genera ID automático).
 * Devuelve la key generada.
 */
export async function dbPush(path, data) {
  const newRef = await push(ref(requireDb(), path), data);
  return newRef.key;
}

/**
 * Eliminar datos de una ruta de RTDB.
 */
export async function dbRemove(path) {
  await remove(ref(requireDb(), path));
}

/**
 * Suscribirse a cambios en tiempo real de una ruta.
 * Devuelve una función de cleanup para llamar al destruir el componente.
 *
 * Uso en un componente Svelte:
 *   onMount(() => {
 *     const unsub = dbSubscribe(`users/${uid}/picks`, (data) => {
 *       picks = data;
 *     });
 *     return unsub; // Svelte llama esto en onDestroy automáticamente
 *   });
 */
export function dbSubscribe(path, callback) {
  const dbRef = ref(requireDb(), path);
  onValue(dbRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
  // Devolver función de cleanup
  return () => off(dbRef);
}

/**
 * Construir path de usuario autenticado.
 * Evitar el patrón `users/${window.userId}/picks` disperso por el código.
 */
export function userPath(uid, ...segments) {
  if (!uid) throw new Error('uid requerido para construir userPath');
  return ['users', uid, ...segments].join('/');
}
