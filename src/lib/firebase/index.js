// Firebase Authentication only (email/password and Google). Loaded after first
// paint by the layout. The Realtime Database SDK is not used: every piece of
// user data lives behind the server APIs, which verify the ID token.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { env } from '$env/dynamic/public';
import { authStore } from '$lib/stores/auth';
import { firebaseStatus } from '$lib/stores/ui';
import { browser } from '$app/environment';

let _app = null;
let _auth = null;

export function initFirebase() {
  if (!browser || _app) return;
  const config = {
    apiKey: env.PUBLIC_FIREBASE_API_KEY, authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID, appId: env.PUBLIC_FIREBASE_APP_ID
  };
  if (!config.apiKey) {
    authStore.setUser(null);
    authStore.setError('Autenticación no configurada');
    firebaseStatus.set('error');
    return;
  }
  _app = getApps()[0] ?? initializeApp(config);
  _auth = getAuth(_app);
  onAuthStateChanged(_auth,
    user => { authStore.setUser(user); firebaseStatus.set('ready'); },
    error => { console.error('[auth]', error?.code || error?.message); authStore.setUser(null); authStore.setError(error.message); firebaseStatus.set('error'); });
}

function requireAuth() {
  if (!_auth) throw new Error('La autenticación todavía no está lista. Inténtalo de nuevo en un momento.');
  return _auth;
}

export async function loginWithEmail(email, password) { return (await signInWithEmailAndPassword(requireAuth(), email, password)).user; }
export async function registerWithEmail(email, password) { return (await createUserWithEmailAndPassword(requireAuth(), email, password)).user; }
export async function loginWithGoogle() { return (await signInWithPopup(requireAuth(), new GoogleAuthProvider())).user; }
export async function logout() { await signOut(requireAuth()); authStore.clear(); }
export async function resetPassword(email) { await sendPasswordResetEmail(requireAuth(), email); }
