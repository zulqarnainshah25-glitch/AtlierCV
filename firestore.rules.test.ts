/**
 * Security Rules Verification Suite — Dirty Dozen Payload Assertions
 * Verifies that all 12 adversarial payloads described in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  docId?: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on User Creation',
    collection: 'users',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    docId: 'user_1',
    payload: {
      uid: 'user_1',
      email: 'u@example.com',
      displayName: 'Ali',
      role: 'user',
      plan: 'free',
      pdfExportsUsed: 0,
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
      isSuperAdmin: true
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role on User Registration',
    collection: 'users',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    docId: 'user_1',
    payload: {
      uid: 'user_1',
      email: 'u@example.com',
      displayName: 'Ali',
      role: 'admin',
      plan: 'free',
      pdfExportsUsed: 0,
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof',
    collection: 'users',
    operation: 'list',
    auth: { uid: 'spoof_uid', email: 'ZulqarnainShah25@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Cross-User PII Read on /users/victim_uid',
    collection: 'users',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    docId: 'victim_uid',
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Blanket List Scraping on /cvs without owner filter',
    collection: 'cvs',
    operation: 'list',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Identity Spoofing on CV Creation',
    collection: 'cvs',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    docId: 'cv_1',
    payload: {
      id: 'cv_1',
      userId: 'victim_uid',
      title: 'Spoofed CV'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Orphaned CV Creation Without User Profile',
    collection: 'cvs',
    operation: 'create',
    auth: { uid: 'unregistered_uid', email: 'new@example.com', email_verified: true },
    docId: 'cv_orphan',
    payload: {
      id: 'cv_orphan',
      userId: 'unregistered_uid'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Immutable Field Tampering (createdAt / userId) on CV Update',
    collection: 'cvs',
    operation: 'update',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    docId: 'cv_1',
    payload: {
      userId: 'other_user',
      createdAt: 'TAMPERED_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    collection: 'cvs',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    docId: 'cv_1',
    payload: {
      id: 'cv_1',
      userId: 'user_1',
      createdAt: '1970-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Denial-of-Wallet Oversized String / ID Poisoning',
    collection: 'cvs',
    operation: 'create',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    docId: 'invalid$id!@#',
    payload: {
      id: 'invalid$id!@#',
      summary: 'A'.repeat(10000)
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Array Type Poisoning on CV Skills',
    collection: 'cvs',
    operation: 'update',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    docId: 'cv_1',
    payload: {
      skills: [12345, true]
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Unauthorized Template Modification by Non-Admin',
    collection: 'templates',
    operation: 'delete',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    docId: 'modern-atelier',
    expectedResult: 'PERMISSION_DENIED'
  }
];
