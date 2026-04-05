// src/lib/firebase/index.js

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  remove,
  onValue,
  off
} from 'firebase/database';

import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_DATABASE_URL,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID
} from '$env/static/public';

import { authStore } from '$lib/stores/auth';
import { loadUserData, clearUserData } from '$lib/stores/data';
import { firebaseStatus } from '$lib/stores/ui';
import { browser } from '$app/environment';

let _app = null;
let _auth = null;
let _db = null;
let _unsubscribeAuth = null;

function getFirebaseConfig() {
  return {
    apiKey: PUBLIC_FIREBASE_API_KEY,
    authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: PUBLIC_FIREBASE_DATABASE_URL,
    projectId: PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: PUBLIC_FIREBASE_APP_ID
  };
}

export function initFirebase() {
  if (!browser) return;
  if (_app) return;

  const config = getFirebaseConfig();

  if (!config.apiKey) {
    console.error('[Firebase] Falta PUBLIC_FIREBASE_API_KEY');
    firebaseStatus.set('error');
    return;
  }

  console.log('[Firebase] Config cargada:', {
    apiKeyPreview: `${config.apiKey.slice(0, 6)}...`,
    authDomain: config.authDomain,
    projectId: config.projectId,
    databaseURL: config.databaseURL
  });

  if (getApps().length > 0) {
    _app = getApps()[0];
  } else {
    _app = initializeApp(config);
  }

  _auth = getAuth(_app);
  _db = getDatabase(_app);

  _unsubscribeAuth = onAuthStateChanged(
    _auth,
    (user) => {
      authStore.setUser(user);
      firebaseStatus.set('ready');
      if (user) {
        loadUserData(user.uid, { email: user.email, displayName: user.displayName });
      } else {
        clearUserData();
      }
    },
    (error) => {
      console.error('[Firebase] Auth error:', error);
      authStore.setError(error.message);
      firebaseStatus.set('error');
    }
  );

  firebaseStatus.set('ready');
}

function requireAuth() {
  if (!_auth) throw new Error('Firebase Auth no inicializado. Llama initFirebase() primero.');
  return _auth;
}

function requireDb() {
  if (!_db) throw new Error('Firebase Database no inicializado. Llama initFirebase() primero.');
  return _db;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(requireAuth(), email, password);
  return cred.user;
}

export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(requireAuth(), email, password);
  // Send welcome email (fire and forget)
  fetch('/api/email/welcome', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, displayName: email.split('@')[0], secret: 'welcome' }),
  }).catch(() => {});
  return cred.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(requireAuth(), provider);
  // Send welcome email on first Google login (fire and forget)
  if (cred._tokenResponse?.isNewUser) {
    fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cred.user.email, displayName: cred.user.displayName, secret: 'welcome' }),
    }).catch(() => {});
  }
  return cred.user;
}

export async function logout() {
  await signOut(requireAuth());
  clearUserData();
  authStore.clear();
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(requireAuth(), email);
}

export async function dbRead(path) {
  const snapshot = await get(ref(requireDb(), path));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function dbWrite(path, data) {
  await set(ref(requireDb(), path), data);
}

export async function dbPush(path, data) {
  const newRef = await push(ref(requireDb(), path), data);
  return newRef.key;
}

export async function dbRemove(path) {
  await remove(ref(requireDb(), path));
}

export function dbSubscribe(path, callback) {
  const dbRef = ref(requireDb(), path);
  onValue(dbRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
  return () => off(dbRef);
}

export function userPath(uid, ...segments) {
  if (!uid) throw new Error('uid requerido para construir userPath');
  return ['users', uid, ...segments].join('/');
}