import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, FALLBACK_AUTH_STORAGE_KEY } from './lib/firebase';
import {
  ensureUserProfile,
  fetchUserCVs,
  saveCVToFirestore,
  deleteCVFromFirestore,
  fetchTemplatesFromFirestore,
  flushPendingSyncAndSave,
  incrementUserPdfExportCount,
  incrementUserWordExportCount,
  upgradeUserPlanToPremium,
  submitPaymentProof,
  fetchPaymentPlans,
  fetchPaymentAccounts,
  updateUserPlanAndQuota,
  subscribeToUserProfile,
  subscribeToTemplatesInFirestore,
  subscribeToPaymentPlans,
  subscribeToPaymentAccounts
} from './lib/firestoreService';
import {
  SEED_TEMPLATES,
  DEMO_ADMIN_USER,
  DEFAULT_PAYMENT_PLANS,
  DEFAULT_PAYMENT_ACCOUNTS,
  createEmptyCV,
  createSampleCV
} from './data/seedTemplates';
import {
  CVDocument,
  CVTemplate,
  SyncStatus,
  UserProfile,
  PaymentPlan,
  PaymentAccountsConfig,
  PlanTier
} from './types/cv';
import { AuthScreen } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { CVFormWorkspace } from './components/CVFormWorkspace';
import { PreviewEditorStudio } from './components/PreviewEditorStudio';
import { AdminPanel } from './components/AdminPanel';
import { AdminLoginModal } from './components/AdminLoginModal';
import { PaywallModal } from './components/PaywallModal';
import { WelcomeUpgradeModal } from './components/WelcomeUpgradeModal';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Sun,
  Moon,
  KeyRound,
  Sparkles
} from 'lucide-react';
import {
  cleanCVDocumentText,
  stripSampleResidue,
  expandRawDutiesToProfessionalBullets,
  rewriteRawSummaryToEnglish
} from './lib/textSanitizer';
import {
  DEFAULT_PORTAL_URL,
  DEFAULT_LOGOUT_REDIRECT,
  PORTAL_URL_STORAGE_KEY,
  LOGOUT_REDIRECT_STORAGE_KEY,
  parseAndSavePortalQueryParams,
  getMainPortalUrl,
  getLogoutRedirectUrl
} from './lib/portalIntegration';

type AppTab = 'dashboard' | 'form' | 'preview' | 'admin';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error';
}

const THEME_STORAGE_KEY = 'ateliercv_theme';
const DRAFT_STORAGE_PREFIX = 'ateliercv_v5_draft_';
const CV_STORAGE_PREFIX = 'ateliercv_v5_cv_';
export const CURRENT_APP_VERSION = '1.0.0';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  const [ssoPrefill] = useState<{ email: string; name: string; uid: string | null }>(() => {
    if (typeof window === 'undefined') {
      return { email: '', name: '', uid: null };
    }
    const parsed = parseAndSavePortalQueryParams(window.location.search);
    if (parsed.ssoEmail) {
      try {
        const existingFallback = localStorage.getItem(FALLBACK_AUTH_STORAGE_KEY);
        if (!existingFallback) {
          const ssoSessionData = {
            uid: parsed.ssoUid || `sso_${parsed.ssoEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            email: parsed.ssoEmail,
            displayName: parsed.ssoName || parsed.ssoEmail.split('@')[0] || 'User'
          };
          localStorage.setItem(FALLBACK_AUTH_STORAGE_KEY, JSON.stringify(ssoSessionData));
        }
      } catch {
        // Ignore storage errors
      }
    }
    return {
      email: parsed.ssoEmail || '',
      name: parsed.ssoName || '',
      uid: parsed.ssoUid
    };
  });

  // Purge legacy v3/v4 cached sample drafts so old Areeba Khan data never leaks into new sessions
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('ateliercv_v3_') || key.startsWith('ateliercv_v4_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLocalSession, setIsLocalSession] = useState(false);

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    if (p.includes('/admin') || h.includes('admin')) {
      return 'admin';
    }
    return 'form';
  });

  const [templates, setTemplates] = useState<CVTemplate[]>(SEED_TEMPLATES);
  const [savedCVs, setSavedCVs] = useState<CVDocument[]>([]);
  const [currentCV, setCurrentCV] = useState<CVDocument>(() =>
    cleanCVDocumentText(createEmptyCV('guest'))
  );

  const [isBuildingAI, setIsBuildingAI] = useState(false);
  const [draftSavedTimestamp, setDraftSavedTimestamp] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [activatedPlanCelebration, setActivatedPlanCelebration] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Admin Security & Payment Plans State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ateliercv_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);

  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>(DEFAULT_PAYMENT_PLANS);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountsConfig>(
    DEFAULT_PAYMENT_ACCOUNTS
  );

  // Refs for debounced localStorage save & 7s Firestore sync
  const debounceTimerRef = useRef<number | null>(null);
  const dirtyForFirestoreRef = useRef<boolean>(false);
  const latestCVRef = useRef<CVDocument>(currentCV);
  latestCVRef.current = currentCV;

  const notify = useCallback(
    (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  // Sync URL with /admin or /
  const navigateToTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    try {
      if (tab === 'admin') {
        window.history.pushState({}, '', '/admin');
      } else if (window.location.pathname.toLowerCase().includes('/admin')) {
        window.history.pushState({}, '', '/');
      }
    } catch {
      // Ignore history API restrictions in sandboxes
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('/admin')) {
        setActiveTab('admin');
      } else if (activeTab === 'admin') {
        setActiveTab('form');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  const refreshTemplates = useCallback(async () => {
    const loaded = await fetchTemplatesFromFirestore();
    setTemplates(loaded);
  }, []);

  // Global Real-Time Sync for Templates, Payment Plans, and Accounts from Firestore
  useEffect(() => {
    refreshTemplates();
    fetchPaymentPlans().then(setPaymentPlans);
    fetchPaymentAccounts().then(setPaymentAccounts);

    const unsubTemplates = subscribeToTemplatesInFirestore((liveTemplates) => {
      setTemplates(liveTemplates);
    });
    const unsubPlans = subscribeToPaymentPlans((livePlans) => {
      setPaymentPlans(livePlans);
    });
    const unsubAccounts = subscribeToPaymentAccounts((liveAccounts) => {
      setPaymentAccounts(liveAccounts);
    });

    return () => {
      unsubTemplates();
      unsubPlans();
      unsubAccounts();
    };
  }, [refreshTemplates]);

  useEffect(() => {
    const createInitialBlankCVForUser = (uid: string, email: string, displayName: string) => {
      const blank = createEmptyCV(uid);
      if (displayName && displayName !== 'User' && displayName !== 'Demo Admin') {
        blank.fullName = displayName;
      }
      if (email && email !== 'admin@ateliercv.com' && email !== 'areeba.khan@techmail.pk') {
        blank.email = email;
      }
      return cleanCVDocumentText(blank);
    };

    const activateFallbackUser = (fbData: {
      uid: string;
      email: string;
      displayName: string;
    }) => {
      const isAdm =
        fbData.email.toLowerCase() === 'zulqarnainshah25@gmail.com' ||
        fbData.email.toLowerCase() === 'admin@ateliercv.com';

      let savedPlan: PlanTier | undefined;
      let savedPdfLimit: number | undefined;
      let savedWordLimit: number | undefined;
      let savedPdfUsed = 0;
      let savedWordUsed = 0;
      try {
        const rawDir = localStorage.getItem('ateliercv_users_directory_v1');
        if (rawDir) {
          const parsedDir = JSON.parse(rawDir) as Record<string, UserProfile>;
          const found =
            parsedDir[fbData.uid] ||
            Object.values(parsedDir).find(
              (u) => u && u.email && u.email.toLowerCase() === fbData.email.toLowerCase()
            );
          if (found) {
            savedPlan = found.plan;
            savedPdfLimit = found.pdfLimit;
            savedWordLimit = found.wordLimit;
            savedPdfUsed = found.pdfExportsUsed || 0;
            savedWordUsed = found.wordExportsUsed || 0;
          }
        }
      } catch {
        // Ignore storage read errors
      }

      const fallbackProfile: UserProfile = {
        uid: fbData.uid,
        email: fbData.email,
        displayName: fbData.displayName || 'User',
        role: isAdm ? 'admin' : 'user',
        plan: savedPlan || (isAdm ? 'unlimited' : 'free'),
        pdfExportsUsed: savedPdfUsed,
        wordExportsUsed: savedWordUsed,
        pdfLimit: savedPdfLimit,
        wordLimit: savedWordLimit
      };
      setIsLocalSession(true);
      setUserProfile(fallbackProfile);
      const draftKey = `${DRAFT_STORAGE_PREFIX}${fbData.uid}`;
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        try {
          const parsedDraft = cleanCVDocumentText(JSON.parse(rawDraft) as CVDocument);
          const restored = { ...parsedDraft, userId: fbData.uid };
          setCurrentCV(restored);
          setSavedCVs([restored]);
        } catch {
          const fresh = createInitialBlankCVForUser(fbData.uid, fbData.email, fbData.displayName);
          setCurrentCV(fresh);
          setSavedCVs([]);
        }
      } else {
        const fresh = createInitialBlankCVForUser(fbData.uid, fbData.email, fbData.displayName);
        setCurrentCV(fresh);
        setSavedCVs([]);
      }
      setAuthReady(true);
    };

    const handleTokenFallbackEvent = (e: Event) => {
      const custom = e as CustomEvent<{ uid: string; email: string; displayName: string }>;
      if (custom.detail) {
        activateFallbackUser(custom.detail);
      }
    };
    window.addEventListener('ateliercv-token-api-fallback', handleTokenFallbackEvent);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        const parsedSso =
          typeof window !== 'undefined'
            ? parseAndSavePortalQueryParams(window.location.search)
            : null;
        if (parsedSso?.ssoEmail) {
          const ssoUser = {
            uid:
              parsedSso.ssoUid ||
              `sso_${parsedSso.ssoEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            email: parsedSso.ssoEmail,
            displayName: parsedSso.ssoName || parsedSso.ssoEmail.split('@')[0] || 'User'
          };
          try {
            localStorage.setItem(FALLBACK_AUTH_STORAGE_KEY, JSON.stringify(ssoUser));
          } catch {
            // Ignore storage errors
          }
          activateFallbackUser(ssoUser);
          return;
        }

        const cachedRaw = localStorage.getItem(FALLBACK_AUTH_STORAGE_KEY);
        if (cachedRaw) {
          try {
            const cachedUser = JSON.parse(cachedRaw);
            if (cachedUser && cachedUser.uid) {
              activateFallbackUser(cachedUser);
              return;
            }
          } catch {
            // Ignore malformed cache
          }
        }
        setUserProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        await fbUser.getIdToken();
      } catch {
        const fallbackData = {
          uid: fbUser.uid,
          email: fbUser.email || 'user@example.com',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User'
        };
        try {
          localStorage.setItem(FALLBACK_AUTH_STORAGE_KEY, JSON.stringify(fallbackData));
        } catch {
          // Ignore
        }
        await signOut(auth);
        activateFallbackUser(fallbackData);
        return;
      }

      setIsLocalSession(false);
      try {
        const profile = await ensureUserProfile(
          fbUser.uid,
          fbUser.email || 'user@example.com',
          fbUser.displayName || fbUser.email?.split('@')[0] || 'User'
        );
        setUserProfile(profile);

        const welcomeStorageKey = `ateliercv_welcome_plan_shown_${fbUser.uid}`;
        if (!localStorage.getItem(welcomeStorageKey) && profile.plan === 'free') {
          setShowWelcomeModal(true);
          localStorage.setItem(welcomeStorageKey, 'true');
        }

        await refreshTemplates();
        const rawCvsFromDb = await fetchUserCVs(fbUser.uid);
        const cvsFromDb = rawCvsFromDb
          .filter((doc) => !doc.id?.includes('_sample') && doc.email !== 'areeba.khan@techmail.pk')
          .map((doc) => cleanCVDocumentText(doc));
        setSavedCVs(cvsFromDb);

        const draftKey = `${DRAFT_STORAGE_PREFIX}${fbUser.uid}`;
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          try {
            const parsedDraft = cleanCVDocumentText(JSON.parse(rawDraft) as CVDocument);
            setCurrentCV({ ...parsedDraft, userId: fbUser.uid });
          } catch {
            setCurrentCV(
              cvsFromDb[0] ||
                createInitialBlankCVForUser(
                  fbUser.uid,
                  fbUser.email || '',
                  fbUser.displayName || ''
                )
            );
          }
        } else if (cvsFromDb.length > 0) {
          setCurrentCV(cvsFromDb[0]);
        } else {
          setCurrentCV(
            createInitialBlankCVForUser(
              fbUser.uid,
              fbUser.email || '',
              fbUser.displayName || ''
            )
          );
        }
      } catch {
        activateFallbackUser({
          uid: fbUser.uid,
          email: fbUser.email || 'user@example.com',
          displayName: fbUser.displayName || 'User'
        });
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      window.removeEventListener('ateliercv-token-api-fallback', handleTokenFallbackEvent);
      unsubscribe();
    };
  }, [refreshTemplates]);

  // Real-time synchronization of user profile & plan changes
  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = subscribeToUserProfile(userProfile.uid, (freshProfile) => {
      setUserProfile((prev) => {
        if (!prev) return freshProfile;
        if (prev.plan !== freshProfile.plan) {
          if (freshProfile.plan !== 'free') {
            const msg =
              freshProfile.planNotification ||
              `Mubarak! Aap ka ${freshProfile.plan.toUpperCase()} Plan kamyabi se activate ho gaya hai! Tamam templates aor downloads unlock ho chuke hain.`;
            setActivatedPlanCelebration(msg);
            setPaywallOpen(false);
            notify(
              `Plan upgraded to ${freshProfile.plan.toUpperCase()}! All templates & exports unlocked.`,
              'success'
            );
          } else {
            setActivatedPlanCelebration(null);
            notify('Aap ka plan Free Tier par update ho gaya hai.', 'warning');
          }
        } else if (
          freshProfile.planNotification &&
          freshProfile.planNotification !== prev.planNotification
        ) {
          setActivatedPlanCelebration(freshProfile.planNotification);
          notify(freshProfile.planNotification, 'success');
        }
        return freshProfile;
      });
    });
    return () => unsub();
  }, [userProfile?.uid, notify]);

  // Handle Stripe Checkout return query params (?payment=success&session_id=...)
  useEffect(() => {
    if (!userProfile) return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const sessionId = params.get('session_id');

    if (paymentStatus === 'success') {
      (async () => {
        try {
          await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, userId: userProfile.uid })
          });
          if (!isLocalSession) {
            await upgradeUserPlanToPremium(userProfile.uid);
          }
          setUserProfile((prev) => (prev ? { ...prev, plan: 'premium' } : prev));
          notify('Payment verified! Aap ka account Premium mein upgrade ho gaya hai.', 'success');
        } catch {
          setUserProfile((prev) => (prev ? { ...prev, plan: 'premium' } : prev));
          notify('Account upgraded to Premium!', 'success');
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
        }
      })();
    } else if (paymentStatus === 'cancelled') {
      notify('Stripe checkout cancel kar diya gaya.', 'warning');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [userProfile, isLocalSession, notify]);

  // Step 1 of Auto-Save: Debounced (600ms) write to localStorage
  const handleCVChange = useCallback(
    (updated: CVDocument) => {
      const cleaned = stripSampleResidue(updated);
      setCurrentCV(cleaned);
      latestCVRef.current = cleaned;
      dirtyForFirestoreRef.current = true;
      setSyncStatus('local-saved');

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        const uid = userProfile?.uid || 'guest';
        const draftKey = `${DRAFT_STORAGE_PREFIX}${uid}`;
        const cvStorageKey = `${CV_STORAGE_PREFIX}${cleaned.id}`;
        try {
          const serialized = JSON.stringify(cleanCVDocumentText(cleaned));
          localStorage.setItem(draftKey, serialized);
          localStorage.setItem(cvStorageKey, serialized);
          const timeStr = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          setDraftSavedTimestamp(timeStr);
        } catch {
          // Ignore storage quota errors
        }
      }, 600);
    },
    [userProfile?.uid]
  );

  // Step 2 of Auto-Save: Sync localStorage to Firestore
  const syncCurrentCVToDatabase = useCallback(async (): Promise<boolean> => {
    const cvToSync = cleanCVDocumentText(latestCVRef.current);
    const uid = userProfile?.uid || 'guest';

    try {
      const serialized = JSON.stringify(cvToSync);
      localStorage.setItem(`${DRAFT_STORAGE_PREFIX}${uid}`, serialized);
      localStorage.setItem(`${CV_STORAGE_PREFIX}${cvToSync.id}`, serialized);
    } catch {
      // Ignore
    }

    setSavedCVs((prev) => {
      const idx = prev.findIndex((item) => item.id === cvToSync.id);
      if (idx === -1) return [cvToSync, ...prev];
      const next = [...prev];
      next[idx] = cvToSync;
      return next;
    });

    if (isLocalSession || !userProfile) {
      dirtyForFirestoreRef.current = false;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(nowStr);
      setSyncStatus('synced');
      return true;
    }

    setSyncStatus('syncing');
    try {
      const syncedOk = await flushPendingSyncAndSave(cvToSync, userProfile.uid);
      dirtyForFirestoreRef.current = false;
      const nowStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setLastSyncedTime(nowStr);
      setSyncStatus(syncedOk ? 'synced' : 'offline-queued');
      return syncedOk;
    } catch {
      setSyncStatus('offline-queued');
      return false;
    }
  }, [userProfile, isLocalSession]);

  useEffect(() => {
    if (!userProfile) return;
    const interval = window.setInterval(() => {
      if (dirtyForFirestoreRef.current) {
        syncCurrentCVToDatabase();
      }
    }, 7000);
    return () => window.clearInterval(interval);
  }, [userProfile, syncCurrentCVToDatabase]);

  const handleClearForm = () => {
    const uid = userProfile?.uid || 'guest';
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    dirtyForFirestoreRef.current = false;

    try {
      localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${uid}`);
      localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}guest`);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith(DRAFT_STORAGE_PREFIX) ||
            key.startsWith('ateliercv_draft_') ||
            key.startsWith('ateliercv_cv_'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage errors
    }

    const fresh = createEmptyCV(uid);
    setCurrentCV(fresh);
    latestCVRef.current = fresh;
    setSavedCVs([]);
    setDraftSavedTimestamp('');
    notify('Form cleared! Ab aap naya CV data enter kar sakte hain.', 'success');
  };

  const handleBuildCV = async () => {
    setIsBuildingAI(true);

    const formOnlyCV: CVDocument = stripSampleResidue({
      ...currentCV,
      summary: '',
      skillGroups: [],
      experience: (currentCV.experience || []).map((exp) => ({
        ...exp,
        bullets: []
      }))
    });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch('/api/build-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: formOnlyCV }),
        signal: controller.signal
      });
      window.clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok || result.fallbackUsed) {
        const mergedFallback: CVDocument = cleanCVDocumentText({
          ...formOnlyCV,
          ...(result.data || {}),
          id: currentCV.id,
          userId: userProfile?.uid || currentCV.userId,
          templateId: currentCV.templateId,
          photoDataUrl: currentCV.photoDataUrl,
          isPolished: true
        });
        handleCVChange(mergedFallback);
        syncCurrentCVToDatabase().catch(() => {});
        notify(
          result.error ||
            'Aap ke current form data se professional English CV tayyar kar diya gaya hai.',
          'success'
        );
        navigateToTab('preview');
        return;
      }

      const polishedCV: CVDocument = cleanCVDocumentText({
        ...formOnlyCV,
        ...result.data,
        id: currentCV.id,
        userId: userProfile?.uid || currentCV.userId,
        templateId: currentCV.templateId,
        photoDataUrl: currentCV.photoDataUrl,
        isPolished: true
      });

      handleCVChange(polishedCV);
      syncCurrentCVToDatabase().catch(() => {});
      notify(
        'AI ne aap ke current form data se professional ATS-friendly CV tayyar kar diya hai!',
        'success'
      );
      navigateToTab('preview');
    } catch {
      window.clearTimeout(timeoutId);
      const fallbackExp = formOnlyCV.experience.map((exp) => ({
        ...exp,
        bullets: expandRawDutiesToProfessionalBullets(
          exp.rawDescription,
          exp.role,
          exp.company
        )
      }));
      const fallbackCV: CVDocument = cleanCVDocumentText({
        ...formOnlyCV,
        summary: rewriteRawSummaryToEnglish(
          formOnlyCV.rawSummary,
          formOnlyCV.jobTitle,
          fallbackExp,
          formOnlyCV.skills
        ),
        experience: fallbackExp,
        isPolished: true
      });
      handleCVChange(fallbackCV);
      syncCurrentCVToDatabase().catch(() => {});
      notify('Aap ke current data se editable CV preview generate kar diya gaya hai.', 'success');
      navigateToTab('preview');
    } finally {
      setIsBuildingAI(false);
    }
  };

  const handleRecordPdfExport = async () => {
    if (!userProfile) return;
    const nextCount = isLocalSession
      ? userProfile.pdfExportsUsed + 1
      : await incrementUserPdfExportCount(userProfile.uid, userProfile.pdfExportsUsed);
    setUserProfile({ ...userProfile, pdfExportsUsed: nextCount });
  };

  const handleRecordWordExport = async () => {
    if (!userProfile) return;
    const currentCount = userProfile.wordExportsUsed || 0;
    const nextCount = isLocalSession
      ? currentCount + 1
      : await incrementUserWordExportCount(userProfile.uid, currentCount);
    setUserProfile({ ...userProfile, wordExportsUsed: nextCount });
  };

  const handleSubmitPaymentProof = async (proofData: {
    planId: 'starter' | 'pro' | 'unlimited';
    planName: string;
    amountPkr: number;
    method: 'easypaisa' | 'bank';
    senderName: string;
    senderPhone: string;
    trxId: string;
    notes?: string;
  }) => {
    if (!userProfile) return;
    await submitPaymentProof({
      ...proofData,
      userId: userProfile.uid,
      userEmail: userProfile.email,
      userName: userProfile.displayName
    });
    notify(
      'Payment proof submit ho gaya hai! Admin verification ke baad foran activate kar dein ge.',
      'success'
    );
  };

  const handleInstantActivatePlan = async (planId: 'starter' | 'pro' | 'unlimited') => {
    if (!userProfile) return;
    const targetPlan =
      paymentPlans.find((p) => p.id === planId) ||
      DEFAULT_PAYMENT_PLANS.find((p) => p.id === planId);
    const pdfLimit = targetPlan?.pdfLimit ?? (planId === 'unlimited' ? 999999 : 10);
    const wordLimit =
      targetPlan?.wordLimit ??
      (planId === 'starter' ? 2 : planId === 'pro' ? 10 : 999999);

    if (!isLocalSession) {
      try {
        await updateUserPlanAndQuota(userProfile.uid, planId, pdfLimit, wordLimit);
      } catch {
        // ignore
      }
    }
    setUserProfile({
      ...userProfile,
      plan: planId,
      pdfLimit,
      wordLimit
    });
    setPaywallOpen(false);
    notify(`Congratulations! Aap ka ${targetPlan?.name || planId} activate ho gaya hai!`, 'success');
  };

  const handleQuickDemoAccess = (customUser?: {
    email?: string;
    displayName?: string;
    isSignup?: boolean;
  }) => {
    setIsLocalSession(true);
    const customEmail = customUser?.email?.trim() || DEMO_ADMIN_USER.email;
    const customName =
      customUser?.displayName?.trim() ||
      (customUser?.email ? customUser.email.split('@')[0] : DEMO_ADMIN_USER.displayName);
    const customUid = customUser?.email
      ? `user_${customEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
      : `user_session_${Date.now()}`;

    const nextProfile: UserProfile = {
      uid: customUid,
      email: customEmail,
      displayName: customName,
      role: 'admin',
      plan: 'unlimited',
      pdfExportsUsed: 0,
      wordExportsUsed: 0
    };

    try {
      localStorage.setItem(
        FALLBACK_AUTH_STORAGE_KEY,
        JSON.stringify({
          uid: nextProfile.uid,
          email: nextProfile.email,
          displayName: nextProfile.displayName
        })
      );
      localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${customUid}`);
    } catch {
      // Ignore storage errors
    }

    setUserProfile(nextProfile);
    const freshBlank = createEmptyCV(customUid);
    if (customUser?.displayName?.trim()) {
      freshBlank.fullName = customUser.displayName.trim();
    }
    if (customUser?.email?.trim()) {
      freshBlank.email = customUser.email.trim();
    }
    const cleanedBlank = cleanCVDocumentText(freshBlank);
    setCurrentCV(cleanedBlank);
    setSavedCVs([]);
    navigateToTab('form');
    notify('Workspace opened with a clean blank CV form.', 'success');
  };

  const handleNavigateToMainPortal = () => {
    const targetUrl =
      (typeof window !== 'undefined' && localStorage.getItem(PORTAL_URL_STORAGE_KEY)) ||
      DEFAULT_PORTAL_URL;
    window.location.href = getMainPortalUrl() || targetUrl;
  };

  const handleLogout = async () => {
    const savedPortalUrl =
      (typeof window !== 'undefined' && localStorage.getItem(PORTAL_URL_STORAGE_KEY)) ||
      DEFAULT_PORTAL_URL;
    const savedLogoutRedirect =
      (typeof window !== 'undefined' && localStorage.getItem(LOGOUT_REDIRECT_STORAGE_KEY)) ||
      DEFAULT_LOGOUT_REDIRECT;
    const safeRedirectTarget = getLogoutRedirectUrl() || savedLogoutRedirect;

    try {
      localStorage.clear();
      localStorage.setItem(PORTAL_URL_STORAGE_KEY, savedPortalUrl);
      localStorage.setItem(LOGOUT_REDIRECT_STORAGE_KEY, safeRedirectTarget);
    } catch {
      // Ignore storage errors
    }

    try {
      await signOut(auth);
    } catch {
      // Ignore signOut errors if offline or local session
    }

    setUserProfile(null);
    setIsLocalSession(false);
    setCurrentCV(cleanCVDocumentText(createEmptyCV('guest')));
    setSavedCVs([]);

    window.location.href =
      (typeof window !== 'undefined' && localStorage.getItem(LOGOUT_REDIRECT_STORAGE_KEY)) ||
      DEFAULT_LOGOUT_REDIRECT;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 transition-colors">
      {/* Top Navigation Bar */}
      <header className="print:hidden flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors w-full max-w-full overflow-x-hidden">
        {/* Zone 1: Single clean text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            if (userProfile) navigateToTab('form');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          AtelierCV
        </a>

        {/* Zone 2: Navigation links */}
        <nav className="flex items-center gap-3 sm:gap-5 md:gap-7 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 overflow-x-auto min-w-0 py-0.5">
          {userProfile && (
            <>
              <button
                type="button"
                onClick={() => navigateToTab('dashboard')}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                  activeTab === 'dashboard'
                    ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-blue-400 font-semibold'
                    : ''
                }`}
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => navigateToTab('form')}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                  activeTab === 'form'
                    ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-blue-400 font-semibold'
                    : ''
                }`}
              >
                CV Form
              </button>

              <button
                type="button"
                onClick={() => navigateToTab('preview')}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                  activeTab === 'preview'
                    ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-blue-400 font-semibold'
                    : ''
                }`}
              >
                Live Editor
              </button>
            </>
          )}

          {/* Admin Panel Link */}
          <button
            type="button"
            onClick={() => {
              if (isAdminLoggedIn) {
                navigateToTab('admin');
              } else {
                setAdminLoginModalOpen(true);
              }
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 inline-flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-blue-400 font-semibold'
                : ''
            }`}
          >
            <Shield
              className={`w-3.5 h-3.5 ${isAdminLoggedIn ? 'text-emerald-600' : 'text-slate-400'}`}
            />
            <span>{isAdminLoggedIn ? 'Admin Panel' : 'Admin (/admin)'}</span>
          </button>
        </nav>

        {/* Zone 3: Main Portal Button + Upgrade Button + Theme Toggle + Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
          <a
            href={
              (typeof window !== 'undefined' && localStorage.getItem(PORTAL_URL_STORAGE_KEY)) ||
              DEFAULT_PORTAL_URL
            }
            onClick={(e) => {
              e.preventDefault();
              handleNavigateToMainPortal();
            }}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            title="Return to PakEdu & Gov Portal — Sindh SELD Toolkit"
          >
            <span>← Main Portal</span>
          </a>

          {userProfile && (
            userProfile.plan === 'free' ? (
              <button
                type="button"
                onClick={() => {
                  setPaywallReason(
                    'Aap Free Tier par hain (sirf 2 templates aur 1 PDF download allowed). Tamam 6 templates, Word exports aur high download limits unlock karne ke liye upgrade karein.'
                  );
                  setPaywallOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/80 transition-all shadow-xs whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Free · Upgrade</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg capitalize whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                <span>{userProfile.plan} Plan</span>
              </div>
            )
          )}

          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden md:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span className="hidden md:inline">Dark</span>
              </>
            )}
          </button>

          {userProfile ? (
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 sm:px-3 py-1.5 text-[11px] font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
            >
              Sign Out
            </button>
          ) : (
            <span className="hidden sm:inline text-xs font-mono text-slate-500 dark:text-slate-400">
              AI Resume Studio
            </span>
          )}
        </div>
      </header>

      {/* Real-Time Plan Activation Celebration Banner */}
      {activatedPlanCelebration && (
        <div className="print:hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md z-30">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-spin" />
            <span>{activatedPlanCelebration}</span>
          </div>
          <button
            type="button"
            onClick={() => setActivatedPlanCelebration(null)}
            className="p-1 hover:bg-white/20 rounded-md text-white transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1">
        {!authReady ? (
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
          </div>
        ) : activeTab === 'admin' ? (
          !isAdminLoggedIn ? (
            <div className="max-w-md mx-auto my-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-lg">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center mb-4 shadow-xs">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Admin Panel Security Gate
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Yeh area sirf authorized administrator (
                <span className="font-mono font-semibold">Zulqarnain Shah</span>) ke liye makhsoos hai. Admin settings, templates, plans aur payment proofs dekhne ke liye credentials verify karein.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateToTab('form')}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg"
                >
                  Back to CV Studio
                </button>
                <button
                  type="button"
                  onClick={() => setAdminLoginModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Admin Login (Verify PIN)</span>
                </button>
              </div>
            </div>
          ) : (
            <AdminPanel
              currentUser={userProfile || DEMO_ADMIN_USER}
              templates={templates}
              userCVs={savedCVs}
              activeTemplateId={currentCV.templateId}
              onRefreshTemplates={refreshTemplates}
              onSelectTemplate={(templateId, openLiveEditor) => {
                handleCVChange({ ...currentCV, templateId });
                if (openLiveEditor) {
                  navigateToTab('preview');
                }
              }}
              onNotify={notify}
              onExitAdminSession={() => {
                setIsAdminLoggedIn(false);
                try {
                  sessionStorage.removeItem('ateliercv_admin_auth');
                } catch {
                  // ignore
                }
                navigateToTab('form');
                notify('Admin session locked.', 'warning');
              }}
            />
          )
        ) : !userProfile ? (
          <AuthScreen
            onQuickDemoAccess={handleQuickDemoAccess}
            initialEmail={ssoPrefill.email}
            initialFullName={ssoPrefill.name}
          />
        ) : activeTab === 'dashboard' ? (
          <DashboardView
            user={userProfile}
            cvs={savedCVs}
            templates={templates}
            onCreateNewCV={() => {
              const fresh = createEmptyCV(userProfile.uid);
              try {
                localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${userProfile.uid}`);
              } catch {
                // Ignore
              }
              setCurrentCV(fresh);
              navigateToTab('form');
            }}
            onEditCV={(cv, openInPreview) => {
              setCurrentCV(stripSampleResidue(cv));
              navigateToTab(openInPreview ? 'preview' : 'form');
            }}
            onDuplicateCV={async (cv) => {
              const dup: CVDocument = {
                ...cv,
                id: `cv_${Date.now()}_copy`,
                title: `${cv.title} (Copy)`
              };
              setSavedCVs((prev) => [dup, ...prev]);
              if (!isLocalSession) {
                try {
                  await saveCVToFirestore(dup, userProfile.uid);
                } catch {
                  // Offline queue handles it
                }
              }
              notify(`Duplicated "${cv.title}".`, 'success');
            }}
            onDeleteCV={async (cvId) => {
              setSavedCVs((prev) => prev.filter((item) => item.id !== cvId));
              if (!isLocalSession) {
                try {
                  await deleteCVFromFirestore(cvId);
                } catch {
                  // Ignore
                }
              }
              notify('CV deleted.', 'success');
            }}
            onOpenPaywall={(reason) => {
              setPaywallReason(reason);
              setPaywallOpen(true);
            }}
          />
        ) : activeTab === 'form' ? (
          <CVFormWorkspace
            cv={currentCV}
            templates={templates}
            isPremiumUser={userProfile.plan !== 'free'}
            isBuildingAI={isBuildingAI}
            draftSavedTimestamp={draftSavedTimestamp}
            onChangeCV={handleCVChange}
            onLoadSampleData={() => {
              const sample = createSampleCV(userProfile.uid);
              sample.id = currentCV.id;
              handleCVChange(sample);
              notify('Sample career data loaded into form.', 'success');
            }}
            onClearForm={handleClearForm}
            onBuildCV={handleBuildCV}
            onOpenPaywall={(reason) => {
              setPaywallReason(reason);
              setPaywallOpen(true);
            }}
          />
        ) : (
          <PreviewEditorStudio
            cv={currentCV}
            templates={templates}
            user={userProfile}
            syncStatus={syncStatus}
            lastSyncedTime={lastSyncedTime}
            onChangeCV={handleCVChange}
            onBlurSync={() => {
              syncCurrentCVToDatabase();
            }}
            onManualSaveChanges={syncCurrentCVToDatabase}
            onBackToForm={() => navigateToTab('form')}
            onOpenPaywall={(reason) => {
              setPaywallReason(reason);
              setPaywallOpen(true);
            }}
            onRecordPdfExport={handleRecordPdfExport}
            onRecordWordExport={handleRecordWordExport}
            onNotify={notify}
          />
        )}
      </main>

      {/* Paywall Modal with Easypaisa / Bank Transfer & PKR Plans */}
      {userProfile && (
        <PaywallModal
          isOpen={paywallOpen}
          reason={paywallReason}
          userId={userProfile.uid}
          userEmail={userProfile.email}
          userName={userProfile.displayName}
          currentPlan={userProfile.plan}
          plans={paymentPlans}
          paymentAccounts={paymentAccounts}
          onClose={() => setPaywallOpen(false)}
          onSubmitPaymentProof={handleSubmitPaymentProof}
          onInstantActivatePlan={handleInstantActivatePlan}
        />
      )}

      {/* New User Welcome & Upgrade Prompt Modal */}
      {userProfile && (
        <WelcomeUpgradeModal
          isOpen={showWelcomeModal}
          userName={userProfile.displayName}
          userEmail={userProfile.email}
          plan={userProfile.plan}
          onClose={() => setShowWelcomeModal(false)}
          onOpenPlans={() => {
            setPaywallReason(
              'Tamam 6 templates, unlimited PDF aur Word exports unlock karne ke liye apna plan choose karein.'
            );
            setPaywallOpen(true);
          }}
        />
      )}

      {/* Admin Login Authentication Modal */}
      <AdminLoginModal
        isOpen={adminLoginModalOpen}
        onClose={() => setAdminLoginModalOpen(false)}
        onSuccess={() => {
          setIsAdminLoggedIn(true);
          try {
            sessionStorage.setItem('ateliercv_admin_auth', 'true');
          } catch {
            // ignore
          }
          navigateToTab('admin');
          notify('Admin authentication kamyab! Governance panel activate ho gaya hai.', 'success');
        }}
      />

      {/* Toast Notifications */}
      <div className="print:hidden fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium transition-all ${
              t.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : t.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-red-50 text-red-900 border-red-300'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            {t.type === 'error' && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Version Display Footer */}
      <footer className="print:hidden py-3 text-center text-[11px] font-mono text-slate-400 dark:text-slate-600 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
        AtelierCV Studio · Version v{CURRENT_APP_VERSION}
      </footer>
    </div>
  );
}
