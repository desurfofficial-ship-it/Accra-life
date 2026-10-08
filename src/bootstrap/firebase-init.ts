/**
 * firebase-init.ts — Firebase initialization extracted from src/firebase.ts.
 *
 * Previously, src/firebase.ts called initializeApp() at module scope (side-
 * effect import). This module makes the initialization EXPLICIT — callers
 * call `await initFirebase()` and receive the auth + firestore instances.
 *
 * The original src/firebase.ts re-exports the same `app`, `auth`, `db`,
 * and `firebaseError` symbols so existing imports continue to work.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

setLogLevel('silent');

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initialized = false;

function createFirestoreInstance(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: undefined, // use default memory cache
    });
  } catch {
    return getFirestore(app);
  }
}

export interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

/** Initialize Firebase + return the auth + firestore instances.
 *  Idempotent — safe to call multiple times. */
export async function initFirebase(): Promise<FirebaseInstances> {
  if (initialized && app && auth && db) {
    return { app, auth, db };
  }
  app = initializeApp(firebaseConfig);
  db = createFirestoreInstance(app);
  auth = getAuth(app);
  initialized = true;
  return { app, auth, db };
}

// Re-export for backward compat with code that imports from src/firebase.ts.
export { app, auth, db, GoogleAuthProvider };
