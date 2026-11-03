import { parseFirebaseAuthError, sanitizeHostname } from './authErrorHandler';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  // Test 1: Detects auth/unauthorized-domain on Vercel deployment domain
  const vercelError = new Error('Firebase: Error (auth/unauthorized-domain).');
  (vercelError as { code?: string }).code = 'auth/unauthorized-domain';
  const parsedVercel = parseFirebaseAuthError(vercelError, 'atlier-cv.vercel.app', 'rising-safeguard-8bcxw');
  assert(parsedVercel.isUnauthorizedDomain === true, 'Should detect unauthorized-domain');
  assert(parsedVercel.unauthorizedHostname === 'atlier-cv.vercel.app', 'Should preserve Vercel hostname');
  assert(
    parsedVercel.firebaseConsoleAuthSettingsUrl ===
      'https://console.firebase.google.com/project/rising-safeguard-8bcxw/authentication/settings',
    'Should generate accurate Firebase Console Authorized Domains URL'
  );
  assert(
    parsedVercel.userMessage.includes('atlier-cv.vercel.app'),
    'User message should mention the unauthorized domain name'
  );

  // Test 2: Detects auth/unauthorized-domain even when only message string is present (no .code property)
  const stringOnlyError = 'Firebase: Error (auth/unauthorized-domain).';
  const parsedFromString = parseFirebaseAuthError(stringOnlyError, 'https://atlier-cv.vercel.app/login');
  assert(parsedFromString.isUnauthorizedDomain === true, 'Should detect unauthorized-domain from message string');
  assert(parsedFromString.unauthorizedHostname === 'atlier-cv.vercel.app', 'Should strip protocol and path from hostname');

  // Test 3: Sanitizes malicious or malformed hostnames against XSS / URL injection
  const dirtyHost = sanitizeHostname('https://evil.com/<script>alert(1)</script>:3000/path');
  assert(!dirtyHost.includes('<') && !dirtyHost.includes('>'), 'Should strip script tags from hostname');
  assert(sanitizeHostname(null) === 'atlier-cv.vercel.app', 'Should fallback to default hostname when null');

  // Test 4: Handles popup-blocked and invalid-credential errors accurately
  const popupErr = { code: 'auth/popup-blocked', message: 'Popup blocked by browser' };
  const parsedPopup = parseFirebaseAuthError(popupErr, 'atlier-cv.vercel.app');
  assert(parsedPopup.isPopupBlocked === true, 'Should flag popup-blocked');

  const credErr = { code: 'auth/invalid-credential', message: 'Invalid credentials' };
  const parsedCred = parseFirebaseAuthError(credErr, 'atlier-cv.vercel.app');
  assert(
    parsedCred.userMessage === 'Email ya password ghalat hai. Dobara check karein.',
    'Should localize invalid-credential error'
  );

  // Test 5: Null/undefined error resilience
  const nullParsed = parseFirebaseAuthError(null, undefined);
  assert(nullParsed.code === 'auth/unknown', 'Should safely handle null error input');

  console.log('All 5 authErrorHandler unit tests passed!');
}

runTests();
