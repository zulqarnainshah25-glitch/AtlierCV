export type TemplateCategory =
  | 'Modern'
  | 'Classic'
  | 'Minimal'
  | 'Creative'
  | 'Executive'
  | 'Professional'
  | 'ATS-friendly';

export type TemplateLayoutType =
  | 'two-column-left'
  | 'two-column-right'
  | 'header-top'
  | 'single-column-classic'
  | 'minimal-editorial'
  | 'minimal-timeline'
  | 'creative-split'
  | 'ats-clean';

export type PhotoSlotPosition =
  | 'top-right'
  | 'top-left'
  | 'sidebar-top'
  | 'header-center'
  | 'header-left'
  | 'header-right'
  | 'hidden'
  | 'none';

export interface PhotoSlotConfig {
  position: PhotoSlotPosition;
  widthMm: number; // default 35 (0 when hidden)
  heightMm: number; // default 45 (0 when hidden)
  borderRadius: string; // e.g., '4px', '8px', '0px', '50%', '9999px'
  showBorder: boolean;
}

export interface CVTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  isPremium: boolean;
  accentColor: string;
  secondaryColor: string;
  fontFamily: string;
  layoutType: TemplateLayoutType;
  photoSlot: PhotoSlotConfig;
  customCss: string;
  thumbnailType: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkExperienceItem {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  rawDescription: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  majorSubject?: string;
  institution: string;
  year: string;
  details: string; // Percentage / CGPA / Honors
}

export interface ProjectItem {
  id: string;
  name: string;
  roleOrTech: string;
  link: string;
  description: string;
}

export interface SkillGroup {
  id: string;
  category: string;
  items: string[];
}

export interface ProficiencyItem {
  name: string;
  level: string;
  proficiency?: string;
  percentage: number;
}

export interface ReferenceItem {
  id: string;
  name: string;
  designation: string;
  company: string;
  contact: string;
}

export type RemovableFieldKey =
  | 'jobTitle'
  | 'email'
  | 'phone'
  | 'address'
  | 'linkedinUrl'
  | 'portfolioUrl'
  | 'photoDataUrl'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'languages'
  | 'certifications'
  | 'references';

export interface CVDocument {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  address: string;
  linkedinUrl: string;
  portfolioUrl: string;
  photoDataUrl: string;
  rawSummary: string;
  summary: string;
  personal?: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    address: string;
    linkedinUrl: string;
    portfolioUrl: string;
    summary: string;
  };
  experience: WorkExperienceItem[];
  experiences?: WorkExperienceItem[];
  education: EducationItem[];
  skills: string[];
  skillLevels?: ProficiencyItem[];
  skillGroups: SkillGroup[];
  projects: ProjectItem[];
  languages: string[];
  languageLevels?: ProficiencyItem[];
  certifications: string[];
  references?: ReferenceItem[];
  referencesOnRequest?: boolean;
  removedFields?: RemovableFieldKey[];
  isPolished: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type PlanTier = 'free' | 'starter' | 'pro' | 'unlimited' | 'premium';

export interface PaymentPlan {
  id: 'starter' | 'pro' | 'unlimited';
  name: string;
  pricePkr: number;
  pdfLimit: number;
  wordLimit: number;
  isUnlimited: boolean;
  popular?: boolean;
  description: string;
  features: string[];
}

export interface PaymentAccountsConfig {
  easypaisaNumber: string;
  easypaisaTitle: string;
  bankName: string;
  bankAccount: string;
  bankTitle: string;
  iban: string;
  instructions: string;
}

export interface PaymentProof {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  planId: 'starter' | 'pro' | 'unlimited';
  planName: string;
  amountPkr: number;
  method: 'easypaisa' | 'bank';
  senderName: string;
  senderPhone: string;
  trxId: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  plan: PlanTier;
  pdfExportsUsed: number;
  wordExportsUsed: number;
  pdfLimit?: number;
  wordLimit?: number;
  planNotification?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SyncStatus = 'idle' | 'local-saved' | 'syncing' | 'synced' | 'offline-queued' | 'error';

