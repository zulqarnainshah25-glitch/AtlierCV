export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export interface ViteFirebaseEnv {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_FIRESTORE_DATABASE_ID?: string;
  [key: string]: unknown;
}

function cleanEnvValue(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  // Guard against empty strings or unreplaced template placeholders
  if (
    !trimmed ||
    trimmed.startsWith('apni_') ||
    trimmed.startsWith('apka_') ||
    trimmed.startsWith('your_')
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Resolves Firebase client configuration from Vite environment variables (.env)
 * while safely falling back to firebase-applet-config.json if any variable is missing or a placeholder.
 */
export function resolveFirebaseConfig(
  env: ViteFirebaseEnv | undefined | null,
  fallback: FirebaseClientConfig
): FirebaseClientConfig {
  const safeEnv = env || {};
  return {
    apiKey: cleanEnvValue(safeEnv.VITE_FIREBASE_API_KEY, fallback.apiKey),
    authDomain: cleanEnvValue(safeEnv.VITE_FIREBASE_AUTH_DOMAIN, fallback.authDomain),
    projectId: cleanEnvValue(safeEnv.VITE_FIREBASE_PROJECT_ID, fallback.projectId),
    storageBucket: cleanEnvValue(safeEnv.VITE_FIREBASE_STORAGE_BUCKET, fallback.storageBucket),
    messagingSenderId: cleanEnvValue(
      safeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
      fallback.messagingSenderId
    ),
    appId: cleanEnvValue(safeEnv.VITE_FIREBASE_APP_ID, fallback.appId),
    firestoreDatabaseId: cleanEnvValue(
      safeEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
      fallback.firestoreDatabaseId || '(default)'
    )
  };
}
