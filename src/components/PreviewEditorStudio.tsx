import React, { useRef, useState, useEffect } from 'react';
import {
  Save,
  Download,
  FileDown,
  ArrowLeft,
  Loader2,
  Check,
  Cloud,
  Lock,
  Plus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { CVDocument, CVTemplate, RemovableFieldKey, SyncStatus, UserProfile } from '../types/cv';
import { CVTemplateRenderer } from './CVTemplateRenderer';
import { REMOVABLE_FIELD_LABELS } from './CVFormWorkspace';
import { exportCVToPdf } from '../lib/exportPdf';
import { generateWordDocx } from '../lib/exportWord';

interface PreviewEditorStudioProps {
  cv: CVDocument;
  templates: CVTemplate[];
  user: UserProfile;
  syncStatus: SyncStatus;
  lastSyncedTime: string | null;
  onChangeCV: (updated: CVDocument) => void;
  onBlurSync: () => void;
  onManualSaveChanges: () => Promise<boolean>;
  onBackToForm: () => void;
  onOpenPaywall: (reason: string) => void;
  onRecordPdfExport: () => Promise<void>;
  onRecordWordExport?: () => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const PreviewEditorStudio: React.FC<PreviewEditorStudioProps> = ({
  cv,
  templates,
  user,
  syncStatus,
  lastSyncedTime,
  onChangeCV,
  onBlurSync,
  onManualSaveChanges,
  onBackToForm,
  onOpenPaywall,
  onRecordPdfExport,
  onRecordWordExport,
  onNotify
}) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const exportSheetRef = useRef<HTMLDivElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [snapshots, setSnapshots] = useState<Partial<Record<RemovableFieldKey, any>>>({});

  // Responsive A4 Mobile Scaling (scales 794px A4 sheet down to ~0.4-0.48 on mobile screens)
  const [autoScale, setAutoScale] = useState<number>(1);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [sheetHeight, setSheetHeight] = useState<number>(1123);

  useEffect(() => {
    const updateScale = () => {
      const container = previewContainerRef.current;
      const availableWidth = container
        ? container.clientWidth - 16
        : window.innerWidth - 24;
      const a4WidthPx = 794;
      if (availableWidth < a4WidthPx) {
        const computed = Math.max(0.35, Math.min(1, Number((availableWidth / a4WidthPx).toFixed(3))));
        setAutoScale(computed);
      } else {
        setAutoScale(1);
        setManualScale(null);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateScale();
        if (sheetRef.current) {
          setSheetHeight(sheetRef.current.offsetHeight || 1123);
        }
      });
      if (previewContainerRef.current) ro.observe(previewContainerRef.current);
      if (sheetRef.current) ro.observe(sheetRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      if (ro) ro.disconnect();
    };
  }, [cv, cv.templateId]);

  const activeScale = manualScale !== null ? manualScale : autoScale;

  const isPaidUser = user.plan !== 'free';
  const isPremium = isPaidUser;
  const activeTemplate =
    templates.find((t) => t.id === cv.templateId) || templates[0];

  const handleRemoveFieldInPreview = (key: RemovableFieldKey) => {
    const nextRemoved = Array.from(new Set<RemovableFieldKey>([...(cv.removedFields || []), key]));
    const updated: CVDocument = { ...cv, removedFields: nextRemoved };
    const snap: any = {};

    if (key === 'jobTitle') {
      snap.jobTitle = cv.jobTitle;
      updated.jobTitle = '';
    } else if (key === 'email') {
      snap.email = cv.email;
      updated.email = '';
    } else if (key === 'phone') {
      snap.phone = cv.phone;
      updated.phone = '';
    } else if (key === 'address') {
      snap.address = cv.address;
      updated.address = '';
    } else if (key === 'linkedinUrl') {
      snap.linkedinUrl = cv.linkedinUrl;
      updated.linkedinUrl = '';
    } else if (key === 'portfolioUrl') {
      snap.portfolioUrl = cv.portfolioUrl;
      updated.portfolioUrl = '';
    } else if (key === 'photoDataUrl') {
      snap.photoDataUrl = cv.photoDataUrl;
      updated.photoDataUrl = '';
    } else if (key === 'summary') {
      snap.rawSummary = cv.rawSummary;
      snap.summary = cv.summary;
      updated.rawSummary = '';
      updated.summary = '';
    } else if (key === 'experience') {
      snap.experience = cv.experience;
      updated.experience = [];
    } else if (key === 'education') {
      snap.education = cv.education;
      updated.education = [];
    } else if (key === 'skills') {
      snap.skills = cv.skills;
      snap.skillGroups = cv.skillGroups;
      updated.skills = [];
      updated.skillGroups = [];
    } else if (key === 'projects') {
      snap.projects = cv.projects;
      updated.projects = [];
    } else if (key === 'languages') {
      snap.languages = cv.languages;
      updated.languages = [];
    } else if (key === 'certifications') {
      snap.certifications = cv.certifications;
      updated.certifications = [];
    } else if (key === 'references') {
      snap.references = cv.references;
      snap.referencesOnRequest = cv.referencesOnRequest;
      updated.references = [];
      updated.referencesOnRequest = false;
    }

    setSnapshots((prev) => ({ ...prev, [key]: snap }));
    onChangeCV(updated);
    onBlurSync();
    onNotify(`${REMOVABLE_FIELD_LABELS[key]} removed from CV & PDF.`, 'warning');
  };

  const handleRestoreFieldInPreview = (key: RemovableFieldKey) => {
    const nextRemoved = (cv.removedFields || []).filter((k) => k !== key);
    const snap = snapshots[key] || {};
    const updated: CVDocument = { ...cv, removedFields: nextRemoved };

    if (key === 'jobTitle') updated.jobTitle = snap.jobTitle || '';
    if (key === 'email') updated.email = snap.email || '';
    if (key === 'phone') updated.phone = snap.phone || '';
    if (key === 'address') updated.address = snap.address || '';
    if (key === 'linkedinUrl') updated.linkedinUrl = snap.linkedinUrl || '';
    if (key === 'portfolioUrl') updated.portfolioUrl = snap.portfolioUrl || '';
    if (key === 'photoDataUrl') updated.photoDataUrl = snap.photoDataUrl || '';
    if (key === 'summary') {
      updated.rawSummary = snap.rawSummary || '';
      updated.summary = snap.summary || '';
    }
    if (key === 'experience') {
      updated.experience =
        snap.experience && snap.experience.length > 0
          ? snap.experience
          : [
              {
                id: `exp_${Date.now()}`,
                company: 'Company Name',
                role: 'Role Title',
                startDate: 'Jan 2024',
                endDate: 'Present',
                rawDescription: '',
                bullets: ['Delivered key impact and measurable growth.']
              }
            ];
    }
    if (key === 'education') {
      updated.education =
        snap.education && snap.education.length > 0
          ? snap.education
          : [
              {
                id: `edu_${Date.now()}`,
                degree: 'Bachelor of Science',
                institution: 'University Name',
                year: '2020 - 2024',
                details: ''
              }
            ];
    }
    if (key === 'skills') {
      updated.skills = snap.skills && snap.skills.length > 0 ? snap.skills : ['Skill 1', 'Skill 2'];
      updated.skillGroups = snap.skillGroups || [];
    }
    if (key === 'projects') {
      updated.projects =
        snap.projects && snap.projects.length > 0
          ? snap.projects
          : [
              {
                id: `proj_${Date.now()}`,
                name: 'Project Name',
                roleOrTech: 'Tech Stack',
                link: '',
                description: 'Project description and results.'
              }
            ];
    }
    if (key === 'languages') {
      updated.languages =
        snap.languages && snap.languages.length > 0 ? snap.languages : ['English (Fluent)'];
    }
    if (key === 'certifications') {
      updated.certifications =
        snap.certifications && snap.certifications.length > 0
          ? snap.certifications
          : ['Professional Certification'];
    }
    if (key === 'references') {
      updated.references = snap.references || [];
      updated.referencesOnRequest =
        snap.referencesOnRequest !== undefined ? snap.referencesOnRequest : true;
    }

    onChangeCV(updated);
    onBlurSync();
    onNotify(`${REMOVABLE_FIELD_LABELS[key]} restored.`, 'success');
  };

  // Requirement 6: Before export, wait for Firestore sync to complete, then show confirmation toast
  const ensureSyncedBeforeExport = async (): Promise<void> => {
    const syncedOk = await onManualSaveChanges();
    if (syncedOk) {
      onNotify('Aap ke changes save ho gaye hain, ab download karein.', 'success');
    } else {
      onNotify('Cloud sync pending, local saved', 'warning');
    }
  };

  const handleDownloadPdf = async () => {
    const targetElement = sheetRef.current || exportSheetRef.current;
    if (!targetElement) return;

    // Check paid template lock (only 2 templates are Free)
    if (activeTemplate.isPremium && !isPaidUser) {
      onOpenPaywall(
        `"${activeTemplate.name}" ek Paid template hai. Unlock karne ke liye Starter (Rs. 200), Pro (Rs. 500) ya Unlimited (Rs. 1000) plan select karein, ya 2 Free templates istemal karein.`
      );
      return;
    }

    // Check PDF export limits
    const pdfLimit =
      user.pdfLimit !== undefined
        ? user.pdfLimit
        : user.plan === 'starter' || user.plan === 'pro'
        ? 10
        : user.plan === 'unlimited' || user.plan === 'premium'
        ? 999999
        : 1;

    if (
      user.plan !== 'unlimited' &&
      user.plan !== 'premium' &&
      (user.pdfExportsUsed || 0) >= pdfLimit
    ) {
      onOpenPaywall(
        user.plan === 'free'
          ? 'Free tier par sirf 1 PDF download allow hai. Mazid 10 downloads aur tamam templates unlock karne ke liye Starter (Rs. 200) ya Pro (Rs. 500) plan select karein.'
          : `Aap ke ${user.plan.toUpperCase()} plan ki maximum PDF downloads (${pdfLimit}) limit mukammal ho chuki hai. Unlimited downloads ke liye Rs. 1000 plan mein upgrade karein.`
      );
      return;
    }

    setExportingPdf(true);
    onNotify('PDF file generation in progress, please wait...', 'warning');
    try {
      await ensureSyncedBeforeExport();
      await exportCVToPdf(targetElement, cv, activeTemplate);
      await onRecordPdfExport();
      onNotify('PDF download successfully completed!', 'success');
    } catch {
      onNotify('PDF export ke doran masla aaya.', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadWord = async () => {
    // Word (.docx) is only available on paid plans
    if (!isPaidUser) {
      onOpenPaywall(
        'Word (.docx) format mein structured download sirf Paid plans mein available hai. Starter (Rs. 200) mein 2 Word downloads, Pro (Rs. 500) mein 10 Word downloads, aur Unlimited (Rs. 1000) mein unlimited downloads shamil hain.'
      );
      return;
    }

    // Check Word export limits
    const wordLimit =
      user.wordLimit !== undefined
        ? user.wordLimit
        : user.plan === 'starter'
        ? 2
        : user.plan === 'pro'
        ? 10
        : user.plan === 'unlimited' || user.plan === 'premium'
        ? 999999
        : 0;

    if (
      user.plan !== 'unlimited' &&
      user.plan !== 'premium' &&
      (user.wordExportsUsed || 0) >= wordLimit
    ) {
      onOpenPaywall(
        `Aap ke ${user.plan.toUpperCase()} plan ki Word (.docx) downloads (${wordLimit}) limit mukammal ho chuki hai. Mazid downloads ke liye Pro (Rs. 500) ya Unlimited (Rs. 1000) plan select karein.`
      );
      return;
    }

    setExportingWord(true);
    onNotify('Word (.docx) file generation in progress, please wait...', 'warning');
    try {
      await ensureSyncedBeforeExport();
      await generateWordDocx(cv, activeTemplate);
      await onRecordWordExport?.();
      onNotify('Word (.docx) download successfully completed!', 'success');
    } catch {
      onNotify('Word (.docx) export ke doran masla aaya.', 'error');
    } finally {
      setExportingWord(false);
    }
  };

  const handleManualSaveClick = async () => {
    setSavingManual(true);
    try {
      const ok = await onManualSaveChanges();
      if (ok) {
        onNotify('Aap ke changes save ho gaye hain, ab download karein.', 'success');
      } else {
        onNotify('Cloud sync pending, local saved', 'warning');
      }
    } finally {
      setSavingManual(false);
    }
  };

  const removedFieldsList = cv.removedFields || [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      {/* Action Toolbar: "Save Changes", "Download PDF", "Download Word", and "Back to Form" */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBackToForm}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Form</span>
          </button>

          <div className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">
              Inline Editing Mode Active
            </span>
            <span className="mx-1.5">·</span>
            <span>
              Click any text to edit · Hover any section/field to Remove · PDF always exports White &amp; Black
            </span>
          </div>
        </div>

        {/* Sync Status + Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 mr-2">
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
            {syncStatus === 'syncing' && <span>Syncing to Firestore...</span>}
            {syncStatus === 'local-saved' && (
              <span className="text-amber-700 dark:text-amber-400">Saved locally (debounced)</span>
            )}
            {syncStatus === 'synced' && (
              <span className="text-emerald-700 dark:text-emerald-400">
                Synced {lastSyncedTime ? `(${lastSyncedTime})` : ''}
              </span>
            )}
            {syncStatus === 'offline-queued' && (
              <span className="text-amber-700 dark:text-amber-400">
                Cloud sync pending, local saved
              </span>
            )}
            {syncStatus === 'idle' && <span>Auto-save active</span>}
          </div>

          <button
            type="button"
            disabled={savingManual}
            onClick={handleManualSaveClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {savingManual ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Changes</span>
          </button>

          <button
            type="button"
            disabled={exportingPdf || exportingWord || savingManual}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {exportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={exportingPdf || exportingWord || savingManual}
            onClick={handleDownloadWord}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {exportingWord ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Generating Word...</span>
              </>
            ) : !isPaidUser ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Download Word</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Word</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Removed Fields / Undo Bar in Live Editor */}
      {removedFieldsList.length > 0 && (
        <div className="mb-6 p-3.5 rounded-xl bg-amber-50/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Removed Fields ({removedFieldsList.length}):
            </span>
            {removedFieldsList.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleRestoreFieldInPreview(key)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Restore {REMOVABLE_FIELD_LABELS[key]}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              handleRestoreFieldInPreview(removedFieldsList[removedFieldsList.length - 1])
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Last Delete</span>
          </button>
        </div>
      )}

      {/* Template Switcher Bar inside Preview Studio */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Switch Template Layout (Preserves All Edits):
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {templates.map((tpl) => {
            const active = tpl.id === cv.templateId;
            const locked = tpl.isPremium && !isPremium;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  if (locked) {
                    onOpenPaywall(
                      `"${tpl.name}" ek Premium template hai. Saare 6 templates unlock karne ke liye Premium mein upgrade karein.`
                    );
                    return;
                  }
                  onChangeCV({ ...cv, templateId: tpl.id });
                  onBlurSync();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-500'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <span>{tpl.name}</span>
                {locked ? (
                  <Lock className="w-3 h-3 text-amber-500" />
                ) : active ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editable CV Paper Canvas (Responsive Scale-Down on Mobile so full 210mm A4 fits without horizontal scroll) */}
      <div
        ref={previewContainerRef}
        className="bg-slate-200/75 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-2 sm:p-6 md:p-8 overflow-hidden flex flex-col items-center"
      >
        {/* Mobile Responsive Scale Controls Bar */}
        {autoScale < 1 && (
          <div className="w-full flex items-center justify-between gap-2 mb-2.5 px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-300/80 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
            <span className="truncate">
              A4 Mobile Fit ({Math.round(activeScale * 100)}%)
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setManualScale((prev) =>
                    Math.max(0.35, Number(((prev ?? autoScale) - 0.08).toFixed(2)))
                  )
                }
                className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setManualScale(null)}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  manualScale === null
                    ? 'bg-slate-900 text-white dark:bg-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
                title="Fit A4 to Mobile Screen"
              >
                <span className="inline-flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" />
                  Fit
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setManualScale((prev) =>
                    Math.min(1, Number(((prev ?? autoScale) + 0.08).toFixed(2)))
                  )
                }
                className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div
          className={`w-full flex justify-center ${
            manualScale !== null && manualScale > autoScale
              ? 'overflow-x-auto'
              : 'overflow-hidden'
          }`}
          style={{
            height:
              activeScale < 1
                ? `${Math.ceil(sheetHeight * activeScale) + 12}px`
                : 'auto'
          }}
        >
          <div
            className="cv-scale-wrapper shrink-0"
            style={{
              width: '794px',
              minWidth: '794px',
              maxWidth: '794px',
              transform: activeScale < 1 ? `scale(${activeScale})` : 'none',
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
          >
            <CVTemplateRenderer
              sheetRef={sheetRef}
              cv={cv}
              template={activeTemplate}
              editable={true}
              isPremiumUser={isPremium}
              onChange={onChangeCV}
              onBlurSync={onBlurSync}
              onRemoveField={handleRemoveFieldInPreview}
            />
          </div>
        </div>
      </div>

      {/* Dedicated Clean Static Print/PDF Sheet (editable={false} so zero UI buttons, placeholders, or drag handles exist in PDF) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          width: '794px',
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        <CVTemplateRenderer
          sheetRef={exportSheetRef}
          cv={cv}
          template={activeTemplate}
          editable={false}
          isPremiumUser={true}
        />
      </div>
    </div>
  );
};
