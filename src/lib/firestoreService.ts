import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  waitForPendingWrites,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  CVDocument,
  CVTemplate,
  UserProfile,
  PlanTier,
  PaymentPlan,
  PaymentAccountsConfig,
  PaymentProof
} from '../types/cv';
import {
  SEED_TEMPLATES,
  DEFAULT_PAYMENT_PLANS,
  DEFAULT_PAYMENT_ACCOUNTS
} from '../data/seedTemplates';

const ADMIN_EMAILS = ['ZulqarnainShah25@gmail.com', 'admin@ateliercv.com'];


function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed.slice(0, maxLen);
}

function sanitizeId(id: string, maxLen = 128): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : `id_${Date.now()}`;
}

export function sanitizeCVForFirestore(cv: CVDocument, uid: string) {
  const safeId = sanitizeId(cv.id, 128);
  const safeUserId = sanitizeId(uid, 128);
  const safeTemplateId = sanitizeId(cv.templateId || 'modern-atelier', 64);

  const experience = (Array.isArray(cv.experience) ? cv.experience : [])
    .slice(0, 25)
    .map((exp, idx) => ({
      id: clampStr(exp.id, 64, `exp_${idx}`),
      company: clampStr(exp.company, 120, 'Company'),
      role: clampStr(exp.role, 120, 'Role'),
      startDate: clampStr(exp.startDate, 40, ''),
      endDate: clampStr(exp.endDate, 40, ''),
      rawDescription: clampStr(exp.rawDescription, 1500, ''),
      bullets: (Array.isArray(exp.bullets) ? exp.bullets : [])
        .map((b) => clampStr(b, 500, ''))
        .filter(Boolean)
        .slice(0, 12)
    }));

  const education = (Array.isArray(cv.education) ? cv.education : [])
    .slice(0, 20)
    .map((edu, idx) => ({
      id: clampStr(edu.id, 64, `edu_${idx}`),
      degree: clampStr(edu.degree, 150, ''),
      majorSubject: clampStr(edu.majorSubject, 150, ''),
      institution: clampStr(edu.institution, 150, ''),
      year: clampStr(edu.year, 40, ''),
      details: clampStr(edu.details, 500, '')
    }));

  const skills = (Array.isArray(cv.skills) ? cv.skills : [])
    .map((s) => clampStr(s, 80, ''))
    .filter(Boolean)
    .slice(0, 60);

  const skillGroups = (Array.isArray(cv.skillGroups) ? cv.skillGroups : [])
    .slice(0, 15)
    .map((sg, idx) => ({
      id: clampStr(sg.id, 64, `sg_${idx}`),
      category: clampStr(sg.category, 80, 'Skills'),
      items: (Array.isArray(sg.items) ? sg.items : [])
        .map((i) => clampStr(i, 80, ''))
        .filter(Boolean)
        .slice(0, 25)
    }));

  const projects = (Array.isArray(cv.projects) ? cv.projects : [])
    .slice(0, 20)
    .map((proj, idx) => ({
      id: clampStr(proj.id, 64, `proj_${idx}`),
      name: clampStr(proj.name, 120, ''),
      roleOrTech: clampStr(proj.roleOrTech, 150, ''),
      link: clampStr(proj.link, 250, ''),
      description: clampStr(proj.description, 1000, '')
    }));

  const languages = (Array.isArray(cv.languages) ? cv.languages : [])
    .map((l) => clampStr(l, 60, ''))
    .filter(Boolean)
    .slice(0, 20);

  const certifications = (Array.isArray(cv.certifications) ? cv.certifications : [])
    .map((c) => clampStr(c, 150, ''))
    .filter(Boolean)
    .slice(0, 20);

  const references = (Array.isArray(cv.references) ? cv.references : [])
    .slice(0, 10)
    .map((refItem, idx) => ({
      id: clampStr(refItem.id, 64, `ref_${idx}`),
      name: clampStr(refItem.name, 120, ''),
      designation: clampStr(refItem.designation, 120, ''),
      company: clampStr(refItem.company, 120, ''),
      contact: clampStr(refItem.contact, 180, '')
    }));

  const removedFields = (Array.isArray(cv.removedFields) ? cv.removedFields : [])
    .map((f) => clampStr(f, 40, ''))
    .filter(Boolean) as CVDocument['removedFields'];

  return {
    id: safeId,
    userId: safeUserId,
    title: clampStr(cv.title || `${cv.fullName || 'Untitled'} CV`, 150, 'Untitled Professional CV'),
    templateId: safeTemplateId,
    fullName: clampStr(cv.fullName || 'Candidate Name', 120, 'Candidate Name'),
    jobTitle: clampStr(cv.jobTitle, 120, ''),
    email: clampStr(cv.email, 254, ''),
    phone: clampStr(cv.phone, 40, ''),
    address: clampStr(cv.address, 250, ''),
    linkedinUrl: clampStr(cv.linkedinUrl, 300, ''),
    portfolioUrl: clampStr(cv.portfolioUrl, 300, ''),
    photoDataUrl: clampStr(cv.photoDataUrl, 750000, ''),
    rawSummary: clampStr(cv.rawSummary, 4000, ''),
    summary: clampStr(cv.summary, 4000, ''),
    experience,
    education,
    skills,
    skillGroups,
    projects,
    languages,
    certifications,
    references,
    referencesOnRequest:
      cv.referencesOnRequest !== undefined ? Boolean(cv.referencesOnRequest) : true,
    removedFields,
    isPolished: Boolean(cv.isPolished)
  };
}

async function withDbTimeout<T>(promise: Promise<T>, ms = 1500, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch {
    clearTimeout(timer);
    return fallback;
  }
}

const LOCAL_PLANS_KEY = 'ateliercv_payment_plans';
const LOCAL_ACCOUNTS_KEY = 'ateliercv_payment_accounts';
const LOCAL_PROOFS_KEY = 'ateliercv_payment_requests_v2';
const LOCAL_USERS_DIR_KEY = 'ateliercv_users_directory_v1';
const LOCAL_ADMIN_TEMPLATES_KEY = 'ateliercv_admin_custom_templates_v1';
const LOCAL_DELETED_TEMPLATES_KEY = 'ateliercv_deleted_templates_v1';

function getLocalUsersDirectory(): Record<string, UserProfile> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_DIR_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveLocalUserInDirectory(profile: UserProfile) {
  try {
    const current = getLocalUsersDirectory();
    current[profile.uid] = profile;
    localStorage.setItem(LOCAL_USERS_DIR_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export function getLocalPaymentPlans(): PaymentPlan[] {
  try {
    const raw = localStorage.getItem(LOCAL_PLANS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_PAYMENT_PLANS;
}

export function saveLocalPaymentPlans(plans: PaymentPlan[]) {
  try {
    localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans));
    window.dispatchEvent(new CustomEvent('ateliercv-plans-updated', { detail: plans }));
  } catch {
    // ignore
  }
}

export function getLocalPaymentAccounts(): PaymentAccountsConfig {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_PAYMENT_ACCOUNTS;
}

export function saveLocalPaymentAccounts(accounts: PaymentAccountsConfig) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent('ateliercv-accounts-updated', { detail: accounts }));
  } catch {
    // ignore
  }
}

export function getLocalPaymentProofs(): PaymentProof[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROOFS_KEY) || localStorage.getItem('ateliercv_payment_proofs');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export function saveLocalPaymentProofs(proofs: PaymentProof[]) {
  try {
    localStorage.setItem(LOCAL_PROOFS_KEY, JSON.stringify(proofs));
    window.dispatchEvent(new CustomEvent('ateliercv-payment-requests-updated', { detail: proofs }));
  } catch {
    // ignore
  }
}

export function computePlanLimits(plan: PlanTier, customPdfLimit?: number, customWordLimit?: number) {
  const pdfLimit =
    typeof customPdfLimit === 'number'
      ? customPdfLimit
      : plan === 'starter' || plan === 'pro'
      ? 10
      : plan === 'unlimited' || plan === 'premium'
      ? 999999
      : 1;

  const wordLimit =
    typeof customWordLimit === 'number'
      ? customWordLimit
      : plan === 'starter'
      ? 2
      : plan === 'pro'
      ? 10
      : plan === 'unlimited' || plan === 'premium'
      ? 999999
      : 0;

  return { pdfLimit, wordLimit };
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string
): Promise<UserProfile> {
  const safeUid = sanitizeId(uid, 128);
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);

  const isBootstrappedAdminEmail = ADMIN_EMAILS.some(
    (adm) => adm.toLowerCase() === (email || '').toLowerCase()
  );

  // Check if we already have a locally saved override for this user (e.g., changed from Admin Panel)
  const localDir = getLocalUsersDirectory();
  const localExisting = localDir[safeUid];

  const initialPlan: PlanTier = localExisting?.plan || 'free';
  const initialLimits = computePlanLimits(
    initialPlan,
    localExisting?.pdfLimit,
    localExisting?.wordLimit
  );

  const fallbackProfile: UserProfile = {
    uid: safeUid,
    email: clampStr(email || localExisting?.email || 'user@example.com', 254, 'user@example.com'),
    displayName: clampStr(
      displayName || localExisting?.displayName || email.split('@')[0] || 'User',
      120,
      'User'
    ),
    role: isBootstrappedAdminEmail || localExisting?.role === 'admin' ? 'admin' : 'user',
    plan: initialPlan,
    pdfExportsUsed: localExisting?.pdfExportsUsed ?? 0,
    wordExportsUsed: localExisting?.wordExportsUsed ?? 0,
    pdfLimit: initialLimits.pdfLimit,
    wordLimit: initialLimits.wordLimit,
    ...(localExisting?.planNotification ? { planNotification: localExisting.planNotification } : {})
  };

  saveLocalUserInDirectory(fallbackProfile);

  try {
    return await withDbTimeout(
      (async () => {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const role = isBootstrappedAdminEmail || data.role === 'admin' ? 'admin' : 'user';
          // Respect the plan saved in Firestore (or local admin override if newer)
          const plan: PlanTier = (data.plan as PlanTier) || localExisting?.plan || 'free';
          const { pdfLimit, wordLimit } = computePlanLimits(plan, data.pdfLimit, data.wordLimit);

          const resolvedProfile: UserProfile = {
            uid: data.uid || safeUid,
            email: data.email || fallbackProfile.email,
            displayName: data.displayName || fallbackProfile.displayName,
            role,
            plan,
            pdfExportsUsed: typeof data.pdfExportsUsed === 'number' ? data.pdfExportsUsed : 0,
            wordExportsUsed: typeof data.wordExportsUsed === 'number' ? data.wordExportsUsed : 0,
            pdfLimit,
            wordLimit,
            ...(typeof data.planNotification === 'string' && data.planNotification
              ? { planNotification: data.planNotification }
              : {})
          };
          saveLocalUserInDirectory(resolvedProfile);
          return resolvedProfile;
        }

        await setDoc(userRef, {
          uid: fallbackProfile.uid,
          email: fallbackProfile.email,
          displayName: fallbackProfile.displayName,
          role: fallbackProfile.role,
          plan: fallbackProfile.plan,
          pdfExportsUsed: fallbackProfile.pdfExportsUsed,
          wordExportsUsed: fallbackProfile.wordExportsUsed,
          pdfLimit: fallbackProfile.pdfLimit,
          wordLimit: fallbackProfile.wordLimit,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        return fallbackProfile;
      })(),
      1500,
      fallbackProfile
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    return fallbackProfile;
  }
}

export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile) => void
): () => void {
  const safeUid = sanitizeId(uid, 128);
  const userRef = doc(db, 'users', safeUid);

  const unsubFirestore = onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const isBootstrappedAdminEmail = ADMIN_EMAILS.some(
          (adm) => adm.toLowerCase() === (data.email || '').toLowerCase()
        );
        const role = isBootstrappedAdminEmail || data.role === 'admin' ? 'admin' : 'user';
        // Always respect the exact plan stored in Firestore!
        const plan: PlanTier = (data.plan as PlanTier) || 'free';
        const { pdfLimit, wordLimit } = computePlanLimits(plan, data.pdfLimit, data.wordLimit);

        const profile: UserProfile = {
          uid: data.uid || safeUid,
          email: data.email || 'user@example.com',
          displayName: data.displayName || 'User',
          role,
          plan,
          pdfExportsUsed: typeof data.pdfExportsUsed === 'number' ? data.pdfExportsUsed : 0,
          wordExportsUsed: typeof data.wordExportsUsed === 'number' ? data.wordExportsUsed : 0,
          pdfLimit,
          wordLimit,
          ...(typeof data.planNotification === 'string' && data.planNotification
            ? { planNotification: data.planNotification }
            : {})
        };
        saveLocalUserInDirectory(profile);
        onUpdate(profile);
      }
    },
    () => {
      // Ignore if offline
    }
  );

  const handleLocalPlanEvent = (e: Event) => {
    const custom = e as CustomEvent<Partial<UserProfile> & { uid: string }>;
    if (custom.detail && custom.detail.uid === safeUid) {
      const localDir = getLocalUsersDirectory();
      const updated = localDir[safeUid];
      if (updated) {
        onUpdate(updated);
      }
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_USERS_DIR_KEY) {
      const localDir = getLocalUsersDirectory();
      const updated = localDir[safeUid];
      if (updated) {
        onUpdate(updated);
      }
    }
  };

  window.addEventListener('ateliercv-user-plan-updated', handleLocalPlanEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    unsubFirestore();
    window.removeEventListener('ateliercv-user-plan-updated', handleLocalPlanEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

export async function incrementUserPdfExportCount(uid: string, currentCount: number): Promise<number> {
  const safeUid = sanitizeId(uid, 128);
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);
  const nextCount = currentCount + 1;

  const localDir = getLocalUsersDirectory();
  if (localDir[safeUid]) {
    saveLocalUserInDirectory({ ...localDir[safeUid], pdfExportsUsed: nextCount });
  }

  try {
    const snap = await getDoc(userRef);
    const displayName = snap.exists() ? snap.data().displayName : 'User';
    await updateDoc(userRef, {
      displayName: clampStr(displayName, 120, 'User'),
      pdfExportsUsed: nextCount,
      updatedAt: serverTimestamp()
    });
    return nextCount;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return nextCount;
  }
}

export async function incrementUserWordExportCount(uid: string, currentCount: number): Promise<number> {
  const safeUid = sanitizeId(uid, 128);
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);
  const nextCount = currentCount + 1;

  const localDir = getLocalUsersDirectory();
  if (localDir[safeUid]) {
    saveLocalUserInDirectory({ ...localDir[safeUid], wordExportsUsed: nextCount });
  }

  try {
    const snap = await getDoc(userRef);
    const displayName = snap.exists() ? snap.data().displayName : 'User';
    await updateDoc(userRef, {
      displayName: clampStr(displayName, 120, 'User'),
      wordExportsUsed: nextCount,
      updatedAt: serverTimestamp()
    });
    return nextCount;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return nextCount;
  }
}

/**
 * Updates a user's plan and export quotas in Firestore (`users` collection)
 * and broadcasts the update immediately across the entire app and Admin Panel.
 */
export async function updateUserPlanInFirestore(
  uid: string,
  plan: PlanTier,
  pdfLimit?: number,
  wordLimit?: number,
  planNotification?: string
): Promise<UserProfile> {
  const safeUid = sanitizeId(uid, 128);
  const userRef = doc(db, 'users', safeUid);
  const { pdfLimit: calculatedPdfLimit, wordLimit: calculatedWordLimit } = computePlanLimits(
    plan,
    pdfLimit,
    wordLimit
  );

  // Update local user directory immediately for 0ms UI feedback
  const localDir = getLocalUsersDirectory();
  const existingLocal = localDir[safeUid];
  const updatedLocalProfile: UserProfile = {
    uid: safeUid,
    email: existingLocal?.email || 'user@example.com',
    displayName: existingLocal?.displayName || 'User',
    role: existingLocal?.role || 'user',
    plan,
    pdfExportsUsed: plan === 'free' ? 0 : (existingLocal?.pdfExportsUsed ?? 0),
    wordExportsUsed: plan === 'free' ? 0 : (existingLocal?.wordExportsUsed ?? 0),
    pdfLimit: calculatedPdfLimit,
    wordLimit: calculatedWordLimit,
    ...(planNotification ? { planNotification } : {})
  };
  saveLocalUserInDirectory(updatedLocalProfile);

  window.dispatchEvent(
    new CustomEvent('ateliercv-user-plan-updated', {
      detail: updatedLocalProfile
    })
  );

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const existingData = snap.data();
      const updatePayload: Record<string, unknown> = {
        plan,
        pdfLimit: calculatedPdfLimit,
        wordLimit: calculatedWordLimit,
        updatedAt: serverTimestamp()
      };
      if (plan === 'free') {
        updatePayload.pdfExportsUsed = 0;
        updatePayload.wordExportsUsed = 0;
      }
      if (planNotification !== undefined) {
        updatePayload.planNotification = planNotification;
      }
      await updateDoc(userRef, updatePayload);
      const merged: UserProfile = {
        ...updatedLocalProfile,
        email: existingData.email || updatedLocalProfile.email,
        displayName: existingData.displayName || updatedLocalProfile.displayName,
        role: existingData.role || updatedLocalProfile.role
      };
      saveLocalUserInDirectory(merged);
      return merged;
    } else {
      await setDoc(userRef, {
        uid: safeUid,
        email: updatedLocalProfile.email,
        displayName: updatedLocalProfile.displayName,
        role: updatedLocalProfile.role,
        plan,
        pdfExportsUsed: 0,
        wordExportsUsed: 0,
        pdfLimit: calculatedPdfLimit,
        wordLimit: calculatedWordLimit,
        ...(planNotification ? { planNotification } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch {
    // Fallback local state already updated and broadcasted
  }

  return updatedLocalProfile;
}

export async function updateUserPlanAndQuota(
  uid: string,
  plan: PlanTier,
  pdfLimit?: number,
  wordLimit?: number
): Promise<void> {
  await updateUserPlanInFirestore(uid, plan, pdfLimit, wordLimit);
}

export async function upgradeUserPlanToPremium(uid: string): Promise<void> {
  await updateUserPlanInFirestore(
    uid,
    'premium',
    999999,
    999999,
    'Mubarak! Aap ka account Premium Plan mein upgrade ho chuka hai!'
  );
}

// Payment Plans Management
export async function fetchPaymentPlans(): Promise<PaymentPlan[]> {
  try {
    const ref = doc(db, 'settings', 'payment_plans');
    const snap = await withDbTimeout(getDoc(ref), 1500, null);
    if (snap && snap.exists() && Array.isArray(snap.data()?.plans)) {
      const plans = snap.data()?.plans as PaymentPlan[];
      saveLocalPaymentPlans(plans);
      return plans;
    }
  } catch {
    // fallback
  }
  return getLocalPaymentPlans();
}

export function subscribeToPaymentPlans(onUpdate: (plans: PaymentPlan[]) => void): () => void {
  const ref = doc(db, 'settings', 'payment_plans');
  const unsub = onSnapshot(
    ref,
    (snap) => {
      if (snap.exists() && Array.isArray(snap.data()?.plans)) {
        const plans = snap.data()?.plans as PaymentPlan[];
        try {
          localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans));
        } catch {
          // ignore
        }
        onUpdate(plans);
      }
    },
    () => {}
  );

  const handleLocal = (e: Event) => {
    const custom = e as CustomEvent<PaymentPlan[]>;
    if (custom.detail) onUpdate(custom.detail);
  };
  window.addEventListener('ateliercv-plans-updated', handleLocal);
  return () => {
    unsub();
    window.removeEventListener('ateliercv-plans-updated', handleLocal);
  };
}

export async function savePaymentPlans(plans: PaymentPlan[]): Promise<void> {
  saveLocalPaymentPlans(plans);
  try {
    const ref = doc(db, 'settings', 'payment_plans');
    await setDoc(ref, {
      plans,
      updatedAt: serverTimestamp()
    });
  } catch {
    // ignore
  }
}

// Payment Receiving Accounts Config
export async function fetchPaymentAccounts(): Promise<PaymentAccountsConfig> {
  try {
    const ref = doc(db, 'settings', 'payment_accounts');
    const snap = await withDbTimeout(getDoc(ref), 1500, null);
    if (snap && snap.exists()) {
      const data = snap.data() as PaymentAccountsConfig;
      saveLocalPaymentAccounts(data);
      return data;
    }
  } catch {
    // fallback
  }
  return getLocalPaymentAccounts();
}

export function subscribeToPaymentAccounts(
  onUpdate: (accounts: PaymentAccountsConfig) => void
): () => void {
  const ref = doc(db, 'settings', 'payment_accounts');
  const unsub = onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PaymentAccountsConfig;
        try {
          localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(data));
        } catch {
          // ignore
        }
        onUpdate(data);
      }
    },
    () => {}
  );

  const handleLocal = (e: Event) => {
    const custom = e as CustomEvent<PaymentAccountsConfig>;
    if (custom.detail) onUpdate(custom.detail);
  };
  window.addEventListener('ateliercv-accounts-updated', handleLocal);
  return () => {
    unsub();
    window.removeEventListener('ateliercv-accounts-updated', handleLocal);
  };
}

export async function savePaymentAccounts(accounts: PaymentAccountsConfig): Promise<void> {
  saveLocalPaymentAccounts(accounts);
  try {
    const ref = doc(db, 'settings', 'payment_accounts');
    await setDoc(ref, {
      ...accounts,
      updatedAt: serverTimestamp()
    });
  } catch {
    // ignore
  }
}

// Manual Payment Approval Flow (`payment_requests` collection in Firestore)
export async function submitPaymentProof(
  proof: Omit<PaymentProof, 'id' | 'createdAt' | 'status'>
): Promise<PaymentProof> {
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const newProof: PaymentProof = {
    ...proof,
    id,
    status: 'pending',
    createdAt: nowIso
  };

  const currentLocal = getLocalPaymentProofs();
  saveLocalPaymentProofs([newProof, ...currentLocal]);

  // Also ensure the user is registered in local users directory so Admin sees them in User Directory
  const localDir = getLocalUsersDirectory();
  if (!localDir[proof.userId]) {
    saveLocalUserInDirectory({
      uid: proof.userId,
      email: proof.userEmail,
      displayName: proof.userName || proof.senderName || 'User',
      role: 'user',
      plan: 'free',
      pdfExportsUsed: 0,
      wordExportsUsed: 0,
      pdfLimit: 1,
      wordLimit: 0
    });
  }

  try {
    // Primary collection: `payment_requests` (as required by spec)
    const reqRef = doc(db, 'payment_requests', id);
    await setDoc(reqRef, {
      ...newProof,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  } catch {
    // Saved locally if offline
  }

  try {
    // Mirror to `payment_proofs` for backward compatibility
    const proofRef = doc(db, 'payment_proofs', id);
    await setDoc(proofRef, {
      ...newProof,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  } catch {
    // ignore
  }

  return newProof;
}

function normalizeFirestoreProofDoc(raw: Record<string, any>): PaymentProof {
  let createdStr = new Date().toISOString();
  if (typeof raw.createdAt === 'string') {
    createdStr = raw.createdAt;
  } else if (raw.createdAt && typeof raw.createdAt.toDate === 'function') {
    createdStr = raw.createdAt.toDate().toISOString();
  }
  return {
    id: String(raw.id || `req_${Date.now()}`),
    userId: String(raw.userId || ''),
    userEmail: String(raw.userEmail || ''),
    userName: String(raw.userName || raw.senderName || 'User'),
    planId: (raw.planId as 'starter' | 'pro' | 'unlimited') || 'pro',
    planName: String(raw.planName || 'Premium Plan'),
    amountPkr: Number(raw.amountPkr) || 500,
    method: raw.method === 'bank' ? 'bank' : 'easypaisa',
    senderName: String(raw.senderName || raw.userName || 'User'),
    senderPhone: String(raw.senderPhone || ''),
    trxId: String(raw.trxId || ''),
    notes: String(raw.notes || ''),
    status:
      raw.status === 'approved'
        ? 'approved'
        : raw.status === 'rejected'
        ? 'rejected'
        : 'pending',
    adminNotes: String(raw.adminNotes || ''),
    createdAt: createdStr
  };
}

export async function fetchAllPaymentProofs(): Promise<PaymentProof[]> {
  const map = new Map<string, PaymentProof>();
  getLocalPaymentProofs().forEach((p) => {
    if (p && p.id) map.set(p.id, p);
  });

  try {
    const [reqSnap, proofSnap] = await Promise.all([
      withDbTimeout(getDocs(collection(db, 'payment_requests')), 1500, null),
      withDbTimeout(getDocs(collection(db, 'payment_proofs')), 1500, null)
    ]);

    if (proofSnap) {
      proofSnap.forEach((d) => {
        const item = normalizeFirestoreProofDoc(d.data());
        map.set(item.id, item);
      });
    }
    if (reqSnap) {
      reqSnap.forEach((d) => {
        const item = normalizeFirestoreProofDoc(d.data());
        map.set(item.id, item);
      });
    }
  } catch {
    // fallback to local
  }

  const combined = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  saveLocalPaymentProofs(combined);
  return combined;
}

export function subscribeToPaymentRequests(
  onUpdate: (requests: PaymentProof[]) => void
): () => void {
  const unsub = onSnapshot(
    collection(db, 'payment_requests'),
    (snap) => {
      const map = new Map<string, PaymentProof>();
      getLocalPaymentProofs().forEach((p) => {
        if (p && p.id) map.set(p.id, p);
      });
      snap.forEach((d) => {
        const item = normalizeFirestoreProofDoc(d.data());
        map.set(item.id, item);
      });
      const sorted = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      try {
        localStorage.setItem(LOCAL_PROOFS_KEY, JSON.stringify(sorted));
      } catch {
        // ignore
      }
      onUpdate(sorted);
    },
    () => {}
  );

  const handleLocal = (e: Event) => {
    const custom = e as CustomEvent<PaymentProof[]>;
    if (custom.detail) onUpdate(custom.detail);
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_PROOFS_KEY) {
      onUpdate(getLocalPaymentProofs());
    }
  };
  window.addEventListener('ateliercv-payment-requests-updated', handleLocal);
  window.addEventListener('storage', handleStorage);

  return () => {
    unsub();
    window.removeEventListener('ateliercv-payment-requests-updated', handleLocal);
    window.removeEventListener('storage', handleStorage);
  };
}

export async function updatePaymentProofStatus(
  proofId: string,
  status: 'approved' | 'rejected',
  adminNotes?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const current = getLocalPaymentProofs().map((p) =>
    p.id === proofId ? { ...p, status, adminNotes, updatedAt: nowIso } : p
  );
  saveLocalPaymentProofs(current);

  try {
    const reqRef = doc(db, 'payment_requests', proofId);
    await updateDoc(reqRef, {
      status,
      adminNotes: adminNotes || '',
      updatedAt: nowIso
    });
  } catch {
    // ignore if doc only in payment_proofs
  }

  try {
    const proofRef = doc(db, 'payment_proofs', proofId);
    await updateDoc(proofRef, {
      status,
      adminNotes: adminNotes || '',
      updatedAt: nowIso
    });
  } catch {
    // ignore
  }
}

export async function saveCVToFirestore(cv: CVDocument, uid: string): Promise<CVDocument> {
  const sanitized = sanitizeCVForFirestore(cv, uid);
  const cvRef = doc(db, 'cvs', sanitized.id);

  try {
    const existingSnap = await getDoc(cvRef);
    if (!existingSnap.exists()) {
      await setDoc(cvRef, {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const { id: _id, userId: _userId, ...updatableFields } = sanitized;
      await updateDoc(cvRef, {
        ...updatableFields,
        updatedAt: serverTimestamp()
      });
    }
    return { ...cv, id: sanitized.id, userId: sanitized.userId };
  } catch {
    // Return sanitized local document even if offline
    return { ...cv, id: sanitized.id, userId: sanitized.userId };
  }
}

export async function flushPendingSyncAndSave(cv: CVDocument, uid: string): Promise<boolean> {
  try {
    await saveCVToFirestore(cv, uid);
    await Promise.race([
      waitForPendingWrites(db),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 1000))
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function fetchUserCVs(uid: string): Promise<CVDocument[]> {
  try {
    return await withDbTimeout(
      (async () => {
        const q = query(collection(db, 'cvs'), where('userId', '==', uid));
        const snap = await getDocs(q);
        const list: CVDocument[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as CVDocument);
        });
        return list;
      })(),
      1500,
      []
    );
  } catch {
    return [];
  }
}

export async function deleteCVFromFirestore(cvId: string): Promise<void> {
  const path = `cvs/${cvId}`;
  try {
    await withDbTimeout(deleteDoc(doc(db, 'cvs', cvId)), 1500, undefined);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

function getLocalCustomTemplates(): CVTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalCustomTemplates(list: CVTemplate[]): void {
  try {
    localStorage.setItem(LOCAL_ADMIN_TEMPLATES_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

function getLocalDeletedTemplateIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalDeletedTemplateIds(ids: string[]): void {
  try {
    localStorage.setItem(LOCAL_DELETED_TEMPLATES_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function mergeTemplatesWithOverrides(firestoreList: CVTemplate[]): CVTemplate[] {
  const deletedSet = new Set(getLocalDeletedTemplateIds());
  const map = new Map<string, CVTemplate>();
  const seedMap = new Map<string, CVTemplate>();

  // 1. Seed defaults (excluding any deleted by Admin)
  SEED_TEMPLATES.forEach((t) => {
    seedMap.set(t.id, t);
    if (!deletedSet.has(t.id)) {
      map.set(t.id, t);
    }
  });

  const applyOverride = (tpl: CVTemplate) => {
    if (!tpl || !tpl.id || deletedSet.has(tpl.id)) return;
    const seedTpl = seedMap.get(tpl.id);
    if (seedTpl) {
      // Preserve Admin's Free/Premium toggle on built-in templates while keeping exact PNG design fidelity
      map.set(tpl.id, {
        ...seedTpl,
        isPremium: typeof tpl.isPremium === 'boolean' ? tpl.isPremium : seedTpl.isPremium
      });
    } else {
      map.set(tpl.id, tpl);
    }
  };

  // 2. Firestore `templates` collection overrides seed templates & adds new ones
  firestoreList.forEach(applyOverride);

  // 3. Local Admin edits/additions override so edits are instant even before Firestore roundtrip
  const localList = getLocalCustomTemplates();
  localList.forEach(applyOverride);

  return Array.from(map.values());
}

export async function fetchTemplatesFromFirestore(): Promise<CVTemplate[]> {
  try {
    return await withDbTimeout(
      (async () => {
        const snap = await getDocs(collection(db, 'templates'));
        const firestoreList: CVTemplate[] = [];
        snap.forEach((d) => {
          const tpl = d.data() as CVTemplate;
          if (tpl && tpl.id) firestoreList.push(tpl);
        });
        return mergeTemplatesWithOverrides(firestoreList);
      })(),
      1500,
      mergeTemplatesWithOverrides([])
    );
  } catch {
    return mergeTemplatesWithOverrides([]);
  }
}

/**
 * Real-time subscription to Firestore `templates` collection + local admin events
 * so any template added, edited, or deleted in Admin Panel immediately updates CV Form & Live Editor.
 */
export function subscribeToTemplatesInFirestore(
  onUpdate: (templates: CVTemplate[]) => void
): () => void {
  let latestFirestoreList: CVTemplate[] = [];

  const unsubFirestore = onSnapshot(
    collection(db, 'templates'),
    (snap) => {
      const list: CVTemplate[] = [];
      snap.forEach((d) => {
        const tpl = d.data() as CVTemplate;
        if (tpl && tpl.id) list.push(tpl);
      });
      latestFirestoreList = list;
      onUpdate(mergeTemplatesWithOverrides(latestFirestoreList));
    },
    () => {
      onUpdate(mergeTemplatesWithOverrides(latestFirestoreList));
    }
  );

  const handleLocalTemplatesEvent = () => {
    onUpdate(mergeTemplatesWithOverrides(latestFirestoreList));
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (
      e.key === LOCAL_ADMIN_TEMPLATES_KEY ||
      e.key === LOCAL_DELETED_TEMPLATES_KEY
    ) {
      onUpdate(mergeTemplatesWithOverrides(latestFirestoreList));
    }
  };

  window.addEventListener('ateliercv-templates-updated', handleLocalTemplatesEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    unsubFirestore();
    window.removeEventListener('ateliercv-templates-updated', handleLocalTemplatesEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

export async function saveTemplateToFirestore(template: CVTemplate): Promise<void> {
  const safeId = sanitizeId(template.id, 64);
  const ref = doc(db, 'templates', safeId);

  const payload: CVTemplate = {
    id: safeId,
    name: clampStr(template.name, 80, 'Custom Template'),
    category: template.category || 'Modern',
    description: clampStr(template.description, 300, 'Professional CV layout'),
    isPremium: Boolean(template.isPremium),
    accentColor: clampStr(template.accentColor, 32, '#0F172A'),
    secondaryColor: clampStr(template.secondaryColor, 32, '#334155'),
    fontFamily: clampStr(template.fontFamily, 80, 'Plus Jakarta Sans'),
    layoutType: template.layoutType || 'two-column-left',
    photoSlot: {
      position: clampStr(
        template.photoSlot?.position || 'top-right',
        32,
        'top-right'
      ) as CVTemplate['photoSlot']['position'],
      widthMm: Math.min(60, Math.max(20, Math.round(template.photoSlot?.widthMm || 35))),
      heightMm: Math.min(80, Math.max(25, Math.round(template.photoSlot?.heightMm || 45))),
      borderRadius: clampStr(template.photoSlot?.borderRadius || '6px', 24, '6px'),
      showBorder:
        template.photoSlot?.showBorder !== undefined ? Boolean(template.photoSlot.showBorder) : true
    },
    customCss: clampStr(template.customCss || '', 5000, ''),
    thumbnailType: clampStr(template.thumbnailType || 'modern-two-col', 64, 'modern-two-col')
  };

  // Un-mark from deleted if re-added
  const deletedIds = getLocalDeletedTemplateIds().filter((id) => id !== safeId);
  saveLocalDeletedTemplateIds(deletedIds);

  // Persist in local cache & broadcast immediately
  const localCurrent = getLocalCustomTemplates().filter((t) => t.id !== safeId);
  saveLocalCustomTemplates([...localCurrent, payload]);
  window.dispatchEvent(new CustomEvent('ateliercv-templates-updated'));

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const { id: _id, ...updatable } = payload;
      await updateDoc(ref, {
        ...updatable,
        updatedAt: serverTimestamp()
      });
    }
  } catch {
    // Local cache & broadcast already applied
  }
}

export async function deleteTemplateFromFirestore(templateId: string): Promise<void> {
  const localCurrent = getLocalCustomTemplates().filter((t) => t.id !== templateId);
  saveLocalCustomTemplates(localCurrent);

  const deletedIds = Array.from(new Set([...getLocalDeletedTemplateIds(), templateId]));
  saveLocalDeletedTemplateIds(deletedIds);
  window.dispatchEvent(new CustomEvent('ateliercv-templates-updated'));

  try {
    await deleteDoc(doc(db, 'templates', templateId));
  } catch {
    // Ignore if offline or demo admin
  }
}

export async function seedDefaultTemplatesInFirestore(): Promise<void> {
  saveLocalDeletedTemplateIds([]);
  saveLocalCustomTemplates([]);
  window.dispatchEvent(new CustomEvent('ateliercv-templates-updated'));
  for (const tpl of SEED_TEMPLATES) {
    await saveTemplateToFirestore(tpl);
  }
}

export async function fetchAllUsersForAdmin(): Promise<UserProfile[]> {
  const map = new Map<string, UserProfile>();

  // 1. Include any locally cached users
  const localDir = getLocalUsersDirectory();
  Object.values(localDir).forEach((u) => {
    if (u && u.uid) map.set(u.uid, u);
  });

  // 2. Include any users who submitted payment requests
  getLocalPaymentProofs().forEach((req) => {
    if (req.userId && !map.has(req.userId)) {
      map.set(req.userId, {
        uid: req.userId,
        email: req.userEmail,
        displayName: req.userName || req.senderName || 'User',
        role: 'user',
        plan: req.status === 'approved' ? 'premium' : 'free',
        pdfExportsUsed: 0,
        wordExportsUsed: 0,
        pdfLimit: req.status === 'approved' ? 999999 : 1,
        wordLimit: req.status === 'approved' ? 999999 : 0
      });
    }
  });

  // 3. Query Firestore `users` collection
  try {
    const snap = await withDbTimeout(getDocs(collection(db, 'users')), 1800, null);
    if (snap) {
      snap.forEach((d) => {
        const data = d.data();
        const uid = data.uid || d.id;
        const plan = (data.plan as PlanTier) || localDir[uid]?.plan || 'free';
        const { pdfLimit, wordLimit } = computePlanLimits(plan, data.pdfLimit, data.wordLimit);
        const userObj: UserProfile = {
          uid,
          email: data.email || 'user@example.com',
          displayName: data.displayName || 'User',
          role: data.role === 'admin' ? 'admin' : 'user',
          plan,
          pdfExportsUsed: typeof data.pdfExportsUsed === 'number' ? data.pdfExportsUsed : 0,
          wordExportsUsed: typeof data.wordExportsUsed === 'number' ? data.wordExportsUsed : 0,
          pdfLimit,
          wordLimit
        };
        map.set(uid, userObj);
        saveLocalUserInDirectory(userObj);
      });
    }
  } catch {
    // Fallback to local users directory
  }

  return Array.from(map.values());
}

export async function fetchAllCVsForAdmin(): Promise<CVDocument[]> {
  try {
    const snap = await withDbTimeout(getDocs(collection(db, 'cvs')), 1800, null);
    if (snap) {
      const list: CVDocument[] = [];
      snap.forEach((d) => list.push(d.data() as CVDocument));
      return list;
    }
  } catch {
    // Ignore if offline
  }
  return [];
}



