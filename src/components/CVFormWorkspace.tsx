import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Lock,
  Check,
  FileText,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  User,
  Briefcase,
  Award,
  Sparkles
} from 'lucide-react';
import {
  CVDocument,
  CVTemplate,
  WorkExperienceItem,
  EducationItem,
  ProjectItem,
  ReferenceItem,
  ProficiencyItem,
  RemovableFieldKey
} from '../types/cv';
import { PhotoUploader } from './PhotoUploaderModal';
import { CVTemplateRenderer } from './CVTemplateRenderer';
import {
  inferLanguageProficiencyAndPercentage,
  inferSkillTierAndPercentage
} from '../lib/textSanitizer';

export const SKILL_COMMAND_OPTIONS: Array<{ label: string; level: string; percentage: number }> = [
  { label: 'Expert / Master (100%)', level: 'Expert', percentage: 100 },
  { label: 'Expert (90%)', level: 'Expert', percentage: 90 },
  { label: 'Proficient / Advanced (85%)', level: 'Proficient', percentage: 85 },
  { label: 'Intermediate (75%)', level: 'Intermediate', percentage: 75 },
  { label: 'Basic / Beginner (60%)', level: 'Basic', percentage: 60 }
];

export const LANGUAGE_COMMAND_OPTIONS: Array<{ label: string; level: string; percentage: number }> = [
  { label: 'Native / Bilingual (100%)', level: 'Native / Bilingual', percentage: 100 },
  { label: 'Fluent — C2 (95%)', level: 'Fluent (C2)', percentage: 95 },
  { label: 'Fluent — C1 (90%)', level: 'Fluent (C1)', percentage: 90 },
  { label: 'Professional — B2 (80%)', level: 'Professional (B2)', percentage: 80 },
  { label: 'Conversational — B1 (75%)', level: 'Conversational (B1)', percentage: 75 },
  { label: 'Basic — A2 (60%)', level: 'Basic (A2)', percentage: 60 }
];

interface CVFormWorkspaceProps {
  cv: CVDocument;
  templates: CVTemplate[];
  isPremiumUser: boolean;
  isBuildingAI: boolean;
  draftSavedTimestamp: string | null;
  onChangeCV: (updated: CVDocument) => void;
  onLoadSampleData: () => void;
  onClearForm?: () => void;
  onBuildCV: () => Promise<void>;
  onOpenPaywall: (reason: string) => void;
}

export const REMOVABLE_FIELD_LABELS: Record<RemovableFieldKey, string> = {
  jobTitle: 'Job Title',
  email: 'Email Address',
  phone: 'Phone Number',
  address: 'Address / Location',
  linkedinUrl: 'LinkedIn URL',
  portfolioUrl: 'Portfolio URL',
  photoDataUrl: 'Portrait Photo',
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  languages: 'Languages',
  certifications: 'Certifications',
  references: 'References'
};

type WizardStep = 1 | 2 | 3;

const WIZARD_STEPS: Array<{
  step: WizardStep;
  shortTitle: string;
  fullTitle: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    step: 1,
    shortTitle: 'Personal Info',
    fullTitle: 'Step 1 of 3: Personal Info',
    subtitle: 'Contact details, 35×45mm photo & raw summary',
    icon: User
  },
  {
    step: 2,
    shortTitle: 'Education & Experience',
    fullTitle: 'Step 2 of 3: Education & Experience',
    subtitle: 'Work history roles & academic qualifications',
    icon: Briefcase
  },
  {
    step: 3,
    shortTitle: 'Skills & Extras',
    fullTitle: 'Step 3 of 3: Skills & Final Details',
    subtitle: 'Skills, projects, certifications, languages & references',
    icon: Award
  }
];

export const CVFormWorkspace: React.FC<CVFormWorkspaceProps> = ({
  cv,
  templates,
  isPremiumUser,
  isBuildingAI,
  draftSavedTimestamp,
  onChangeCV,
  onLoadSampleData,
  onClearForm,
  onBuildCV,
  onOpenPaywall
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState((cv.skills || []).join(', '));
  const [langInput, setLangInput] = useState((cv.languages || []).join(', '));
  const [certInput, setCertInput] = useState((cv.certifications || []).join('\n'));
  const [previewPulse, setPreviewPulse] = useState(false);

  // Undo & Restore snapshot storage so accidentally deleted fields restore with their data
  const [fieldSnapshots, setFieldSnapshots] = useState<Partial<Record<RemovableFieldKey, any>>>({});
  const [undoStack, setUndoStack] = useState<RemovableFieldKey[]>([]);

  const wizardTopRef = useRef<HTMLDivElement>(null);

  const skillsKey = (cv.skills || []).join('|');
  const langsKey = (cv.languages || []).join('|');
  const certsKey = (cv.certifications || []).join('|');

  useEffect(() => {
    setSkillInput((cv.skills || []).join(', '));
    setLangInput((cv.languages || []).join(', '));
    setCertInput((cv.certifications || []).join('\n'));
  }, [cv.id, cv.isPolished]);

  // Also sync inputs if cv arrays were populated from storage/sample while local input was empty
  useEffect(() => {
    if (!skillInput.trim() && (cv.skills || []).length > 0) {
      setSkillInput((cv.skills || []).join(', '));
    }
    if (!langInput.trim() && (cv.languages || []).length > 0) {
      setLangInput((cv.languages || []).join(', '));
    }
    if (!certInput.trim() && (cv.certifications || []).length > 0) {
      setCertInput((cv.certifications || []).join('\n'));
    }
  }, [skillsKey, langsKey, certsKey]);

  const removedSet = new Set<RemovableFieldKey>(cv.removedFields || []);
  const isRemoved = (key: RemovableFieldKey) => removedSet.has(key);

  const selectedTemplate =
    templates.find((t) => t.id === cv.templateId) || templates[0];

  const triggerPreviewSyncFeedback = () => {
    setPreviewPulse(true);
    window.setTimeout(() => setPreviewPulse(false), 600);
  };

  const scrollToWizardTop = () => {
    if (wizardTopRef.current) {
      wizardTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const updateField = <K extends keyof CVDocument>(field: K, value: CVDocument[K]) => {
    onChangeCV({ ...cv, [field]: value });
    if (validationErrors[field as string]) {
      const next = { ...validationErrors };
      delete next[field as string];
      setValidationErrors(next);
    }
  };

  // Remove a field or section completely from state (and PDF) while saving snapshot for Undo
  const handleRemoveField = (key: RemovableFieldKey) => {
    const nextRemoved = Array.from(new Set<RemovableFieldKey>([...(cv.removedFields || []), key]));
    const updated: CVDocument = { ...cv, removedFields: nextRemoved };

    const snapshotVal: any = {};
    if (key === 'jobTitle') {
      snapshotVal.jobTitle = cv.jobTitle;
      updated.jobTitle = '';
    } else if (key === 'email') {
      snapshotVal.email = cv.email;
      updated.email = '';
    } else if (key === 'phone') {
      snapshotVal.phone = cv.phone;
      updated.phone = '';
    } else if (key === 'address') {
      snapshotVal.address = cv.address;
      updated.address = '';
    } else if (key === 'linkedinUrl') {
      snapshotVal.linkedinUrl = cv.linkedinUrl;
      updated.linkedinUrl = '';
    } else if (key === 'portfolioUrl') {
      snapshotVal.portfolioUrl = cv.portfolioUrl;
      updated.portfolioUrl = '';
    } else if (key === 'photoDataUrl') {
      snapshotVal.photoDataUrl = cv.photoDataUrl;
      updated.photoDataUrl = '';
    } else if (key === 'summary') {
      snapshotVal.rawSummary = cv.rawSummary;
      snapshotVal.summary = cv.summary;
      updated.rawSummary = '';
      updated.summary = '';
    } else if (key === 'experience') {
      snapshotVal.experience = cv.experience;
      updated.experience = [];
    } else if (key === 'education') {
      snapshotVal.education = cv.education;
      updated.education = [];
    } else if (key === 'skills') {
      snapshotVal.skills = cv.skills;
      snapshotVal.skillLevels = cv.skillLevels;
      snapshotVal.skillGroups = cv.skillGroups;
      snapshotVal.skillInput = skillInput;
      updated.skills = [];
      updated.skillLevels = [];
      updated.skillGroups = [];
      setSkillInput('');
    } else if (key === 'projects') {
      snapshotVal.projects = cv.projects;
      updated.projects = [];
    } else if (key === 'languages') {
      snapshotVal.languages = cv.languages;
      snapshotVal.languageLevels = cv.languageLevels;
      snapshotVal.langInput = langInput;
      updated.languages = [];
      updated.languageLevels = [];
      setLangInput('');
    } else if (key === 'certifications') {
      snapshotVal.certifications = cv.certifications;
      snapshotVal.certInput = certInput;
      updated.certifications = [];
      setCertInput('');
    } else if (key === 'references') {
      snapshotVal.references = cv.references;
      snapshotVal.referencesOnRequest = cv.referencesOnRequest;
      updated.references = [];
      updated.referencesOnRequest = false;
    }

    setFieldSnapshots((prev) => ({ ...prev, [key]: snapshotVal }));
    setUndoStack((prev) => [...prev.filter((k) => k !== key), key]);

    const nextErrors = { ...validationErrors };
    delete nextErrors[key];
    if (key === 'summary') delete nextErrors.rawSummary;
    setValidationErrors(nextErrors);

    onChangeCV(updated);
  };

  // Restore a removed field or section (Undo / Add Field)
  const handleRestoreField = (key: RemovableFieldKey) => {
    const nextRemoved = (cv.removedFields || []).filter((k) => k !== key);
    const snap = fieldSnapshots[key] || {};
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
                company: '',
                role: '',
                startDate: '',
                endDate: '',
                rawDescription: '',
                bullets: []
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
                degree: '',
                institution: '',
                year: '',
                details: ''
              }
            ];
    }
    if (key === 'skills') {
      updated.skills = snap.skills || [];
      updated.skillLevels = snap.skillLevels || [];
      updated.skillGroups = snap.skillGroups || [];
      setSkillInput(snap.skillInput || (snap.skills || []).join(', '));
    }
    if (key === 'projects') {
      updated.projects =
        snap.projects && snap.projects.length > 0
          ? snap.projects
          : [
              {
                id: `proj_${Date.now()}`,
                name: '',
                roleOrTech: '',
                link: '',
                description: ''
              }
            ];
    }
    if (key === 'languages') {
      updated.languages = snap.languages || [];
      updated.languageLevels = snap.languageLevels || [];
      setLangInput(snap.langInput || (snap.languages || []).join(', '));
    }
    if (key === 'certifications') {
      updated.certifications = snap.certifications || [];
      setCertInput(snap.certInput || (snap.certifications || []).join('\n'));
    }
    if (key === 'references') {
      updated.references =
        snap.references && snap.references.length > 0
          ? snap.references
          : [
              {
                id: `ref_${Date.now()}`,
                name: '',
                designation: '',
                company: '',
                contact: ''
              }
            ];
      updated.referencesOnRequest =
        snap.referencesOnRequest !== undefined ? snap.referencesOnRequest : true;
    }

    setUndoStack((prev) => prev.filter((k) => k !== key));
    onChangeCV(updated);
  };

  const handleUndoLastRemove = () => {
    if (undoStack.length === 0) {
      const removedList = cv.removedFields || [];
      if (removedList.length > 0) {
        handleRestoreField(removedList[removedList.length - 1]);
      }
      return;
    }
    const lastKey = undoStack[undoStack.length - 1];
    handleRestoreField(lastKey);
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!cv.fullName.trim()) {
      errors.fullName = 'Full Name zaroori hai.';
    }
    if (!isRemoved('jobTitle') && !cv.jobTitle.trim()) {
      errors.jobTitle = 'Job Title likhein ya "Remove" button se hata dein.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isRemoved('email')) {
      if (!cv.email.trim()) {
        errors.email = 'Email address likhein ya "Remove" button se hata dein.';
      } else if (!emailRegex.test(cv.email.trim())) {
        errors.email = 'Durust email format likhein (e.g., name@domain.com).';
      }
    }

    const phoneRegex = /^[+]?[0-9\s\-()]{7,22}$/;
    if (!isRemoved('phone')) {
      if (!cv.phone.trim()) {
        errors.phone = 'Phone number likhein ya "Remove" button se hata dein.';
      } else if (!phoneRegex.test(cv.phone.trim())) {
        errors.phone = 'Durust phone number likhein (e.g., +92 300 1234567).';
      }
    }

    if (!isRemoved('summary') && !cv.rawSummary.trim() && !cv.summary.trim()) {
      errors.rawSummary =
        'Professional Summary likhein ya "Remove Section" button se hata dein.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = (targetStep: WizardStep) => {
    if (currentStep === 1 && targetStep > 1) {
      if (!validateStep1()) {
        scrollToWizardTop();
        return;
      }
    }
    setCurrentStep(targetStep);
    triggerPreviewSyncFeedback();
    scrollToWizardTop();
  };

  const handlePrevStep = (targetStep: WizardStep) => {
    setCurrentStep(targetStep);
    triggerPreviewSyncFeedback();
    scrollToWizardTop();
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setCurrentStep(1);
      scrollToWizardTop();
      return;
    }
    await onBuildCV();
  };

  const handleSelectTemplate = (tpl: CVTemplate) => {
    if (tpl.isPremium && !isPremiumUser) {
      onOpenPaywall(
        `"${tpl.name}" ek Paid template hai. Free plan mein 2 templates (Minimalist Clean aur Timeline Classic) shamil hain. Tamam templates unlock karne ke liye Starter (Rs. 200), Pro (Rs. 500) ya Unlimited (Rs. 1000) plan select karein.`
      );
      return;
    }
    updateField('templateId', tpl.id);
    triggerPreviewSyncFeedback();
  };

  const removedFieldsList = cv.removedFields || [];
  const activeStepMeta = WIZARD_STEPS.find((s) => s.step === currentStep) || WIZARD_STEPS[0];
  const progressPercentage = currentStep === 1 ? 33.33 : currentStep === 2 ? 66.66 : 100;

  return (
    <div ref={wizardTopRef} className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      {/* Workspace Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {activeStepMeta.fullTitle}
            </span>
            {draftSavedTimestamp && (
              <>
                <span>·</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  Draft auto-saved ({draftSavedTimestamp})
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Step-by-Step CV Builder Wizard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onClearForm && (
            <button
              type="button"
              onClick={() => {
                onClearForm();
                setSkillInput('');
                setLangInput('English, Urdu');
                setCertInput('');
                setValidationErrors({});
                setUndoStack([]);
                setCurrentStep(1);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/60 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear / Reset Form</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onLoadSampleData();
              setValidationErrors({});
              setUndoStack([]);
              triggerPreviewSyncFeedback();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Load Sample Career Data</span>
          </button>
        </div>
      </div>

      {/* Removed Fields & Sections Undo / Restore Bar */}
      {removedFieldsList.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Removed Fields / Sections ({removedFieldsList.length})</span>
              <span className="text-[11px] font-normal text-slate-600 dark:text-slate-300">
                — Yeh fields PDF mein print nahi hongi. Kisi bhi waqt wapas add karein:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {removedFieldsList.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRestoreField(key)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Add {REMOVABLE_FIELD_LABELS[key]}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleUndoLastRemove}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-lg shrink-0 self-start sm:self-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Last Delete</span>
          </button>
        </div>
      )}

      {/* Side-by-Side Split: Left Multi-Step Wizard (6 cols) + Right Template Picker & Live Preview (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: 3-Step Wizard Form */}
        <form onSubmit={handleSubmitForm} className="lg:col-span-6 space-y-6">
          {/* 1. HEADER PROGRESS BAR & INTERACTIVE STEP INDICATOR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {activeStepMeta.fullTitle}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeStepMeta.subtitle}
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>

            {/* Progress Track Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 dark:bg-blue-600 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Interactive Step Tabs (1, 2, 3) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {WIZARD_STEPS.map((item) => {
                const Icon = item.icon;
                const isActive = currentStep === item.step;
                const isCompleted = currentStep > item.step;

                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      if (item.step > currentStep) {
                        handleNextStep(item.step);
                      } else if (item.step < currentStep) {
                        handlePrevStep(item.step);
                      }
                    }}
                    className={`group flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-slate-900 dark:border-blue-500 bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                        : isCompleted
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive
                          ? 'bg-white text-slate-900 dark:text-blue-600'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">
                        Step {item.step}
                      </div>
                      <div className="text-xs font-bold truncate flex items-center gap-1">
                        <Icon className="w-3 h-3 shrink-0 hidden sm:inline" />
                        <span className="truncate">{item.shortTitle}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ====================================================================
              STEP 1: PERSONAL & CONTACT INFO + PHOTO + PROFESSIONAL SUMMARY
             ==================================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Personal & Contact Details Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Personal & Contact Information
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Apna naam, job title, contact info aur 35×45mm photo add karein
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Click Remove to hide any field
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CV Document Title
                  </label>
                  <input
                    type="text"
                    value={cv.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g., Senior Software Engineer CV"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900 dark:focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={cv.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      placeholder="e.g., Zulqarnain Bukhari"
                      className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border rounded-lg focus:outline-none ${
                        validationErrors.fullName
                          ? 'border-red-500 bg-red-50/30'
                          : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-blue-500'
                      }`}
                    />
                    {validationErrors.fullName && (
                      <p className="text-[11px] text-red-600 mt-1">{validationErrors.fullName}</p>
                    )}
                  </div>

                  {!isRemoved('jobTitle') && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Target Job Title
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveField('jobTitle')}
                          title="Remove Job Title field"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={cv.jobTitle}
                        onChange={(e) => updateField('jobTitle', e.target.value)}
                        placeholder="e.g., Primary School Teacher / Banking Officer"
                        className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border rounded-lg focus:outline-none ${
                          validationErrors.jobTitle
                            ? 'border-red-500 bg-red-50/30'
                            : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-blue-500'
                        }`}
                      />
                      {validationErrors.jobTitle && (
                        <p className="text-[11px] text-red-600 mt-1">{validationErrors.jobTitle}</p>
                      )}
                    </div>
                  )}
                </div>

                {(!isRemoved('email') || !isRemoved('phone')) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!isRemoved('email') && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Email Address
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveField('email')}
                            title="Remove Email field"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                        <input
                          type="email"
                          value={cv.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          placeholder="name@example.com"
                          className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border rounded-lg focus:outline-none ${
                            validationErrors.email
                              ? 'border-red-500 bg-red-50/30'
                              : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-blue-500'
                          }`}
                        />
                        {validationErrors.email && (
                          <p className="text-[11px] text-red-600 mt-1">{validationErrors.email}</p>
                        )}
                      </div>
                    )}

                    {!isRemoved('phone') && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Phone Number
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveField('phone')}
                            title="Remove Phone Number field"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                        <input
                          type="tel"
                          value={cv.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          placeholder="+92 300 1234567"
                          className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border rounded-lg font-mono focus:outline-none ${
                            validationErrors.phone
                              ? 'border-red-500 bg-red-50/30'
                              : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-blue-500'
                          }`}
                        />
                        {validationErrors.phone && (
                          <p className="text-[11px] text-red-600 mt-1">{validationErrors.phone}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!isRemoved('address') && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Address / Location
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveField('address')}
                        title="Remove Address field"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cv.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder="Sukkur / Karachi / Lahore, Pakistan"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900 dark:focus:border-blue-500"
                    />
                  </div>
                )}

                {(!isRemoved('linkedinUrl') || !isRemoved('portfolioUrl')) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!isRemoved('linkedinUrl') && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            LinkedIn URL
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveField('linkedinUrl')}
                            title="Remove LinkedIn URL field"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={cv.linkedinUrl}
                          onChange={(e) => updateField('linkedinUrl', e.target.value)}
                          placeholder="linkedin.com/in/username"
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900 dark:focus:border-blue-500"
                        />
                      </div>
                    )}

                    {!isRemoved('portfolioUrl') && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Portfolio / Website URL
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveField('portfolioUrl')}
                            title="Remove Portfolio URL field"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={cv.portfolioUrl}
                          onChange={(e) => updateField('portfolioUrl', e.target.value)}
                          placeholder="github.com/username or yourportfolio.dev"
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900 dark:focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Passport Photo Upload with 35x45mm crop */}
                {!isRemoved('photoDataUrl') && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Passport Portrait Photo (35×45mm Crop)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveField('photoDataUrl')}
                        title="Remove Photo Slot"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Photo Slot</span>
                      </button>
                    </div>
                    <PhotoUploader
                      currentPhotoDataUrl={cv.photoDataUrl}
                      onPhotoChange={(dataUrl) => updateField('photoDataUrl', dataUrl)}
                    />
                  </div>
                )}
              </div>

              {/* Professional Summary (Raw Text Area) */}
              {!isRemoved('summary') && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Professional Summary (Raw Text)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Apne baare mein kisi bhi zubaan (English, Urdu, Roman Urdu ya Roman Hindi) mein likhein. AI isay 3 se 5 lines ke fluent, professional corporate English summary mein convert aur translate karega.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveField('summary')}
                      title="Remove Professional Summary section"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg shrink-0 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Section</span>
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={cv.rawSummary}
                    onChange={(e) => {
                      onChangeCV({
                        ...cv,
                        rawSummary: e.target.value,
                        summary: ''
                      });
                      if (validationErrors.rawSummary) {
                        const next = { ...validationErrors };
                        delete next.rawSummary;
                        setValidationErrors(next);
                      }
                    }}
                    placeholder="e.g., Main 5 saal se banking trainee aur primary school teacher hoon..."
                    className={`w-full px-3 py-2.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border rounded-lg leading-relaxed focus:outline-none ${
                      validationErrors.rawSummary
                        ? 'border-red-500 bg-red-50/30'
                        : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-blue-500'
                    }`}
                  />
                  {validationErrors.rawSummary && (
                    <p className="text-[11px] text-red-600">{validationErrors.rawSummary}</p>
                  )}
                </div>
              )}

              {Object.keys(validationErrors).length > 0 && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>
                    Baraye meharbani agay barhne se pehle required fields mukammal karein ya Remove button se hata dein.
                  </span>
                </div>
              )}

              {/* STEP 1 NAVIGATION FOOTER */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleNextStep(2)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Next: Education & Experience</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ====================================================================
              STEP 2: EDUCATION & EXPERIENCE
             ==================================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Work Experience (Multiple Entries) */}
              {!isRemoved('experience') ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Work Experience
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Company ka naam upar aur Role + Period niche automatically arrange hoga.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextExp: WorkExperienceItem = {
                            id: `exp_${Date.now()}`,
                            company: '',
                            role: '',
                            startDate: '',
                            endDate: '',
                            rawDescription: '',
                            bullets: []
                          };
                          updateField('experience', [...cv.experience, nextExp]);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Experience</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveField('experience')}
                        title="Remove entire Work Experience section"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Section</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5 divide-y divide-slate-200 dark:divide-slate-800">
                    {cv.experience.map((exp, idx) => (
                      <div key={exp.id || idx} className={idx > 0 ? 'pt-5 space-y-3' : 'space-y-3'}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                            Experience #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = cv.experience.filter((_, i) => i !== idx);
                              if (remaining.length === 0) {
                                handleRemoveField('experience');
                              } else {
                                updateField('experience', remaining);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Entry</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Company / Organization Name (Top Line)
                            </label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, company: e.target.value, bullets: [] };
                                updateField('experience', next);
                              }}
                              placeholder="e.g., National Bank of Pakistan / SELD"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Role / Designation (Below Company)
                            </label>
                            <input
                              type="text"
                              value={exp.role}
                              onChange={(e) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, role: e.target.value, bullets: [] };
                                updateField('experience', next);
                              }}
                              placeholder="e.g., Trainee / Primary School Teacher"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Start Date
                            </label>
                            <input
                              type="text"
                              value={exp.startDate}
                              onChange={(e) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, startDate: e.target.value };
                                updateField('experience', next);
                              }}
                              placeholder="e.g., 2016 or Jan 2022"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              End Date
                            </label>
                            <input
                              type="text"
                              value={exp.endDate}
                              onChange={(e) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, endDate: e.target.value };
                                updateField('experience', next);
                              }}
                              placeholder="e.g., 2022 or Present"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Raw Responsibilities & Achievements
                          </label>
                          <textarea
                            rows={3}
                            value={exp.rawDescription}
                            onChange={(e) => {
                              const next = [...cv.experience];
                              next[idx] = { ...exp, rawDescription: e.target.value, bullets: [] };
                              updateField('experience', next);
                            }}
                            placeholder="Describe your responsibilities, achievements, and daily tasks..."
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Work Experience section removed.</span>
                  <button
                    type="button"
                    onClick={() => handleRestoreField('experience')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restore Work Experience</span>
                  </button>
                </div>
              )}

              {/* Education (Multiple Entries) */}
              {!isRemoved('education') ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">Education</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Degree, Major Subject, Institution, Year aur Percentage / CGPA add karein.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextEdu: EducationItem = {
                            id: `edu_${Date.now()}`,
                            degree: '',
                            majorSubject: '',
                            institution: '',
                            year: '',
                            details: ''
                          };
                          updateField('education', [...cv.education, nextEdu]);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Education</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveField('education')}
                        title="Remove entire Education section"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Section</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 divide-y divide-slate-200 dark:divide-slate-800">
                    {cv.education.map((edu, idx) => (
                      <div key={edu.id || idx} className={idx > 0 ? 'pt-4 space-y-3' : 'space-y-3'}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            Education #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = cv.education.filter((_, i) => i !== idx);
                              if (remaining.length === 0) {
                                handleRemoveField('education');
                              } else {
                                updateField('education', remaining);
                              }
                            }}
                            className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Entry</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Degree / Qualification
                            </label>
                            <input
                              type="text"
                              value={edu.degree}
                              onChange={(e) => {
                                const next = [...cv.education];
                                next[idx] = { ...edu, degree: e.target.value };
                                updateField('education', next);
                              }}
                              placeholder="e.g., BBA Hons / BS / Intermediate / Matric"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Major Subject
                            </label>
                            <input
                              type="text"
                              value={edu.majorSubject || ''}
                              onChange={(e) => {
                                const next = [...cv.education];
                                next[idx] = { ...edu, majorSubject: e.target.value };
                                updateField('education', next);
                              }}
                              placeholder="e.g., Finance / Computer Science / Pre-Engineering"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Institution / Board
                            </label>
                            <input
                              type="text"
                              value={edu.institution}
                              onChange={(e) => {
                                const next = [...cv.education];
                                next[idx] = { ...edu, institution: e.target.value };
                                updateField('education', next);
                              }}
                              placeholder="University of Sindh / BISE Sukkur"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Passing Year / Period
                            </label>
                            <input
                              type="text"
                              value={edu.year}
                              onChange={(e) => {
                                const next = [...cv.education];
                                next[idx] = { ...edu, year: e.target.value };
                                updateField('education', next);
                              }}
                              placeholder="2015 or 2018 - 2022"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Percentage / CGPA
                            </label>
                            <input
                              type="text"
                              value={edu.details}
                              onChange={(e) => {
                                const next = [...cv.education];
                                next[idx] = { ...edu, details: e.target.value };
                                updateField('education', next);
                              }}
                              placeholder="e.g., CGPA 3.2/4.0 or 69%"
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Education section removed.</span>
                  <button
                    type="button"
                    onClick={() => handleRestoreField('education')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restore Education</span>
                  </button>
                </div>
              )}

              {/* STEP 2 NAVIGATION FOOTER: Back + Next: Skills & Extras */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handlePrevStep(1)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNextStep(3)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Next: Skills & Extras</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ====================================================================
              STEP 3: SKILLS & FINAL DETAILS + BUILD CV BUTTON
             ==================================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Skills, Projects, Languages & Certifications */}
              {(!isRemoved('skills') ||
                !isRemoved('projects') ||
                !isRemoved('languages') ||
                !isRemoved('certifications')) && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Skills, Projects, Certifications & Languages
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Skills comma laga kar likhein — AI aur template renderer inko professional badges/groups mein set karega.
                    </p>
                  </div>

                  {!isRemoved('skills') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Skills (Comma-separated) & Command Level
                          </label>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Skills comma laga kar likhein aur niche har skill par apni command (proficiency level) select karein.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveField('skills')}
                          title="Remove Skills section"
                          className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove Skills</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => {
                          setSkillInput(e.target.value);
                          const parsed = e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          const existingLevels = cv.skillLevels || [];
                          const syncedLevels: ProficiencyItem[] = parsed.map((sk, idx) => {
                            const match = existingLevels.find(
                              (item) => item.name.trim().toLowerCase() === sk.toLowerCase()
                            );
                            const inferred = inferSkillTierAndPercentage(
                              sk,
                              match?.level || match?.proficiency,
                              match?.percentage,
                              idx
                            );
                            return {
                              name: sk,
                              level: inferred.level,
                              proficiency: inferred.level,
                              percentage: inferred.percentage
                            };
                          });
                          onChangeCV({
                            ...cv,
                            skills: parsed,
                            skillLevels: syncedLevels,
                            skillGroups: []
                          });
                        }}
                        placeholder="AI, MS Office, Adobe Photoshop"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900"
                      />

                      {/* Per-Skill Command / Proficiency Selector */}
                      {(cv.skills || []).length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200/80 dark:border-slate-700">
                            <span>Skill Name</span>
                            <span>Select Command / Proficiency Level</span>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {(cv.skills || []).map((skillName, idx) => {
                              const existingMatch =
                                (cv.skillLevels || []).find(
                                  (item) =>
                                    item.name.trim().toLowerCase() ===
                                    skillName.trim().toLowerCase()
                                ) || (cv.skillLevels || [])[idx];
                              const inferred = inferSkillTierAndPercentage(
                                skillName,
                                existingMatch?.level || existingMatch?.proficiency,
                                existingMatch?.percentage,
                                idx
                              );
                              const currentPct = inferred.percentage;
                              const currentLevel = inferred.level;
                              const matchedOpt =
                                SKILL_COMMAND_OPTIONS.find(
                                  (o) =>
                                    o.percentage === currentPct ||
                                    o.level.toLowerCase() === currentLevel.toLowerCase()
                                ) || SKILL_COMMAND_OPTIONS[1];

                              return (
                                <div
                                  key={`${skillName}_${idx}`}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between sm:justify-start gap-2">
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {skillName}
                                      </span>
                                      <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                                        {currentLevel} ({currentPct}%)
                                      </span>
                                    </div>
                                    <div className="w-full sm:w-40 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                                      <div
                                        className="h-full bg-slate-900 dark:bg-blue-500 rounded-full transition-all"
                                        style={{ width: `${currentPct}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <select
                                      value={`${matchedOpt.level}|${matchedOpt.percentage}`}
                                      onChange={(e) => {
                                        const [nextLvl, nextPctRaw] = e.target.value.split('|');
                                        const nextPct = Number(nextPctRaw) || 90;
                                        const nextSkillLevels: ProficiencyItem[] = (
                                          cv.skills || []
                                        ).map((s, sIdx) => {
                                          if (sIdx === idx) {
                                            return {
                                              name: s,
                                              level: nextLvl,
                                              proficiency: nextLvl,
                                              percentage: nextPct
                                            };
                                          }
                                          const prev =
                                            (cv.skillLevels || []).find(
                                              (item) =>
                                                item.name.trim().toLowerCase() ===
                                                s.trim().toLowerCase()
                                            ) || (cv.skillLevels || [])[sIdx];
                                          const prevInferred = inferSkillTierAndPercentage(
                                            s,
                                            prev?.level || prev?.proficiency,
                                            prev?.percentage,
                                            sIdx
                                          );
                                          return {
                                            name: s,
                                            level: prevInferred.level,
                                            proficiency: prevInferred.level,
                                            percentage: prevInferred.percentage
                                          };
                                        });
                                        onChangeCV({
                                          ...cv,
                                          skillLevels: nextSkillLevels
                                        });
                                      }}
                                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-slate-900 cursor-pointer"
                                    >
                                      {SKILL_COMMAND_OPTIONS.map((opt) => (
                                        <option
                                          key={opt.label}
                                          value={`${opt.level}|${opt.percentage}`}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextSkills = (cv.skills || []).filter(
                                          (_, i) => i !== idx
                                        );
                                        const nextSkillLevels = (cv.skillLevels || []).filter(
                                          (_, i) => i !== idx
                                        );
                                        setSkillInput(nextSkills.join(', '));
                                        onChangeCV({
                                          ...cv,
                                          skills: nextSkills,
                                          skillLevels: nextSkillLevels,
                                          skillGroups: []
                                        });
                                      }}
                                      title="Remove this skill"
                                      className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Projects */}
                  {!isRemoved('projects') && (
                    <div className="pt-2 space-y-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Projects
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nextProj: ProjectItem = {
                                id: `proj_${Date.now()}`,
                                name: '',
                                roleOrTech: '',
                                link: '',
                                description: ''
                              };
                              updateField('projects', [...cv.projects, nextProj]);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Project</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveField('projects')}
                            title="Remove entire Projects section"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Projects Section</span>
                          </button>
                        </div>
                      </div>

                      {cv.projects.map((proj, idx) => (
                        <div
                          key={proj.id || idx}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              Project #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const remaining = cv.projects.filter((_, i) => i !== idx);
                                if (remaining.length === 0) {
                                  handleRemoveField('projects');
                                } else {
                                  updateField('projects', remaining);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete Project</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <input
                              type="text"
                              value={proj.name}
                              onChange={(e) => {
                                const next = [...cv.projects];
                                next[idx] = { ...proj, name: e.target.value };
                                updateField('projects', next);
                              }}
                              placeholder="Project Name"
                              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded"
                            />
                            <input
                              type="text"
                              value={proj.roleOrTech}
                              onChange={(e) => {
                                const next = [...cv.projects];
                                next[idx] = { ...proj, roleOrTech: e.target.value };
                                updateField('projects', next);
                              }}
                              placeholder="Tech Stack / Role"
                              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded"
                            />
                            <input
                              type="text"
                              value={proj.link}
                              onChange={(e) => {
                                const next = [...cv.projects];
                                next[idx] = { ...proj, link: e.target.value };
                                updateField('projects', next);
                              }}
                              placeholder="Link / GitHub URL"
                              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded"
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={proj.description}
                            onChange={(e) => {
                              const next = [...cv.projects];
                              next[idx] = { ...proj, description: e.target.value };
                              updateField('projects', next);
                            }}
                            placeholder="What did this project solve and achieve?"
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {(!isRemoved('languages') || !isRemoved('certifications')) && (
                    <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {!isRemoved('languages') && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Languages (Comma-separated) & Command Level
                              </label>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Languages comma laga kar likhein aur niche har language par apni command (fluency level) select karein.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveField('languages')}
                              title="Remove Languages field"
                              className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={langInput}
                            onChange={(e) => {
                              setLangInput(e.target.value);
                              const parsedLangs = e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const existingLangLevels = cv.languageLevels || [];
                              const syncedLangLevels: ProficiencyItem[] = parsedLangs.map(
                                (lg, idx) => {
                                  const match = existingLangLevels.find(
                                    (item) =>
                                      item.name.trim().toLowerCase() === lg.toLowerCase()
                                  );
                                  const inferred = inferLanguageProficiencyAndPercentage(
                                    lg,
                                    match?.proficiency || match?.level,
                                    match?.percentage,
                                    idx
                                  );
                                  return {
                                    name: lg,
                                    level: inferred.proficiency,
                                    proficiency: inferred.proficiency,
                                    percentage: inferred.percentage
                                  };
                                }
                              );
                              onChangeCV({
                                ...cv,
                                languages: parsedLangs,
                                languageLevels: syncedLangLevels
                              });
                            }}
                            placeholder="English, Urdu, Sindhi"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                          />

                          {/* Per-Language Command / Proficiency Selector */}
                          {(cv.languages || []).length > 0 && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200/80 dark:border-slate-700">
                                <span>Language</span>
                                <span>Select Language Command / Fluency</span>
                              </div>
                              <div className="space-y-2">
                                {(cv.languages || []).map((langName, idx) => {
                                  const existingMatch =
                                    (cv.languageLevels || []).find(
                                      (item) =>
                                        item.name.trim().toLowerCase() ===
                                        langName.trim().toLowerCase()
                                    ) || (cv.languageLevels || [])[idx];
                                  const inferred = inferLanguageProficiencyAndPercentage(
                                    langName,
                                    existingMatch?.proficiency || existingMatch?.level,
                                    existingMatch?.percentage,
                                    idx
                                  );
                                  const currentPct = inferred.percentage;
                                  const currentLevel = inferred.proficiency;
                                  const matchedOpt =
                                    LANGUAGE_COMMAND_OPTIONS.find(
                                      (o) =>
                                        o.level.toLowerCase() === currentLevel.toLowerCase() ||
                                        o.percentage === currentPct
                                    ) || LANGUAGE_COMMAND_OPTIONS[2];

                                  return (
                                    <div
                                      key={`${langName}_${idx}`}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between sm:justify-start gap-2">
                                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                            {langName}
                                          </span>
                                          <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                                            {currentLevel} ({currentPct}%)
                                          </span>
                                        </div>
                                        <div className="w-full sm:w-40 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                                          <div
                                            className="h-full bg-slate-900 dark:bg-blue-500 rounded-full transition-all"
                                            style={{ width: `${currentPct}%` }}
                                          />
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <select
                                          value={`${matchedOpt.level}|${matchedOpt.percentage}`}
                                          onChange={(e) => {
                                            const [nextLvl, nextPctRaw] =
                                              e.target.value.split('|');
                                            const nextPct = Number(nextPctRaw) || 90;
                                            const nextLangLevels: ProficiencyItem[] = (
                                              cv.languages || []
                                            ).map((l, lIdx) => {
                                              if (lIdx === idx) {
                                                return {
                                                  name: l,
                                                  level: nextLvl,
                                                  proficiency: nextLvl,
                                                  percentage: nextPct
                                                };
                                              }
                                              const prev =
                                                (cv.languageLevels || []).find(
                                                  (item) =>
                                                    item.name.trim().toLowerCase() ===
                                                    l.trim().toLowerCase()
                                                ) || (cv.languageLevels || [])[lIdx];
                                              const prevInf = inferLanguageProficiencyAndPercentage(
                                                l,
                                                prev?.proficiency || prev?.level,
                                                prev?.percentage,
                                                lIdx
                                              );
                                              return {
                                                name: l,
                                                level: prevInf.proficiency,
                                                proficiency: prevInf.proficiency,
                                                percentage: prevInf.percentage
                                              };
                                            });
                                            onChangeCV({
                                              ...cv,
                                              languageLevels: nextLangLevels
                                            });
                                          }}
                                          className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-slate-900 cursor-pointer"
                                        >
                                          {LANGUAGE_COMMAND_OPTIONS.map((opt) => (
                                            <option
                                              key={opt.label}
                                              value={`${opt.level}|${opt.percentage}`}
                                            >
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextLangs = (cv.languages || []).filter(
                                              (_, i) => i !== idx
                                            );
                                            const nextLangLevels = (
                                              cv.languageLevels || []
                                            ).filter((_, i) => i !== idx);
                                            setLangInput(nextLangs.join(', '));
                                            onChangeCV({
                                              ...cv,
                                              languages: nextLangs,
                                              languageLevels: nextLangLevels
                                            });
                                          }}
                                          title="Remove this language"
                                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!isRemoved('certifications') && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Certifications (Auto Bullets •)
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveField('certifications')}
                              title="Remove Certifications field"
                              className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={certInput}
                            onChange={(e) => {
                              setCertInput(e.target.value);
                              updateField(
                                'certifications',
                                e.target.value
                                  .split(/[\n,|•;]+/)
                                  .map((s) => s.replace(/^[•\-*·]+\s*/, '').trim())
                                  .filter(Boolean)
                              );
                            }}
                            placeholder="AWS, Meta, Certified Banking Associate"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* References (Last Section) */}
              {!isRemoved('references') && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        References (Optional Last Section)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        CV ke aakhir mein References dikhayein (&quot;Available upon request&quot; ya Referee details).
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextRef: ReferenceItem = {
                            id: `ref_${Date.now()}`,
                            name: '',
                            designation: '',
                            company: '',
                            contact: ''
                          };
                          onChangeCV({
                            ...cv,
                            referencesOnRequest: false,
                            references: [...(cv.references || []), nextRef]
                          });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Referee</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveField('references')}
                        title="Remove entire References section"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Section</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(cv.referencesOnRequest)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          onChangeCV({
                            ...cv,
                            referencesOnRequest: checked,
                            references:
                              !checked && (!cv.references || cv.references.length === 0)
                                ? [
                                    {
                                      id: `ref_${Date.now()}`,
                                      name: '',
                                      designation: '',
                                      company: '',
                                      contact: ''
                                    }
                                  ]
                                : cv.references || []
                          });
                        }}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>
                        Show standard line: &quot;References available upon request.&quot;
                      </span>
                    </label>
                  </div>

                  {!cv.referencesOnRequest && (
                    <div className="space-y-4 divide-y divide-slate-200 dark:divide-slate-800">
                      {(cv.references || []).map((refItem, idx) => (
                        <div key={refItem.id || idx} className={idx > 0 ? 'pt-4 space-y-3' : 'space-y-3'}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              Reference #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const remaining = (cv.references || []).filter((_, i) => i !== idx);
                                if (remaining.length === 0) {
                                  onChangeCV({ ...cv, references: [], referencesOnRequest: true });
                                } else {
                                  updateField('references', remaining);
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Referee</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Referee Name
                              </label>
                              <input
                                type="text"
                                value={refItem.name}
                                onChange={(e) => {
                                  const next = [...(cv.references || [])];
                                  next[idx] = { ...refItem, name: e.target.value };
                                  onChangeCV({ ...cv, referencesOnRequest: false, references: next });
                                }}
                                placeholder="e.g., Dr. Tariq Mehmood"
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Designation / Relationship
                              </label>
                              <input
                                type="text"
                                value={refItem.designation}
                                onChange={(e) => {
                                  const next = [...(cv.references || [])];
                                  next[idx] = { ...refItem, designation: e.target.value };
                                  onChangeCV({ ...cv, referencesOnRequest: false, references: next });
                                }}
                                placeholder="e.g., Branch Manager / Headmaster"
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Organization / Institution
                              </label>
                              <input
                                type="text"
                                value={refItem.company}
                                onChange={(e) => {
                                  const next = [...(cv.references || [])];
                                  next[idx] = { ...refItem, company: e.target.value };
                                  onChangeCV({ ...cv, referencesOnRequest: false, references: next });
                                }}
                                placeholder="e.g., National Bank of Pakistan"
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Contact Info (Phone / Email)
                              </label>
                              <input
                                type="text"
                                value={refItem.contact}
                                onChange={(e) => {
                                  const next = [...(cv.references || [])];
                                  next[idx] = { ...refItem, contact: e.target.value };
                                  onChangeCV({ ...cv, referencesOnRequest: false, references: next });
                                }}
                                placeholder="e.g., +92 300 1234567"
                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3 NAVIGATION FOOTER: Back + Prominent "Build CV" CTA Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handlePrevStep(2)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isBuildingAI}
                  className="flex-1 py-4 px-6 text-base font-extrabold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 disabled:opacity-65 cursor-pointer"
                >
                  {isBuildingAI ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Building ATS-Ready CV with Groq AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Build CV</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* RIGHT COLUMN: Side-by-Side Template Picker & Live Preview */}
        <div className="lg:col-span-6 lg:sticky lg:top-6 space-y-4">
          {/* Template Selector Strip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Select CV Template ({templates.length} Available)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Live side-by-side preview · Updates automatically on every step
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Active: <strong className="text-slate-900 dark:text-white">{selectedTemplate.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {templates.map((tpl) => {
                const isSelected = tpl.id === cv.templateId;
                const isLocked = tpl.isPremium && !isPremiumUser;

                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`text-left p-2.5 rounded-lg border transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 dark:border-blue-500 bg-slate-900 dark:bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 hover:border-slate-400 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="text-xs font-bold truncate">{tpl.name}</span>
                      {isLocked ? (
                        <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                      ) : isSelected ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : null}
                    </div>
                    <div
                      className={`text-[10px] mt-1 flex items-center justify-between ${
                        isSelected ? 'text-slate-300 dark:text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>{tpl.category}</span>
                      <span>{tpl.isPremium ? 'Premium' : 'Free'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Scaled Preview Canvas */}
          <div
            className={`bg-slate-200/70 dark:bg-slate-800/80 border rounded-2xl p-3 sm:p-5 overflow-x-auto transition-all duration-300 ${
              previewPulse
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>LIVE PREVIEW · {selectedTemplate.name.toUpperCase()}</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Step {currentStep} of 3 synced
              </span>
            </div>
            <div className="origin-top scale-[0.85] sm:scale-[0.92] lg:scale-[0.82] xl:scale-[0.9] mx-auto">
              <CVTemplateRenderer
                cv={cv}
                template={selectedTemplate}
                editable={false}
                isPremiumUser={isPremiumUser}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
