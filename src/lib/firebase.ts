import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore connection retry console.error spam in preview iframe
setLogLevel('silent');

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Offline Persistence Enabled (IndexedDB cache + multi-tab sync)
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const FALLBACK_AUTH_STORAGE_KEY = 'ateliercv_fallback_auth_user';

// Validate auth token service & Firestore connection on boot
async function testConnection() {
  try {
    await auth.authStateReady();
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(true);
      } catch (tokenErr) {
        const msg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
        if (
          msg.includes('token-service-api-has-not-been-used') ||
          msg.includes('securetoken.googleapis.com') ||
          msg.includes('auth/network-request-failed')
        ) {
          // Preserve user identity locally and sign out broken token so Firestore doesn't loop
          const fallbackUser = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || 'zulqarnainshah25@gmail.com',
            displayName:
              auth.currentUser.displayName ||
              auth.currentUser.email?.split('@')[0] ||
              'User',
            emailVerified: auth.currentUser.emailVerified
          };
          try {
            localStorage.setItem(FALLBACK_AUTH_STORAGE_KEY, JSON.stringify(fallbackUser));
          } catch {
            // Ignore storage errors
          }
          await signOut(auth);
          window.dispatchEvent(
            new CustomEvent('ateliercv-token-api-fallback', { detail: fallbackUser })
          );
          return;
        }
      }
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Client will seamlessly operate using IndexedDB offline persistence / local session
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
