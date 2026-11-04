import assert from 'node:assert/strict';
import {
  DEFAULT_PORTAL_URL,
  DEFAULT_LOGOUT_REDIRECT,
  PORTAL_URL_STORAGE_KEY,
  LOGOUT_REDIRECT_STORAGE_KEY,
  sanitizePortalUrl,
  parseAndSavePortalQueryParams,
  getMainPortalUrl,
  getLogoutRedirectUrl,
  StorageLike
} from './portalIntegration';

function createMockStorage(initial: Record<string, string> = {}): StorageLike & { store: Record<string, string> } {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    clear() {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    }
  };
}

// Test 1: Default fallbacks when localStorage is empty
{
  const mockStorage = createMockStorage();
  const result = parseAndSavePortalQueryParams('', mockStorage);
  assert.equal(result.portalUrl, DEFAULT_PORTAL_URL);
  assert.equal(result.logoutRedirect, DEFAULT_LOGOUT_REDIRECT);
  assert.equal(result.ssoEmail, null);
  assert.equal(result.ssoName, null);
  assert.equal(result.ssoUid, null);
  assert.equal(getMainPortalUrl(mockStorage), DEFAULT_PORTAL_URL);
  assert.equal(getLogoutRedirectUrl(mockStorage), DEFAULT_LOGOUT_REDIRECT);
}

// Test 2: Reads and persists portal_url, logout_redirect, sso_email, sso_name, and sso_uid from URL search params
{
  const mockStorage = createMockStorage();
  const query =
    '?portal_url=' +
    encodeURIComponent('https://ais-pre-lpbionxpwsitdqb4fj4sjt-940167951205.asia-east1.run.app/dashboard') +
    '&logout_redirect=' +
    encodeURIComponent('https://ais-pre-lpbionxpwsitdqb4fj4sjt-940167951205.asia-east1.run.app/?sso_logout=1') +
    '&sso_email=' +
    encodeURIComponent('teacher@sindh.edu.pk') +
    '&sso_name=' +
    encodeURIComponent('Ali Raza') +
    '&sso_uid=' +
    encodeURIComponent('uid_sindh_99');

  const result = parseAndSavePortalQueryParams(query, mockStorage);
  assert.equal(
    mockStorage.getItem(PORTAL_URL_STORAGE_KEY),
    'https://ais-pre-lpbionxpwsitdqb4fj4sjt-940167951205.asia-east1.run.app/dashboard'
  );
  assert.equal(
    mockStorage.getItem(LOGOUT_REDIRECT_STORAGE_KEY),
    'https://ais-pre-lpbionxpwsitdqb4fj4sjt-940167951205.asia-east1.run.app/?sso_logout=1'
  );
  assert.equal(result.ssoEmail, 'teacher@sindh.edu.pk');
  assert.equal(result.ssoName, 'Ali Raza');
  assert.equal(result.ssoUid, 'uid_sindh_99');
}

// Test 3: Security self-audit — blocks javascript: and data: URIs in portal_url and logout_redirect
{
  const mockStorage = createMockStorage();
  const maliciousQuery =
    '?portal_url=' +
    encodeURIComponent('javascript:alert(document.cookie)') +
    '&logout_redirect=' +
    encodeURIComponent('data:text/html,<script>alert(1)</script>');

  const result = parseAndSavePortalQueryParams(maliciousQuery, mockStorage);
  assert.equal(result.portalUrl, DEFAULT_PORTAL_URL);
  assert.equal(result.logoutRedirect, DEFAULT_LOGOUT_REDIRECT);
  assert.equal(
    sanitizePortalUrl('javascript:evil()', DEFAULT_PORTAL_URL),
    DEFAULT_PORTAL_URL
  );
}

// Test 4: Auto-generates safe ssoUid when sso_email is present without sso_uid
{
  const mockStorage = createMockStorage();
  const query = '?sso_email=zainab.khan%40edu.pk&sso_name=Zainab%20Khan';
  const result = parseAndSavePortalQueryParams(query, mockStorage);
  assert.equal(result.ssoEmail, 'zainab.khan@edu.pk');
  assert.equal(result.ssoName, 'Zainab Khan');
  assert.equal(result.ssoUid, 'sso_zainab_khan_edu_pk');
}

console.log('All 4 portalIntegration unit tests passed!');
