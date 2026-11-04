export const DEFAULT_PORTAL_URL =
  'https://ais-pre-lpbionxpwsitdqb4fj4sjt-940167951205.asia-east1.run.app';
export const DEFAULT_LOGOUT_REDIRECT =
  'https://ais-pre-lpbionxpwsitdqb4fj4sjt-940167951205.asia-east1.run.app/?sso_logout=1';

export const PORTAL_URL_STORAGE_KEY = 'pakedu_portal_url';
export const LOGOUT_REDIRECT_STORAGE_KEY = 'pakedu_logout_redirect';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  clear?(): void;
}

export interface PortalSSOParams {
  portalUrl: string;
  logoutRedirect: string;
  ssoEmail: string | null;
  ssoName: string | null;
  ssoUid: string | null;
}

/**
 * Validates that a candidate URL uses http: or https: protocol to prevent
 * javascript:/data:/vbscript: XSS and open-redirect attacks.
 */
export function sanitizePortalUrl(rawUrl: string | null | undefined, fallback: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallback;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Basic email validation and sanitization for SSO query parameters.
 */
export function sanitizeSsoEmail(rawEmail: string | null | undefined): string | null {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return null;
  }
  const trimmed = rawEmail.trim();
  if (!trimmed || trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Reads URL search parameters (`portal_url`, `logout_redirect`, `sso_email`, `sso_name`, `sso_uid`),
 * persists `portal_url` and `logout_redirect` into localStorage when present and valid,
 * and returns the resolved portal URLs and SSO identity fields.
 */
export function parseAndSavePortalQueryParams(
  search: string,
  storage?: StorageLike | null
): PortalSSOParams {
  const targetStorage: StorageLike | null =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;

  const params = new URLSearchParams(search || '');
  const rawPortalUrl = params.get('portal_url');
  const rawLogoutRedirect = params.get('logout_redirect');
  const rawSsoEmail = params.get('sso_email');
  const rawSsoName = params.get('sso_name');
  const rawSsoUid = params.get('sso_uid');

  if (rawPortalUrl && rawPortalUrl.trim()) {
    const safePortalUrl = sanitizePortalUrl(rawPortalUrl, DEFAULT_PORTAL_URL);
    try {
      targetStorage?.setItem(PORTAL_URL_STORAGE_KEY, safePortalUrl);
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }

  if (rawLogoutRedirect && rawLogoutRedirect.trim()) {
    const safeLogoutRedirect = sanitizePortalUrl(rawLogoutRedirect, DEFAULT_LOGOUT_REDIRECT);
    try {
      targetStorage?.setItem(LOGOUT_REDIRECT_STORAGE_KEY, safeLogoutRedirect);
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }

  const ssoEmail = sanitizeSsoEmail(rawSsoEmail);
  const ssoName =
    rawSsoName && rawSsoName.trim() ? rawSsoName.trim().slice(0, 120) : null;
  const ssoUid =
    rawSsoUid && rawSsoUid.trim()
      ? rawSsoUid.trim().replace(/[^a-zA-Z0-9._@-]/g, '_').slice(0, 128)
      : ssoEmail
        ? `sso_${ssoEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : null;

  return {
    portalUrl: getMainPortalUrl(targetStorage),
    logoutRedirect: getLogoutRedirectUrl(targetStorage),
    ssoEmail,
    ssoName,
    ssoUid
  };
}

/**
 * Returns the saved Main Portal URL from localStorage or the default PakEdu Portal URL.
 */
export function getMainPortalUrl(storage?: StorageLike | null): string {
  const targetStorage: StorageLike | null =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;

  try {
    const saved = targetStorage?.getItem(PORTAL_URL_STORAGE_KEY);
    return sanitizePortalUrl(saved, DEFAULT_PORTAL_URL);
  } catch {
    return DEFAULT_PORTAL_URL;
  }
}

/**
 * Returns the saved Logout Redirect URL from localStorage or the default PakEdu Logout Redirect URL.
 */
export function getLogoutRedirectUrl(storage?: StorageLike | null): string {
  const targetStorage: StorageLike | null =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;

  try {
    const saved = targetStorage?.getItem(LOGOUT_REDIRECT_STORAGE_KEY);
    return sanitizePortalUrl(saved, DEFAULT_LOGOUT_REDIRECT);
  } catch {
    return DEFAULT_LOGOUT_REDIRECT;
  }
}
