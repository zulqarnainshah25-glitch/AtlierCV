import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Shield,
  Users,
  LayoutTemplate,
  X,
  RefreshCw,
  Check,
  Upload,
  Download,
  FileCode,
  HelpCircle,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  LogOut,
  Save,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import {
  CVDocument,
  CVTemplate,
  TemplateCategory,
  TemplateLayoutType,
  UserProfile,
  PaymentPlan,
  PaymentAccountsConfig,
  PaymentProof,
  PlanTier
} from '../types/cv';
import {
  saveTemplateToFirestore,
  deleteTemplateFromFirestore,
  seedDefaultTemplatesInFirestore,
  fetchAllUsersForAdmin,
  fetchAllCVsForAdmin,
  fetchPaymentPlans,
  savePaymentPlans,
  fetchPaymentAccounts,
  savePaymentAccounts,
  fetchAllPaymentProofs,
  updatePaymentProofStatus,
  updateUserPlanAndQuota,
  updateUserPlanInFirestore,
  subscribeToPaymentRequests
} from '../lib/firestoreService';
import {
  DEFAULT_PAYMENT_ACCOUNTS,
  DEFAULT_PAYMENT_PLANS
} from '../data/seedTemplates';
import { CVTemplateRenderer } from './CVTemplateRenderer';

interface AdminPanelProps {
  currentUser: UserProfile;
  templates: CVTemplate[];
  userCVs: CVDocument[];
  activeTemplateId?: string;
  onRefreshTemplates: () => Promise<void>;
  onSelectTemplate?: (templateId: string, openLiveEditor?: boolean) => void;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
  onExitAdminSession?: () => void;
}

type AdminTab = 'templates' | 'plans' | 'accounts' | 'proofs' | 'users';

const CATEGORIES: TemplateCategory[] = [
  'Modern',
  'Classic',
  'Minimal',
  'Creative',
  'Executive',
  'Professional',
  'ATS-friendly'
];

const LAYOUT_TYPES: TemplateLayoutType[] = [
  'two-column-left',
  'two-column-right',
  'header-top',
  'single-column-classic',
  'minimal-editorial',
  'minimal-timeline',
  'creative-split',
  'ats-clean'
];

const SAMPLE_IMPORT_BLUEPRINT: CVTemplate = {
  id: 'classic-dark-sidebar',
  name: 'Classic Dark Sidebar',
  category: 'Professional',
  description:
    'Dark grey sidebar on the left with skill progress bars, and a clean single-column main section on the right.',
  isPremium: true,
  accentColor: '#374151',
  secondaryColor: '#111827',
  fontFamily: 'Inter',
  layoutType: 'two-column-right',
  photoSlot: {
    position: 'sidebar-top',
    widthMm: 35,
    heightMm: 45,
    borderRadius: '0px',
    showBorder: false
  },
  customCss:
    '.sidebar { background-color: #374151; color: #ffffff; } .sidebar h2 { background-color: #1F2937; padding: 6px 12px; margin-left: -20px; margin-right: -20px; } .progress-bar-container { background-color: #4B5563; height: 6px; width: 100%; margin-top: 4px; } .progress-bar-fill { background-color: #ffffff; height: 100%; } .main-heading { border-bottom: 2px solid #E5E7EB; padding-bottom: 4px; color: #1F2937; }',
  thumbnailType: 'classic-dark-sidebar'
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  templates,
  userCVs,
  activeTemplateId,
  onRefreshTemplates,
  onSelectTemplate,
  onNotify,
  onExitAdminSession
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('templates');
  const [editingTemplate, setEditingTemplate] = useState<CVTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState(
    JSON.stringify(SAMPLE_IMPORT_BLUEPRINT, null, 2)
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Plans Management State
  const [plans, setPlans] = useState<PaymentPlan[]>(DEFAULT_PAYMENT_PLANS);
  const [savingPlans, setSavingPlans] = useState(false);

  // Payment Accounts State
  const [accounts, setAccounts] = useState<PaymentAccountsConfig>(DEFAULT_PAYMENT_ACCOUNTS);
  const [savingAccounts, setSavingAccounts] = useState(false);

  // Payment Proofs State
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);

  // Directory State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([currentUser]);
  const [allCVs, setAllCVs] = useState<CVDocument[]>(userCVs);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [previewCV, setPreviewCV] = useState<CVDocument | null>(null);

  // Load initial data & subscribe to real-time payment_requests
  useEffect(() => {
    fetchPaymentPlans().then(setPlans);
    fetchPaymentAccounts().then(setAccounts);
    fetchAllPaymentProofs().then(setProofs);
    const unsubRequests = subscribeToPaymentRequests((liveRequests) => {
      setProofs(liveRequests);
    });
    return () => unsubRequests();
  }, []);

  const loadAdminDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const [usersData, cvsData] = await Promise.all([
        fetchAllUsersForAdmin(),
        fetchAllCVsForAdmin()
      ]);
      if (usersData.length > 0) setAllUsers(usersData);
      if (cvsData.length > 0) setAllCVs(cvsData);
    } catch {
      setAllUsers([currentUser]);
      setAllCVs(userCVs);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const loadProofs = async () => {
    setLoadingProofs(true);
    try {
      const list = await fetchAllPaymentProofs();
      setProofs(list);
    } finally {
      setLoadingProofs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadAdminDirectory();
    } else if (activeTab === 'proofs') {
      loadProofs();
    }
  }, [activeTab]);

  // Toggle Free / Paid on a template
  const handleToggleTemplateTier = async (tpl: CVTemplate) => {
    const nextIsPremium = !tpl.isPremium;
    const updated: CVTemplate = { ...tpl, isPremium: nextIsPremium };
    try {
      await saveTemplateToFirestore(updated);
      await onRefreshTemplates();
      onNotify(
        `"${tpl.name}" is now marked as ${nextIsPremium ? 'Paid / Locked' : 'Free'}.`,
        'success'
      );
    } catch {
      onNotify('Could not update template tier.', 'error');
    }
  };

  const handleOpenNewTemplate = () => {
    setEditingTemplate({
      id: `custom-${Date.now().toString(36)}`,
      name: 'New Custom Template',
      category: 'Modern',
      description: 'Clean executive template with custom CSS layout and 35x45mm portrait slot.',
      isPremium: true,
      accentColor: '#38BDF8',
      secondaryColor: '#0F2942',
      fontFamily: 'Plus Jakarta Sans',
      layoutType: 'two-column-left',
      photoSlot: {
        position: 'sidebar-top',
        widthMm: 35,
        heightMm: 45,
        borderRadius: '6px',
        showBorder: true
      },
      customCss: '.cv-section-heading { letter-spacing: 0.08em; text-transform: uppercase; }',
      thumbnailType: 'modern-two-col'
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    try {
      await saveTemplateToFirestore(editingTemplate);
      await onRefreshTemplates();
      onSelectTemplate?.(editingTemplate.id, false);
      setIsTemplateModalOpen(false);
      onNotify(`Template "${editingTemplate.name}" saved & active in Live Editor!`, 'success');
    } catch {
      onNotify('Could not save template.', 'error');
    }
  };

  const handleDeleteTemplate = async (templateId: string, name: string) => {
    try {
      await deleteTemplateFromFirestore(templateId);
      await onRefreshTemplates();
      onNotify(`Template "${name}" deleted.`, 'success');
    } catch {
      onNotify('Could not delete template.', 'error');
    }
  };

  const handleSeedTemplates = async () => {
    try {
      await seedDefaultTemplatesInFirestore();
      await onRefreshTemplates();
      onNotify('Seed templates synced: exactly 2 Free and others Paid!', 'success');
    } catch {
      onNotify('Could not sync templates.', 'error');
    }
  };

  const handleExportTemplateJson = (tpl: CVTemplate) => {
    const cleanTpl: CVTemplate = {
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      description: tpl.description,
      isPremium: tpl.isPremium,
      accentColor: tpl.accentColor,
      secondaryColor: tpl.secondaryColor,
      fontFamily: tpl.fontFamily,
      layoutType: tpl.layoutType,
      photoSlot: tpl.photoSlot,
      customCss: tpl.customCss,
      thumbnailType: tpl.thumbnailType
    };
    const blob = new Blob([JSON.stringify(cleanTpl, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tpl.id}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(`Exported "${tpl.name}" as JSON file.`, 'success');
  };

  const handleFileUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportJsonText(reader.result);
        setImportError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportJsonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      const list: any[] = Array.isArray(parsed) ? parsed : [parsed];

      if (list.length === 0) {
        setImportError('JSON khali hai. Kam az kam 1 template object dein.');
        return;
      }

      let importedCount = 0;
      let lastImportedId = '';
      for (const rawTpl of list) {
        if (!rawTpl || typeof rawTpl !== 'object' || !rawTpl.name) {
          setImportError('Har template mein "id", "name", aur "layoutType" hona zaroori hai.');
          return;
        }

        const tplId =
          String(rawTpl.id || rawTpl.name)
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '-') || `custom-${Date.now()}`;

        const rawCss = String(rawTpl.customCss || '');
        const rawLayout = String(rawTpl.layoutType || '');
        const resolvedLayout: TemplateLayoutType = LAYOUT_TYPES.includes(
          rawLayout as TemplateLayoutType
        )
          ? (rawLayout as TemplateLayoutType)
          : rawCss.includes('.header-section') && !rawCss.includes('.sidebar')
          ? 'header-top'
          : 'two-column-left';

        const rawPos = String(rawTpl.photoSlot?.position || 'sidebar-top');
        const isHiddenPhoto = rawPos === 'hidden' || rawPos === 'none';

        const validTpl: CVTemplate = {
          id: tplId,
          name: String(rawTpl.name),
          category: CATEGORIES.includes(rawTpl.category) ? rawTpl.category : 'Professional',
          description: String(
            rawTpl.description || 'Imported custom professional CV template.'
          ),
          isPremium: rawTpl.isPremium !== undefined ? Boolean(rawTpl.isPremium) : true,
          accentColor: String(rawTpl.accentColor || '#374151'),
          secondaryColor: String(rawTpl.secondaryColor || '#111827'),
          fontFamily: String(rawTpl.fontFamily || 'Plus Jakarta Sans'),
          layoutType: resolvedLayout,
          photoSlot: {
            position: (rawPos as any) || 'sidebar-top',
            widthMm: isHiddenPhoto
              ? Number(rawTpl.photoSlot?.widthMm ?? 0)
              : Number(rawTpl.photoSlot?.widthMm) || 35,
            heightMm: isHiddenPhoto
              ? Number(rawTpl.photoSlot?.heightMm ?? 0)
              : Number(rawTpl.photoSlot?.heightMm) || 45,
            borderRadius: String(rawTpl.photoSlot?.borderRadius || '0px'),
            showBorder:
              rawTpl.photoSlot?.showBorder !== undefined
                ? Boolean(rawTpl.photoSlot.showBorder)
                : false
          },
          customCss: rawCss,
          thumbnailType: String(rawTpl.thumbnailType || resolvedLayout)
        };

        await saveTemplateToFirestore(validTpl);
        lastImportedId = validTpl.id;
        importedCount++;
      }

      await onRefreshTemplates();
      if (lastImportedId) {
        onSelectTemplate?.(lastImportedId, false);
      }
      setIsImportModalOpen(false);
      onNotify(
        `${importedCount} new CV template(s) successfully imported!`,
        'success'
      );
    } catch {
      setImportError(
        'Invalid JSON format! Make sure ke quotes (" ") aur brackets { } sahi lage hon.'
      );
    }
  };

  // Save Plans Changes
  const handleSavePlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlans(true);
    try {
      await savePaymentPlans(plans);
      onNotify('Plans and pricing limits updated successfully!', 'success');
    } catch {
      onNotify('Could not save plans.', 'error');
    } finally {
      setSavingPlans(false);
    }
  };

  // Save Payment Accounts Changes
  const handleSaveAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccounts(true);
    try {
      await savePaymentAccounts(accounts);
      onNotify('Easypaisa & Bank receiving accounts updated successfully!', 'success');
    } catch {
      onNotify('Could not save payment accounts.', 'error');
    } finally {
      setSavingAccounts(false);
    }
  };

  // Approve Payment Request (TID System)
  const handleApproveProof = async (proof: PaymentProof) => {
    try {
      await updatePaymentProofStatus(proof.id, 'approved', 'Approved by Zulqarnain Shah (Admin)');
      const targetPlan = plans.find((p) => p.id === proof.planId);
      const pdfLimit = targetPlan?.pdfLimit ?? 999999;
      const wordLimit = targetPlan?.wordLimit ?? 999999;
      const approvedPlan: PlanTier = 'premium';
      const notificationMsg = `Mubarak! Aap ki payment request (TID: ${proof.trxId}) approve ho gayi hai aur aap ka account PREMIUM plan par upgrade kar diya gaya hai!`;

      await updateUserPlanInFirestore(
        proof.userId,
        approvedPlan,
        pdfLimit,
        wordLimit,
        notificationMsg
      );
      setProofs((prev) =>
        prev.map((p) => (p.id === proof.id ? { ...p, status: 'approved' } : p))
      );
      setAllUsers((prev) =>
        prev.map((u) =>
          u.uid === proof.userId
            ? { ...u, plan: approvedPlan, pdfLimit, wordLimit, planNotification: notificationMsg }
            : u
        )
      );
      onNotify(
        `Payment Request (TID: ${proof.trxId}) approved! User (${proof.userEmail}) upgraded to Premium.`,
        'success'
      );
    } catch {
      onNotify('Could not approve payment.', 'error');
    }
  };

  // Reject Payment Proof
  const handleRejectProof = async (proof: PaymentProof) => {
    try {
      await updatePaymentProofStatus(proof.id, 'rejected', 'Transaction ID could not be verified.');
      setProofs((prev) =>
        prev.map((p) => (p.id === proof.id ? { ...p, status: 'rejected' } : p))
      );
      onNotify(`Payment request ${proof.trxId} rejected.`, 'warning');
    } catch {
      onNotify('Could not reject payment.', 'error');
    }
  };

  // Manual User Quota & Plan change in Firestore `users` collection
  const handleManualUserPlanChange = async (userId: string, newPlan: PlanTier) => {
    const targetPlan = plans.find((p) => p.id === newPlan);
    const pdfLimit =
      targetPlan?.pdfLimit ??
      (newPlan === 'unlimited' || newPlan === 'premium'
        ? 999999
        : newPlan === 'starter' || newPlan === 'pro'
        ? 10
        : 1);
    const wordLimit =
      targetPlan?.wordLimit ??
      (newPlan === 'starter'
        ? 2
        : newPlan === 'pro'
        ? 10
        : newPlan === 'unlimited' || newPlan === 'premium'
        ? 999999
        : 0);

    const notificationMsg =
      newPlan === 'free'
        ? 'Aap ka account Free Tier par update kar diya gaya hai.'
        : `Mubarak! Admin ne aap ka account ${newPlan.toUpperCase()} Plan par upgrade kar diya hai!`;

    try {
      const updatedUser = await updateUserPlanInFirestore(
        userId,
        newPlan,
        pdfLimit,
        wordLimit,
        notificationMsg
      );
      setAllUsers((prev) =>
        prev.map((u) =>
          u.uid === userId
            ? {
                ...u,
                plan: updatedUser.plan,
                pdfLimit: updatedUser.pdfLimit,
                wordLimit: updatedUser.wordLimit,
                pdfExportsUsed: updatedUser.pdfExportsUsed,
                wordExportsUsed: updatedUser.wordExportsUsed
              }
            : u
        )
      );
      onNotify(
        `User plan updated in Firestore to ${newPlan.toUpperCase()} and synced across app!`,
        'success'
      );
    } catch {
      onNotify('Could not update user plan.', 'error');
    }
  };

  const freeTemplatesCount = templates.filter((t) => !t.isPremium).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Administrator Session Active · Zulqarnain Shah</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Studio Governance &amp; Payment Operations
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onExitAdminSession && (
            <button
              type="button"
              onClick={onExitAdminSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Admin Panel</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center overflow-x-auto gap-2 py-4 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'templates'
              ? 'bg-slate-900 text-white dark:bg-blue-600'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          <span>CV Templates ({templates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'plans'
              ? 'bg-slate-900 text-white dark:bg-blue-600'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Plans &amp; Pricing Management</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'bg-slate-900 text-white dark:bg-blue-600'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Bank &amp; Easypaisa Accounts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('proofs')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'proofs'
              ? 'bg-slate-900 text-white dark:bg-blue-600'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Payment Requests ({proofs.filter((p) => p.status === 'pending').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white dark:bg-blue-600'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory ({allUsers.length})</span>
        </button>
      </div>

      {/* Tab 1: Templates Management with Free / Paid Locking */}
      {activeTab === 'templates' && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Template Tier Status:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    freeTemplatesCount === 2
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {freeTemplatesCount} Free · {templates.length - freeTemplatesCount} Paid
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rules: Only 2 CV templates are Free (Minimalist Clean &amp; Timeline Classic); all other 5 templates are Paid/Locked.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSeedTemplates}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset 2 Free / 5 Paid Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportError(null);
                  setIsImportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTemplate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Template</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {tpl.name}
                        </h3>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            tpl.isPremium
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {tpl.isPremium ? 'PAID / LOCKED' : 'FREE TIER'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{tpl.category}</span>
                        <span className="mx-1.5">·</span>
                        <span className="font-mono">{tpl.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300"
                        style={{ backgroundColor: tpl.accentColor }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300"
                        style={{ backgroundColor: tpl.secondaryColor }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                    {tpl.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
                    <div>Layout: {tpl.layoutType}</div>
                    <div>
                      Photo Slot: {tpl.photoSlot?.position} ({tpl.photoSlot?.widthMm}×{tpl.photoSlot?.heightMm}mm)
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTemplateTier(tpl)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      tpl.isPremium
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {tpl.isPremium ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{tpl.isPremium ? 'Make Free' : 'Lock as Paid'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {onSelectTemplate && (
                      <button
                        type="button"
                        onClick={() => onSelectTemplate(tpl.id, true)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          activeTemplateId === tpl.id
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>Use</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExportTemplateJson(tpl)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 rounded"
                      title="Export JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setIsTemplateModalOpen(true);
                      }}
                      className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 rounded"
                      title="Edit Template"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                      className="p-1.5 text-red-600 hover:text-red-800 rounded"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Plans Management (Rs. 200, 500, 1000) */}
      {activeTab === 'plans' && (
        <div className="mt-6">
          <form onSubmit={handleSavePlans} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Pakistani Rupee (PKR) Plans Management
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update plan pricing, maximum PDF exports, and maximum Word (.docx) downloads.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingPlans}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Plans Changes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white uppercase font-mono">
                      {p.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      ID: {p.id}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Price in PKR (Rs.)
                    </label>
                    <input
                      type="number"
                      required
                      value={p.pricePkr}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPlans((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, pricePkr: val } : item))
                        );
                      }}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Max PDF Downloads
                      </label>
                      <input
                        type="number"
                        required
                        disabled={p.isUnlimited}
                        value={p.isUnlimited ? 999999 : p.pdfLimit}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPlans((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, pdfLimit: val } : item))
                          );
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Max Word Downloads
                      </label>
                      <input
                        type="number"
                        required
                        disabled={p.isUnlimited}
                        value={p.isUnlimited ? 999999 : p.wordLimit}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPlans((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, wordLimit: val } : item))
                          );
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Short Description / Tagline
                    </label>
                    <input
                      type="text"
                      value={p.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPlans((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                        );
                      }}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Features List (1 per line)
                    </label>
                    <textarea
                      rows={4}
                      value={p.features.join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n');
                        setPlans((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, features: lines } : item))
                        );
                      }}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Bank & Easypaisa Settings */}
      {activeTab === 'accounts' && (
        <div className="mt-6 max-w-3xl">
          <form onSubmit={handleSaveAccounts} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Receiving Accounts Configuration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Yeh details users ko Paywall / Checkout popup mein nazar aati hain.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingAccounts}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Receiving Accounts</span>
              </button>
            </div>

            {/* Easypaisa Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <Smartphone className="w-4 h-4" />
                <span>Easypaisa Account Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Easypaisa Mobile Number
                  </label>
                  <input
                    type="text"
                    required
                    value={accounts.easypaisaNumber}
                    onChange={(e) => setAccounts({ ...accounts, easypaisaNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Easypaisa Account Title
                  </label>
                  <input
                    type="text"
                    required
                    value={accounts.easypaisaTitle}
                    onChange={(e) => setAccounts({ ...accounts, easypaisaTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Bank Transfer Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                <Building2 className="w-4 h-4" />
                <span>Bank Transfer / Raast Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={accounts.bankName}
                    onChange={(e) => setAccounts({ ...accounts, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Account Title
                  </label>
                  <input
                    type="text"
                    required
                    value={accounts.bankTitle}
                    onChange={(e) => setAccounts({ ...accounts, bankTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={accounts.bankAccount}
                    onChange={(e) => setAccounts({ ...accounts, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    IBAN / Raast ID
                  </label>
                  <input
                    type="text"
                    required
                    value={accounts.iban}
                    onChange={(e) => setAccounts({ ...accounts, iban: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Transfer Instructions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Instructions for Users (Urdu/English)
              </label>
              <textarea
                rows={3}
                value={accounts.instructions}
                onChange={(e) => setAccounts({ ...accounts, instructions: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs"
              />
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Payment Requests (TID System) */}
      {activeTab === 'proofs' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Payment Requests (TID Verification &amp; Instant Premium Activation)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                User Email, TID (Transaction ID) aur Date check kar ke &quot;Approve&quot; dabayein. Request status &apos;approved&apos; ho jaye ga aur user ka plan foran &apos;premium&apos; ho jaye ga.
              </p>
            </div>
            <button
              type="button"
              onClick={loadProofs}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingProofs ? 'animate-spin' : ''}`} />
              <span>Refresh Requests</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Plan &amp; Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Sender &amp; TID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {proofs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Abhi tak koi payment proof submit nahi hua.
                    </td>
                  </tr>
                ) : (
                  proofs.map((proof) => (
                    <tr key={proof.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(proof.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {proof.senderName || 'User'}
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          {proof.userEmail}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {proof.planName}
                        </div>
                        <div className="font-mono text-emerald-600 font-bold">
                          Rs. {proof.amountPkr}
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize font-medium text-slate-700 dark:text-slate-300">
                        {proof.method}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          TID: {proof.trxId}
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          Ph: {proof.senderPhone}
                        </div>
                        {proof.notes && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{proof.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            proof.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : proof.status === 'rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {proof.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                          {proof.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {proof.status === 'pending' && <Clock className="w-3 h-3" />}
                          <span className="capitalize">{proof.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {proof.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveProof(proof)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectProof(proof)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Users & CVs Directory */}
      {activeTab === 'users' && (
        <div className="mt-6 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Registered Users</h2>
              <button
                type="button"
                onClick={loadAdminDirectory}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDirectory ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Current Plan</th>
                    <th className="py-3 px-4 text-center">PDF Downloads</th>
                    <th className="py-3 px-4 text-center">Word Downloads</th>
                    <th className="py-3 px-4 text-right">Quick Plan Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {allUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {u.displayName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {u.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold capitalize px-2 py-0.5 rounded text-[11px] ${
                            u.plan === 'unlimited' || u.plan === 'premium'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : u.plan === 'pro'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : u.plan === 'starter'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        {u.pdfExportsUsed} / {u.pdfLimit ?? (u.plan === 'free' ? 1 : u.plan === 'starter' || u.plan === 'pro' ? 10 : '∞')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        {u.wordExportsUsed ?? 0} / {u.wordLimit ?? (u.plan === 'starter' ? 2 : u.plan === 'pro' ? 10 : u.plan === 'unlimited' ? '∞' : 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={u.plan}
                          onChange={(e) =>
                            handleManualUserPlanChange(u.uid, e.target.value as PlanTier)
                          }
                          className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg cursor-pointer"
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium (All Unlocked)</option>
                          <option value="starter">Starter (Rs. 200)</option>
                          <option value="pro">Pro (Rs. 500)</option>
                          <option value="unlimited">Unlimited (Rs. 1000)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              All User CVs (Read-Only Inspection)
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">CV Title</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Target Role</th>
                    <th className="py-3 px-4">Template</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {allCVs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No CVs saved in database yet.
                      </td>
                    </tr>
                  ) : (
                    allCVs.map((cv) => (
                      <tr key={cv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {cv.title}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {cv.fullName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {cv.jobTitle}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{cv.templateId}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setPreviewCV(cv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View CV</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Template Add/Edit Modal */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full overflow-hidden shadow-xl my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Configure Template ({editingTemplate.id})
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.id}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        category: e.target.value as TemplateCategory
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Layout
                  </label>
                  <select
                    value={editingTemplate.layoutType}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        layoutType: e.target.value as TemplateLayoutType
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="two-column-left">two-column-left (Left Sidebar + Right Main)</option>
                    <option value="two-column-right">two-column-right (Left Main + Right Sidebar)</option>
                    <option value="header-top">header-top (Top Header Banner + Single Column)</option>
                    <option value="single-column-classic">single-column-classic (Classic Single Column)</option>
                    <option value="minimal-timeline">minimal-timeline (Timeline Classic)</option>
                    <option value="minimal-editorial">minimal-editorial (Minimalist Clean)</option>
                    <option value="creative-split">creative-split (Creative Accent)</option>
                    <option value="ats-clean">ats-clean</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Tier
                  </label>
                  <select
                    value={editingTemplate.isPremium ? 'paid' : 'free'}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        isPremium: e.target.value === 'paid'
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="free">Free Tier</option>
                    <option value="paid">Paid / Locked</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Photo Slot Position
                  </label>
                  <select
                    value={editingTemplate.photoSlot?.position || 'sidebar-top'}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        photoSlot: {
                          ...(editingTemplate.photoSlot || {
                            widthMm: 35,
                            heightMm: 45,
                            borderRadius: '6px',
                            showBorder: false
                          }),
                          position: e.target.value as any
                        }
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="sidebar-top">sidebar-top (Sidebar Top)</option>
                    <option value="header-left">header-left (Header Left)</option>
                    <option value="header-right">header-right (Header Right)</option>
                    <option value="header-center">header-center (Header Center)</option>
                    <option value="top-right">top-right (Top Right)</option>
                    <option value="top-left">top-left (Top Left)</option>
                    <option value="hidden">hidden (No Photo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Accent Color
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.accentColor}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, accentColor: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Secondary Color
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.secondaryColor}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, secondaryColor: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingTemplate.description}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom CSS (`.header-section`, `.sidebar`, `.main-heading`, patterns, etc.)
                </label>
                <textarea
                  rows={4}
                  value={editingTemplate.customCss || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, customCss: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JSON Template Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-xl my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Import New CV Template(s) via JSON
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportJsonSubmit} className="p-5 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300">
                  Upload a <code>.json</code> file or paste single/multiple Template JSON objects below:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUploadJson}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-white bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload .json File</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template JSON Payload
                </label>
                <textarea
                  rows={12}
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    setImportError(null);
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11.5px] leading-relaxed focus:outline-none"
                />
                {importError && (
                  <p className="text-red-600 font-semibold mt-1.5">{importError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Import Template Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read-only CV Inspection Modal */}
      {previewCV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-100 border border-slate-300 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Viewing CV: {previewCV.fullName} ({previewCV.title})
                </h3>
                <p className="text-xs text-slate-500">Read-Only Administrator View</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCV(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <CVTemplateRenderer
                cv={previewCV}
                template={
                  templates.find((t) => t.id === previewCV.templateId) || templates[0]
                }
                editable={false}
                isPremiumUser={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
