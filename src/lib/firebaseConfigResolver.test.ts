import assert from 'node:assert/strict';
import fallbackJson from '../../firebase-applet-config.json';
import { resolveFirebaseConfig } from './firebaseConfigResolver';

function runFirebaseConfigResolverTests() {
  // Test 1: Uses valid .env overrides when provided
  const customEnv = {
    VITE_FIREBASE_API_KEY: 'AIzaCustomKey123',
    VITE_FIREBASE_AUTH_DOMAIN: 'custom-app.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'custom-app',
    VITE_FIREBASE_STORAGE_BUCKET: 'custom-app.firebasestorage.app',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '1122334455',
    VITE_FIREBASE_APP_ID: '1:1122334455:web:abcdef',
    VITE_FIREBASE_FIRESTORE_DATABASE_ID: 'custom-db-id'
  };
  const resolvedCustom = resolveFirebaseConfig(customEnv, fallbackJson);
  assert.equal(resolvedCustom.apiKey, 'AIzaCustomKey123');
  assert.equal(resolvedCustom.projectId, 'custom-app');
  assert.equal(resolvedCustom.firestoreDatabaseId, 'custom-db-id');

  // Test 2: Falls back to firebase-applet-config.json when env is null/empty
  const resolvedFallback = resolveFirebaseConfig(null, fallbackJson);
  assert.equal(resolvedFallback.apiKey, fallbackJson.apiKey);
  assert.equal(resolvedFallback.authDomain, fallbackJson.authDomain);
  assert.equal(resolvedFallback.projectId, fallbackJson.projectId);
  assert.equal(resolvedFallback.storageBucket, fallbackJson.storageBucket);
  assert.equal(resolvedFallback.messagingSenderId, fallbackJson.messagingSenderId);
  assert.equal(resolvedFallback.appId, fallbackJson.appId);
  assert.equal(resolvedFallback.firestoreDatabaseId, fallbackJson.firestoreDatabaseId);

  // Test 3: Rejects placeholder strings like "apni_api_key_yahan_likhein" or "your_project_id"
  const placeholderEnv = {
    VITE_FIREBASE_API_KEY: 'apni_api_key_yahan_likhein',
    VITE_FIREBASE_AUTH_DOMAIN: 'apka_auth_domain.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'your_project_id',
    VITE_FIREBASE_STORAGE_BUCKET: '   '
  };
  const resolvedFromPlaceholders = resolveFirebaseConfig(placeholderEnv, fallbackJson);
  assert.equal(resolvedFromPlaceholders.apiKey, fallbackJson.apiKey);
  assert.equal(resolvedFromPlaceholders.authDomain, fallbackJson.authDomain);
  assert.equal(resolvedFromPlaceholders.projectId, fallbackJson.projectId);
  assert.equal(resolvedFromPlaceholders.storageBucket, fallbackJson.storageBucket);

  console.log('All Firebase Config Resolver unit tests passed (3/3).');
}

runFirebaseConfigResolverTests();
