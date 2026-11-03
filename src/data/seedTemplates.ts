import { CVDocument, CVTemplate, PaymentAccountsConfig, PaymentPlan, UserProfile } from '../types/cv';

export const SEED_TEMPLATES: CVTemplate[] = [
  {
    id: 'classic-oxford',
    name: 'Timeline Classic (Ella Green)',
    category: 'Classic',
    description:
      'Navy & Golden Amber executive timeline with left-aligned dates, vertical timeline rail with circle nodes, and underlined skill tags.',
    isPremium: false, // FREE TEMPLATE 1
    accentColor: '#CA8A04',
    secondaryColor: '#0F2942',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'minimal-timeline',
    photoSlot: {
      position: 'hidden',
      widthMm: 0,
      heightMm: 0,
      borderRadius: '6px',
      showBorder: false
    },
    customCss: `.cv-section-heading { font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #0F2942; }`,
    thumbnailType: 'ella-green-timeline'
  },
  {
    id: 'minimal-zurich',
    name: 'Minimalist Clean',
    category: 'Minimal',
    description:
      'Simple, high-clarity 1-page layout with center-aligned Name & Job Title and skills displayed as compact rounded tags/pills.',
    isPremium: false, // FREE TEMPLATE 2
    accentColor: '#0F172A',
    secondaryColor: '#334155',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'minimal-editorial',
    photoSlot: {
      position: 'header-center',
      widthMm: 35,
      heightMm: 45,
      borderRadius: '6px',
      showBorder: false
    },
    customCss: `.cv-section-heading { font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }`,
    thumbnailType: 'minimal-grid'
  },
  {
    id: 'josh-slate-sidebar',
    name: 'Slate Executive (Josh Parker)',
    category: 'Executive',
    description:
      'Top-left portrait & bold stacked name on white, steel-blue lower sidebar with Education & two-tone black/white skill bars, and right-hand Career timeline.',
    isPremium: true,
    accentColor: '#1E293B',
    secondaryColor: '#7B92A8',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'two-column-left',
    photoSlot: {
      position: 'sidebar-top',
      widthMm: 42,
      heightMm: 46,
      borderRadius: '0px',
      showBorder: false
    },
    customCss: `.sidebar { background-color: #7B92A8; color: #FFFFFF; }`,
    thumbnailType: 'josh-slate-sidebar'
  },
  {
    id: 'theodora-navy-pill',
    name: 'Navy Split Header (Theodora)',
    category: 'Modern',
    description:
      'Rounded-square left photo beside a Dark Navy header block containing Name, Title & Summary, 2-column contact bar, and solid navy expertise pills.',
    isPremium: true,
    accentColor: '#162F44',
    secondaryColor: '#0F172A',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'header-top',
    photoSlot: {
      position: 'header-left',
      widthMm: 38,
      heightMm: 38,
      borderRadius: '14px',
      showBorder: false
    },
    customCss: `.header-section { background-color: #162F44; color: #FFFFFF; }`,
    thumbnailType: 'theodora-navy-pill'
  },
  {
    id: 'ats-standard',
    name: 'Emerald Teal Sidebar (Ella White)',
    category: 'Modern',
    description:
      'White left main column with Teal company/institution accents paired with a Deep Teal right sidebar featuring 5-dot language ratings & key achievements.',
    isPremium: true,
    accentColor: '#0D9488',
    secondaryColor: '#065F5B',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'two-column-right',
    photoSlot: {
      position: 'hidden',
      widthMm: 0,
      heightMm: 0,
      borderRadius: '6px',
      showBorder: false
    },
    customCss: `.sidebar { background-color: #065F5B; color: #FFFFFF; }`,
    thumbnailType: 'ella-white-teal'
  },
  {
    id: 'anthony-royal-coral',
    name: 'Royal Blue & Coral (Anthony)',
    category: 'Professional',
    description:
      'Open two-column executive layout with Royal Blue headings & roles, warm Coral subtitle, institutions & 5-dot language indicators, and underlined skill chips.',
    isPremium: true,
    accentColor: '#EA580C',
    secondaryColor: '#0B3578',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'two-column-right',
    photoSlot: {
      position: 'hidden',
      widthMm: 0,
      heightMm: 0,
      borderRadius: '6px',
      showBorder: false
    },
    customCss: `.cv-section-heading { font-size: 10.5px; letter-spacing: 0.08em; color: #64748B; }`,
    thumbnailType: 'anthony-royal-coral'
  },
  {
    id: 'luna-charcoal-grid',
    name: 'Charcoal Monochrome (Luna)',
    category: 'Professional',
    description:
      'Crisp two-column monochrome layout with thick charcoal section rules, dashed item dividers, 5-dot language ratings, star achievement icons & underlined skills.',
    isPremium: true,
    accentColor: '#52525B',
    secondaryColor: '#27272A',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'two-column-right',
    photoSlot: {
      position: 'hidden',
      widthMm: 0,
      heightMm: 0,
      borderRadius: '6px',
      showBorder: false
    },
    customCss: `.cv-section-heading { font-weight: 800; border-bottom: 2px solid #27272A; }`,
    thumbnailType: 'luna-charcoal-grid'
  },
  {
    id: 'ava-electric-hex',
    name: 'Electric Blue Hexagon (Ava)',
    category: 'Modern',
    description:
      'Subtle geometric hexagon background pattern with bold black section rules, vibrant Electric Blue titles/companies/dots, and underlined skill chips.',
    isPremium: true,
    accentColor: '#0077FF',
    secondaryColor: '#000000',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'two-column-right',
    photoSlot: {
      position: 'hidden',
      widthMm: 0,
      heightMm: 0,
      borderRadius: '6px',
      showBorder: false
    },
    customCss: `.cv-section-heading { font-weight: 800; border-bottom: 2px solid #000000; }`,
    thumbnailType: 'ava-electric-hex'
  },
  {
    id: 'mila-navy-banner',
    name: 'Navy Banner Two-Column (Mila)',
    category: 'Executive',
    description:
      'Full-width Dark Navy top banner with white typography & contact bar over a two-column body with Navy accents, 5-dot languages & underlined skills.',
    isPremium: true,
    accentColor: '#1E325C',
    secondaryColor: '#334155',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'header-top',
    photoSlot: {
      position: 'hidden',
      widthMm: 0,
      heightMm: 0,
      borderRadius: '6px',
      showBorder: false
    },
    customCss: `.header-section { background-color: #1E325C; color: #FFFFFF; }`,
    thumbnailType: 'mila-navy-banner'
  },
  {
    id: 'executive-board',
    name: 'Crimson Editorial (Mia Williams)',
    category: 'Executive',
    description:
      'Single-column executive layout with Crimson Red roles, degrees & contact row, Warm Orange company & 2-column achievement titles, and right-aligned dates.',
    isPremium: true,
    accentColor: '#991B1B',
    secondaryColor: '#EA580C',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'single-column-classic',
    photoSlot: {
      position: 'hidden',
      widthMm: 0,
      heightMm: 0,
      borderRadius: '4px',
      showBorder: false
    },
    customCss: `.cv-section-heading { color: #64748B; letter-spacing: 0.06em; text-transform: uppercase; }`,
    thumbnailType: 'mia-crimson-editorial'
  },
  {
    id: 'creative-studio',
    name: 'Sky Pill & Icon Sidebar (Jackson)',
    category: 'Creative',
    description:
      'Light uppercase name with rounded Sky-Blue pill banner for Job Title, and soft sky-blue square icon badges next to every section heading across both columns.',
    isPremium: true,
    accentColor: '#3B82F6',
    secondaryColor: '#1E293B',
    fontFamily: 'Plus Jakarta Sans',
    layoutType: 'two-column-left',
    photoSlot: {
      position: 'hidden',
      widthMm: 0,
      heightMm: 0,
      borderRadius: '9999px',
      showBorder: false
    },
    customCss: `.cv-section-heading { letter-spacing: 0.05em; text-transform: uppercase; }`,
    thumbnailType: 'jackson-sky-pill'
  },
  {
    id: 'modern-atelier',
    name: 'Modern Navy Sidebar',
    category: 'Modern',
    description:
      'Dark Navy left sidebar with 35x45mm Photo, Contact Info, Skills & Languages; crisp white main area for Summary, Experience, Education & Projects.',
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
    customCss: `.cv-header-title { letter-spacing: -0.02em; } .cv-section-heading { text-transform: uppercase; letter-spacing: 0.07em; font-size: 11px; font-weight: 700; }`,
    thumbnailType: 'modern-two-col'
  },
  {
    id: 'classic-dark-sidebar',
    name: 'Classic Dark Sidebar',
    category: 'Professional',
    description:
      'Dark grey sidebar on the left with skill & language progress bars, and a clean two-column date-aligned main section on the right.',
    isPremium: true,
    accentColor: '#374151',
    secondaryColor: '#111827',
    fontFamily: 'Inter',
    layoutType: 'two-column-left',
    photoSlot: {
      position: 'sidebar-top',
      widthMm: 35,
      heightMm: 45,
      borderRadius: '0px',
      showBorder: false
    },
    customCss: `.sidebar { background-color: #374151; color: #ffffff; } .sidebar h2 { background-color: #1F2937; padding: 6px 12px; margin-left: -20px; margin-right: -20px; } .progress-bar-container { background-color: #4B5563; height: 6px; width: 100%; margin-top: 4px; } .progress-bar-fill { background-color: #ffffff; height: 100%; } .main-heading { border-bottom: 2px solid #E5E7EB; padding-bottom: 4px; color: #1F2937; }`,
    thumbnailType: 'classic-dark-sidebar'
  }
];

export const DEFAULT_PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    pricePkr: 200,
    pdfLimit: 10,
    wordLimit: 2,
    isUnlimited: false,
    description: 'All templates unlock, max 10 PDF downloads & 2 Word downloads.',
    features: [
      'All 13 CV Templates Unlocked',
      'Maximum 10 PDF Downloads',
      'Maximum 2 Word (.docx) Downloads',
      'Print-Ready 300 DPI Export',
      'Full Inline Editor Access'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    pricePkr: 500,
    pdfLimit: 10,
    wordLimit: 10,
    isUnlimited: false,
    popular: true,
    description: 'All templates unlock, max 10 PDF downloads & 10 Word downloads.',
    features: [
      'All 13 CV Templates Unlocked',
      'Maximum 10 PDF Downloads',
      'Maximum 10 Word (.docx) Downloads',
      'Priority AI Corporate Polishing',
      'Watermark-Free HD Portraits'
    ]
  },
  {
    id: 'unlimited',
    name: 'Unlimited Plan',
    pricePkr: 1000,
    pdfLimit: 999999,
    wordLimit: 999999,
    isUnlimited: true,
    description: 'All templates unlock and unlimited downloads.',
    features: [
      'All 13 CV Templates Unlocked',
      'Unlimited High-DPI PDF Downloads',
      'Unlimited Word (.docx) Downloads',
      'Unlimited Career CV Revisions',
      'VIP Priority Support'
    ]
  }
];

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountsConfig = {
  easypaisaNumber: '03001234567',
  easypaisaTitle: 'Zulqarnain Shah',
  bankName: 'National Bank of Pakistan (NBP)',
  bankAccount: '12345678901234',
  bankTitle: 'Zulqarnain Shah',
  iban: 'PK12NBPA12345678901234',
  instructions: 'Payment transfer karne ke baad Transaction ID (TID) aur sender number yahan enter karein. Verification hotay hi aap ka plan activate ho jaye ga.'
};

export const DEMO_ADMIN_USER: UserProfile = {
  uid: 'demo-admin-uid',
  email: 'ZulqarnainShah25@gmail.com',
  displayName: 'Zulqarnain Shah (Admin)',
  role: 'admin',
  plan: 'unlimited',
  pdfExportsUsed: 0,
  wordExportsUsed: 0,
  pdfLimit: 999999,
  wordLimit: 999999
};


export function createEmptyCV(userId: string): CVDocument {
  const id = `cv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    userId,
    title: 'Untitled Professional CV',
    templateId: 'modern-atelier',
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    address: '',
    linkedinUrl: '',
    portfolioUrl: '',
    photoDataUrl: '',
    rawSummary: '',
    summary: '',
    experience: [
      {
        id: `exp_${Date.now()}_1`,
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        rawDescription: '',
        bullets: []
      }
    ],
    education: [
      {
        id: `edu_${Date.now()}_1`,
        degree: '',
        majorSubject: '',
        institution: '',
        year: '',
        details: ''
      }
    ],
    skills: [],
    skillGroups: [],
    projects: [
      {
        id: `proj_${Date.now()}_1`,
        name: '',
        roleOrTech: '',
        link: '',
        description: ''
      }
    ],
    languages: ['English', 'Urdu'],
    certifications: [],
    references: [
      {
        id: `ref_${Date.now()}_1`,
        name: '',
        designation: '',
        company: '',
        contact: ''
      }
    ],
    referencesOnRequest: true,
    removedFields: [],
    isPolished: false
  };
}

export function createSampleCV(userId: string): CVDocument {
  const id = `cv_${Date.now()}_sample`;
  return {
    id,
    userId,
    title: 'Senior Full-Stack Engineer CV',
    templateId: 'modern-atelier',
    fullName: 'Areeba Khan',
    jobTitle: 'Senior Full-Stack Software Engineer',
    email: 'areeba.khan@techmail.pk',
    phone: '+92 300 4567890',
    address: 'DHA Phase 5, Lahore, Pakistan',
    linkedinUrl: 'linkedin.com/in/areebakhan-dev',
    portfolioUrl: 'areebakhan.dev',
    photoDataUrl: '',
    rawSummary:
      'Main pichle 6 saal se React, Node.js aur cloud architectures par kaam kar rahi hoon. Maine fintech aur e-commerce teams lead ki hain aur high traffic systems banaye hain jo fast aur reliable hain.',
    summary:
      'Results-driven Senior Full-Stack Software Engineer with 6+ years of experience architecting scalable cloud-native web applications across FinTech and E-Commerce sectors. Proven track record of leading cross-functional engineering teams, optimizing distributed microservices, and reducing API latency by 42% across high-volume production environments.',
    experience: [
      {
        id: 'exp_sample_1',
        company: 'FinPay Technologies',
        role: 'Lead Full-Stack Engineer',
        startDate: 'Jan 2023',
        endDate: 'Present',
        rawDescription:
          'Payment gateway dashboard banaya React aur Node.js mein. 12 developers ki team manage ki. API response time ko 40% fast kiya aur CI/CD pipelines lagayein.',
        bullets: [
          'Architected and launched a real-time merchant payment analytics platform using React, TypeScript, and Node.js, processing over $18M in monthly transaction volume.',
          'Directed a cross-functional squad of 12 engineers, instituting automated CI/CD pipelines and code review standards that cut deployment failures by 65%.',
          'Re-engineered core settlement REST and GraphQL APIs with Redis caching, reducing p95 response latency by 42% under peak load.'
        ]
      },
      {
        id: 'exp_sample_2',
        company: 'CloudScale Systems',
        role: 'Software Engineer',
        startDate: 'Jun 2020',
        endDate: 'Dec 2022',
        rawDescription:
          'B2B SaaS workflows par kaam kiya. Multi-tenant database design kiya aur customer onboarding ko automate kiya.',
        bullets: [
          'Developed multi-tenant SaaS workflow automation modules in React and Express, supporting 45,000+ daily active enterprise users.',
          'Automated self-serve customer onboarding and billing webhooks with Stripe, decreasing manual support tickets by 50%.',
          'Implemented comprehensive unit and integration testing suites that elevated code coverage from 48% to 89%.'
        ]
      }
    ],
    education: [
      {
        id: 'edu_sample_1',
        degree: 'BS',
        majorSubject: 'Computer Science',
        institution: 'National University of Sciences & Technology (NUST)',
        year: '2016 - 2020',
        details: 'CGPA 3.82/4.00 · Dean’s Honor List · Capstone in Distributed Cloud Systems'
      }
    ],
    skills: [
      'TypeScript',
      'React 19',
      'Node.js',
      'Express',
      'PostgreSQL',
      'Firebase Firestore',
      'Docker',
      'AWS',
      'System Design',
      'GraphQL'
    ],
    skillGroups: [
      {
        id: 'sg_1',
        category: 'Frontend Architecture',
        items: ['React 19', 'TypeScript', 'Next.js', 'Tailwind CSS', 'State Management']
      },
      {
        id: 'sg_2',
        category: 'Backend & Data',
        items: ['Node.js', 'Express', 'PostgreSQL', 'Firebase Firestore', 'Redis', 'GraphQL']
      },
      {
        id: 'sg_3',
        category: 'Cloud & DevOps',
        items: ['AWS', 'Docker', 'GitHub Actions', 'CI/CD', 'System Design']
      }
    ],
    projects: [
      {
        id: 'proj_sample_1',
        name: 'PayStream Open SDK',
        roleOrTech: 'TypeScript, Node.js, Webhooks',
        link: 'github.com/areebakhan/paystream-sdk',
        description:
          'Built an open-source TypeScript SDK for South Asian payment gateways with automatic retry queues and idempotency keys, adopted by 600+ developers.'
      },
      {
        id: 'proj_sample_2',
        name: 'DocuPulse Offline Sync Engine',
        roleOrTech: 'React, IndexedDB, Firestore',
        link: 'github.com/areebakhan/docupulse',
        description:
          'Engineered a conflict-free offline-first document editor with sub-second local caching and automatic background cloud synchronization.'
      }
    ],
    languages: ['English (Fluent)', 'Urdu (Native)'],
    certifications: [
      'AWS Certified Solutions Architect – Associate',
      'Meta Frontend Developer Professional Certificate'
    ],
    references: [
      {
        id: 'ref_sample_1',
        name: 'Salman Tariq',
        designation: 'VP of Engineering',
        company: 'FinPay Technologies',
        contact: 'salman.tariq@finpay.pk | +92 300 9876543'
      },
      {
        id: 'ref_sample_2',
        name: 'Dr. Hina Majeed',
        designation: 'Professor of Computer Science',
        company: 'NUST Islamabad',
        contact: 'hmajeed@seecs.edu.pk'
      }
    ],
    referencesOnRequest: false,
    isPolished: false
  };
}
