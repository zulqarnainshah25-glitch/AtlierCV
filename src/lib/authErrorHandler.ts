export interface ParsedAuthError {
  code: string;
  userMessage: string;
  isUnauthorizedDomain: boolean;
  isProviderDisabled: boolean;
  isPopupBlocked: boolean;
  isPopupClosed: boolean;
  shouldAutoFallbackToDemo: boolean;
  unauthorizedHostname: string;
  firebaseConsoleAuthSettingsUrl: string;
}

/**
 * Sanitizes a hostname string so only valid domain characters remain
 * (prevents any DOM/URL injection if window.location.hostname is inspected).
 */
export function sanitizeHostname(rawHost?: string | null): string {
  if (!rawHost || typeof rawHost !== 'string') {
    return 'atlier-cv.vercel.app';
  }
  const cleaned = rawHost
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/[^a-z0-9.-]/g, '');
  return cleaned || 'atlier-cv.vercel.app';
}

/**
 * Analyzes Firebase Authentication errors and returns structured,
 * user-friendly Roman Urdu / English messages and actionable resolution metadata.
 */
export function parseFirebaseAuthError(
  err: unknown,
  currentHostname?: string | null,
  projectId: string = 'rising-safeguard-8bcxw'
): ParsedAuthError {
  const safeProjectId = (projectId || 'rising-safeguard-8bcxw').replace(/[^a-zA-Z0-9-]/g, '');
  const hostname = sanitizeHostname(currentHostname);
  const consoleUrl = `https://console.firebase.google.com/project/${safeProjectId}/authentication/settings`;

  const rawCode =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';
  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : 'Authentication error occurred.';

  const combined = `${rawCode} ${rawMessage}`.toLowerCase();

  if (
    combined.includes('token-service-api-has-not-been-used') ||
    combined.includes('securetoken.googleapis.com')
  ) {
    return {
      code: rawCode || 'auth/token-service-disabled',
      userMessage: 'Firebase Token Service API abhi active nahi hai. Local session activate kiya ja raha hai.',
      isUnauthorizedDomain: false,
      isProviderDisabled: false,
      isPopupBlocked: false,
      isPopupClosed: false,
      shouldAutoFallbackToDemo: true,
      unauthorizedHostname: hostname,
      firebaseConsoleAuthSettingsUrl: consoleUrl
    };
  }

  if (combined.includes('auth/unauthorized-domain') || combined.includes('unauthorized-domain')) {
    return {
      code: 'auth/unauthorized-domain',
      userMessage: `Google Sign-In ke liye aapka domain (${hostname}) abhi Firebase Console ke "Authorized domains" mein add nahi hai.`,
      isUnauthorizedDomain: true,
      isProviderDisabled: false,
      isPopupBlocked: false,
      isPopupClosed: false,
      shouldAutoFallbackToDemo: false,
      unauthorizedHostname: hostname,
      firebaseConsoleAuthSettingsUrl: consoleUrl
    };
  }

  if (combined.includes('auth/operation-not-allowed') || combined.includes('operation-not-allowed')) {
    return {
      code: 'auth/operation-not-allowed',
      userMessage: 'Yeh Sign-In provider Firebase Console mein abhi Enable nahi hai.',
      isUnauthorizedDomain: false,
      isProviderDisabled: true,
      isPopupBlocked: false,
      isPopupClosed: false,
      shouldAutoFallbackToDemo: true,
      unauthorizedHostname: hostname,
      firebaseConsoleAuthSettingsUrl: consoleUrl
    };
  }

  if (combined.includes('auth/popup-blocked') || combined.includes('popup-blocked')) {
    return {
      code: 'auth/popup-blocked',
      userMessage: 'Browser ne Google login popup block kar diya hai. Popup allow karein ya Redirect/Email login use karein.',
      isUnauthorizedDomain: false,
      isProviderDisabled: false,
      isPopupBlocked: true,
      isPopupClosed: false,
      shouldAutoFallbackToDemo: false,
      unauthorizedHostname: hostname,
      firebaseConsoleAuthSettingsUrl: consoleUrl
    };
  }

  if (
    combined.includes('auth/popup-closed-by-user') ||
    combined.includes('popup-closed-by-user') ||
    combined.includes('cancelled-popup-request')
  ) {
    return {
      code: 'auth/popup-closed-by-user',
      userMessage: 'Google Sign-In popup band kar diya gaya. Dobara "Continue with Google Account" par click karein.',
      isUnauthorizedDomain: false,
      isProviderDisabled: false,
      isPopupBlocked: false,
      isPopupClosed: true,
      shouldAutoFallbackToDemo: false,
      unauthorizedHostname: hostname,
      firebaseConsoleAuthSettingsUrl: consoleUrl
    };
  }

  if (combined.includes('auth/invalid-credential') || combined.includes('auth/wrong-password')) {
    return {
      code: 'auth/invalid-credential',
      userMessage: 'Email ya password ghalat hai. Dobara check karein.',
      isUnauthorizedDomain: false,
      isProviderDisabled: false,
      isPopupBlocked: false,
      isPopupClosed: false,
      shouldAutoFallbackToDemo: false,
      unauthorizedHostname: hostname,
      firebaseConsoleAuthSettingsUrl: consoleUrl
    };
  }

  if (combined.includes('auth/email-already-in-use')) {
    return {
      code: 'auth/email-already-in-use',
      userMessage: 'Yeh email pehle se registered hai. "Sign In" tab use karein.',
      isUnauthorizedDomain: false,
      isProviderDisabled: false,
      isPopupBlocked: false,
      isPopupClosed: false,
      shouldAutoFallbackToDemo: false,
      unauthorizedHostname: hostname,
      firebaseConsoleAuthSettingsUrl: consoleUrl
    };
  }

  if (combined.includes('auth/weak-password')) {
    return {
      code: 'auth/weak-password',
      userMessage: 'Password kam az kam 6 characters ka hona chahiye.',
      isUnauthorizedDomain: false,
      isProviderDisabled: false,
      isPopupBlocked: false,
      isPopupClosed: false,
      shouldAutoFallbackToDemo: false,
      unauthorizedHostname: hostname,
      firebaseConsoleAuthSettingsUrl: consoleUrl
    };
  }

  return {
    code: rawCode || 'auth/unknown',
    userMessage: rawMessage || 'Authentication failed. Please try again.',
    isUnauthorizedDomain: false,
    isProviderDisabled: false,
    isPopupBlocked: false,
    isPopupClosed: false,
    shouldAutoFallbackToDemo: false,
    unauthorizedHostname: hostname,
    firebaseConsoleAuthSettingsUrl: consoleUrl
  };
}
