import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  cleanCVDocumentText,
  cleanText,
  enforceConciseSummary,
  generateProfessionalRoleBullets,
  expandRawDutiesToProfessionalBullets,
  inferLanguageProficiencyAndPercentage,
  inferSkillTierAndPercentage,
  isNonEnglishOrRomanUrdu,
  rewriteRawSummaryToEnglish,
  stripSampleResidue
} from './src/lib/textSanitizer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Track verified premium upgrades from Stripe webhook / checkout verification
const verifiedPremiumUsers = new Set<string>();

const CV_WRITER_SYSTEM_PROMPT = `You are an elite executive CV writer and ATS optimization specialist.
Take the user's raw CV data and generate a complete, polished, ATS-friendly CV in 100% fluent, grammatical, professional corporate English.

STRICT RULES:
1. PROFESSIONAL SUMMARY TRANSLATION & POLISHING (3 TO 5 LINES / 60-95 WORDS):
   - If the user writes their summary in Roman Urdu, Urdu script, Hindi, Roman Hindi, or broken English, you MUST translate and synthesize it into 100% fluent, authoritative, executive corporate English.
   - NEVER output Roman Urdu, Urdu script, Hindi, or informal text in the summary.
   - The summary MUST always be a single cohesive paragraph of strictly 3 to 5 comprehensive lines (approximately 60 to 95 words).
   - Base the summary directly on the user's written statement, job title, duties (e.g. teaching, banking, technology, administration), and key skills.
   - Prevent text duplication: never repeat sentences, phrases, or half-strings.
2. ACRONYMS & CAPITALIZATION:
   - Polish raw content (including Roman Urdu, Hindi, or broken English) into strong corporate English using impactful action verbs.
   - Strictly preserve the user's true dates, company names, educational institutions, and contact details without altering facts.
   - Ensure proper nouns and acronyms retain strict standard casing: "AI", "MS Office", "Adobe Photoshop", "SELD", "NBP", "BISE Sukkur", and ensure the first letters of villages, cities, districts, and institutions are properly capitalized.
3. WORK EXPERIENCE POLISHING & BULLET EXPANSION (CRITICAL):
   - Never output the user's raw notes, shorthand lists, comma-separated items, or phrases ending in 'etc.' as bullets (e.g., NEVER output "Counter Services, Check book issuance, Gold loan Proposal and register maintaining, SME and ME loans Stock Register maintenance, ECIB Generation, Office work etc").
   - You MUST transform, polish, and expand ANY job experience added by any user (Banking, Education, IT, Sales, Engineering, Administration, Retail, Healthcare, Finance, etc.) into 2 to 4 (minimum 2-3 lines/bullets per experience) comprehensive, executive-level corporate bullet points tailored specifically to that role and organization.
   - Every single bullet point MUST begin with a powerful corporate action verb (e.g., Spearheaded, Administered, Facilitated, Coordinated, Processed, Executed, Delivered, Reconciled, Evaluated, Implemented, Mentored).
   - Each bullet must clearly describe the operational execution, methodology, regulatory compliance, or measurable impact.
4. CORE DIRECTIVES FOR SKILLS & LANGUAGES STRUCTURING (OBJECT-BASED TRANSFORMATION):
   - Never output "skills" or "languages" as simple strings, comma-separated text, or flat string arrays.
   - Even if the user inputs raw comma-separated values (e.g., "AI, MS Office, Adobe Photoshop" or "English, Urdu, Sindhi"), you MUST evaluate/extract the proficiency level and numeric command percentage for each item and map each to a structured JSON object.
   - PROFICIENCY TIERS & PERCENTAGE MAPPING:
     For Skills:
     - Expert / Master: 90% - 100%
     - Proficient / Advanced: 80% - 89%
     - Intermediate: 70% - 79%
     - Beginner / Basic: 50% - 69%
     (If the user does not explicitly state the command for a skill, infer an accurate, professional standard between 70% and 90% based on their role and background).
     For Languages (Use standard CEFR / Descriptive tags):
     - Native / Bilingual: 100%
     - Fluent (C1/C2): 85% - 95%
     - Conversational / Professional (B1/B2): 70% - 80%
     - Basic (A1/A2): 50% - 65%
   - Keep fullName and jobTitle clear, concise, and controlled so they never overflow or get cut off outside a 70mm sidebar.
5. STRICT JSON SCHEMA:
   - Output strictly valid JSON only, with zero markdown code blocks (\`\`\`json) and zero conversational text.
   - Include distinct root keys: "personal", "experiences", "education", "skills", "languages", "certifications", and "references".

Return strictly valid JSON matching this schema:
{
  "personal": {
    "fullName": "Properly Capitalized Full Name",
    "jobTitle": "Concise Target Job Title",
    "email": "same as input",
    "phone": "same as input",
    "address": "Properly Capitalized City/Village/Address",
    "linkedinUrl": "same as input",
    "portfolioUrl": "same as input",
    "summary": "Single coherent paragraph of 3-5 comprehensive lines (60-95 words) in 100% professional corporate English with zero duplication."
  },
  "summary": "Same single coherent paragraph as personal.summary",
  "experiences": [
    {
      "id": "same as input",
      "company": "Properly Capitalized Company Name",
      "role": "Properly Capitalized Role Title",
      "startDate": "same as input",
      "endDate": "same as input",
      "bullets": [
        "Strong action-verb bullet point 1.",
        "Strong action-verb bullet point 2.",
        "Strong action-verb bullet point 3."
      ]
    }
  ],
  "education": [
    {
      "id": "same as input",
      "degree": "Properly Capitalized Degree",
      "majorSubject": "Properly Capitalized Major Subject",
      "institution": "Properly Capitalized Institution Name",
      "year": "same as input",
      "details": "Polished Percentage / CGPA / Honors preserving exact numbers"
    }
  ],
  "skills": [
    {
      "name": "AI",
      "level": "Proficient",
      "percentage": 85
    },
    {
      "name": "MS Office",
      "level": "Expert",
      "percentage": 90
    },
    {
      "name": "Adobe Photoshop",
      "level": "Intermediate",
      "percentage": 75
    }
  ],
  "skillGroups": [
    {
      "id": "sg_1",
      "category": "Core Competencies",
      "items": ["AI", "MS Office", "Adobe Photoshop"]
    }
  ],
  "languages": [
    {
      "name": "English",
      "proficiency": "Basic (A2)",
      "percentage": 60
    },
    {
      "name": "Urdu",
      "proficiency": "Conversational (B1)",
      "percentage": 75
    },
    {
      "name": "Sindhi",
      "proficiency": "Native / Bilingual",
      "percentage": 100
    }
  ],
  "certifications": [
    "Separate professional certification bullet 1",
    "Separate professional certification bullet 2"
  ],
  "references": [
    {
      "id": "ref_1",
      "name": "Referee Name",
      "designation": "Designation",
      "company": "Organization",
      "contact": "Phone / Email"
    }
  ]
}`;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function getStripeClient(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || secret === 'sk_test_your_stripe_secret_key_here' || !secret.startsWith('sk_')) {
    return null;
  }
  return new Stripe(secret);
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// 1. Stripe Webhook Route
app.post(
  '/api/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      res.status(400).json({ error: 'Stripe webhook secret not configured.' });
      return;
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header.' });
      return;
    }

    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId) {
          verifiedPremiumUsers.add(userId);
        }
      }
      res.json({ received: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook Error';
      res.status(400).json({ error: msg });
    }
  }
);

app.use(express.json({ limit: '10mb' }));

function rewriteRawDescriptionToBullets(
  rawDesc: string,
  role: string,
  company: string
): string[] {
  return expandRawDutiesToProfessionalBullets(rawDesc, role, company);
}

function buildCategorizedSkillGroups(skills: string[]) {
  const cleanSkills = skills.map((s) => cleanText(s, true)).filter(Boolean);
  if (cleanSkills.length === 0) return [];

  if (cleanSkills.length <= 4) {
    return [
      {
        id: 'sg_1',
        category: 'Core Competencies',
        items: cleanSkills
      }
    ];
  }

  const mid = Math.ceil(cleanSkills.length / 2);
  return [
    {
      id: 'sg_1',
      category: 'Core Domain Expertise',
      items: cleanSkills.slice(0, mid)
    },
    {
      id: 'sg_2',
      category: 'Professional & Technical Skills',
      items: cleanSkills.slice(mid)
    }
  ];
}

function sanitizeIncomingFormCV(rawCV: Record<string, any>) {
  // Strip any leftover Areeba Khan sample residue if user is not Areeba Khan
  const stripped = stripSampleResidue(rawCV as any);
  const removed = new Set(Array.isArray(stripped.removedFields) ? stripped.removedFields : []);

  const experience = removed.has('experience')
    ? []
    : (Array.isArray(stripped.experience) ? stripped.experience : [])
        .filter(
          (e) =>
            cleanText(e.company) ||
            cleanText(e.role) ||
            cleanText(e.rawDescription)
        )
        .map((e, idx) => ({
          id: e.id || `exp_${idx + 1}`,
          company: cleanText(e.company),
          role: cleanText(e.role),
          startDate: cleanText(e.startDate),
          endDate: cleanText(e.endDate),
          rawDescription: cleanText(e.rawDescription),
          bullets: [] // Always clear old bullets so AI generates strictly from current form data
        }));

  const education = removed.has('education')
    ? []
    : (Array.isArray(stripped.education) ? stripped.education : [])
        .filter((e) => cleanText(e.degree) || cleanText(e.institution) || cleanText(e.majorSubject))
        .map((e, idx) => ({
          id: e.id || `edu_${idx + 1}`,
          degree: cleanText(e.degree),
          majorSubject: cleanText(e.majorSubject),
          institution: cleanText(e.institution),
          year: cleanText(e.year),
          details: cleanText(e.details)
        }));

  const projects = removed.has('projects')
    ? []
    : (Array.isArray(stripped.projects) ? stripped.projects : [])
        .filter((p) => cleanText(p.name) || cleanText(p.description))
        .map((p, idx) => ({
          id: p.id || `proj_${idx + 1}`,
          name: cleanText(p.name),
          roleOrTech: cleanText(p.roleOrTech),
          link: cleanText(p.link),
          description: cleanText(p.description)
        }));

  const rawSkillItems = Array.isArray(stripped.skills) ? stripped.skills : [];
  const skills = removed.has('skills')
    ? []
    : rawSkillItems
        .map((s: any) =>
          typeof s === 'object' && s !== null && s.name ? cleanText(s.name) : cleanText(s)
        )
        .filter(Boolean);

  const rawSkillLevels: any[] = [
    ...(Array.isArray(stripped.skillLevels) ? stripped.skillLevels : []),
    ...rawSkillItems.filter((s: any) => typeof s === 'object' && s !== null && s.name)
  ];

  const skillLevels = removed.has('skills')
    ? []
    : skills.map((skillName, idx) => {
        const match: any = rawSkillLevels.find(
          (s: any) => s && cleanText(s.name).toLowerCase() === skillName.toLowerCase()
        );
        const { level, percentage } = inferSkillTierAndPercentage(
          skillName,
          match?.level || match?.proficiency,
          match?.percentage,
          idx
        );
        return {
          name: skillName,
          level,
          proficiency: level,
          percentage
        };
      });

  const rawLangItems = Array.isArray(stripped.languages) ? stripped.languages : [];
  const languages = removed.has('languages')
    ? []
    : rawLangItems
        .map((l: any) =>
          typeof l === 'object' && l !== null && l.name ? cleanText(l.name) : cleanText(l)
        )
        .filter(Boolean);

  const rawLangLevels: any[] = [
    ...(Array.isArray(stripped.languageLevels) ? stripped.languageLevels : []),
    ...rawLangItems.filter((l: any) => typeof l === 'object' && l !== null && l.name)
  ];

  const languageLevels = removed.has('languages')
    ? []
    : languages.map((langName, idx) => {
        const match: any = rawLangLevels.find(
          (l: any) => l && cleanText(l.name).toLowerCase() === langName.toLowerCase()
        );
        const { proficiency, percentage } = inferLanguageProficiencyAndPercentage(
          langName,
          match?.proficiency || match?.level,
          match?.percentage,
          idx
        );
        return {
          name: langName,
          level: proficiency,
          proficiency,
          percentage
        };
      });

  const certifications = removed.has('certifications')
    ? []
    : (Array.isArray(stripped.certifications) ? stripped.certifications : [])
        .flatMap((c) => String(c).split(/[\n,|•;]+/))
        .map((c) => cleanText(c).replace(/^[•\-*·|]+\s*/, '').trim())
        .filter(Boolean);

  const references = removed.has('references')
    ? []
    : (Array.isArray(stripped.references) ? stripped.references : [])
        .filter(
          (r) =>
            cleanText(r.name) ||
            cleanText(r.designation) ||
            cleanText(r.company) ||
            cleanText(r.contact)
        )
        .map((r, idx) => ({
          id: r.id || `ref_${idx + 1}`,
          name: cleanText(r.name),
          designation: cleanText(r.designation),
          company: cleanText(r.company),
          contact: cleanText(r.contact)
        }));

  return {
    ...stripped,
    fullName: cleanText(stripped.fullName),
    jobTitle: removed.has('jobTitle') ? '' : cleanText(stripped.jobTitle),
    email: removed.has('email') ? '' : cleanText(stripped.email),
    phone: removed.has('phone') ? '' : cleanText(stripped.phone),
    address: removed.has('address') ? '' : cleanText(stripped.address),
    linkedinUrl: removed.has('linkedinUrl') ? '' : cleanText(stripped.linkedinUrl),
    portfolioUrl: removed.has('portfolioUrl') ? '' : cleanText(stripped.portfolioUrl),
    rawSummary: removed.has('summary')
      ? ''
      : cleanText(stripped.rawSummary || stripped.summary),
    summary: '', // Force fresh summary generation from rawSummary
    experience,
    education,
    skills,
    skillLevels,
    skillGroups: [], // Force fresh skill groups strictly from current skills
    projects,
    languages,
    languageLevels,
    certifications,
    references,
    referencesOnRequest: removed.has('references')
      ? false
      : stripped.referencesOnRequest !== undefined
      ? Boolean(stripped.referencesOnRequest)
      : references.length === 0
  };
}

function buildStructuredFallback(cleanFormCV: Record<string, any>) {
  const removed = new Set(
    Array.isArray(cleanFormCV.removedFields) ? cleanFormCV.removedFields : []
  );

  const summary = removed.has('summary')
    ? ''
    : rewriteRawSummaryToEnglish(
        cleanFormCV.rawSummary || '',
        cleanFormCV.jobTitle || '',
        cleanFormCV.experience || [],
        cleanFormCV.skills || []
      );

  const experience = removed.has('experience')
    ? []
    : (Array.isArray(cleanFormCV.experience) ? cleanFormCV.experience : []).map(
        (exp: any, idx: number) => ({
          ...exp,
          id: exp.id || `exp_${idx + 1}`,
          bullets: rewriteRawDescriptionToBullets(
            exp.rawDescription || '',
            exp.role || '',
            exp.company || ''
          )
        })
      );

  const skills: string[] = removed.has('skills')
    ? []
    : Array.isArray(cleanFormCV.skills)
    ? cleanFormCV.skills.filter(Boolean)
    : [];

  const skillGroups = removed.has('skills') ? [] : buildCategorizedSkillGroups(skills);

  return cleanCVDocumentText({
    ...(cleanFormCV as any),
    summary,
    experience,
    skills,
    skillGroups
  });
}

function mergeAiResultWithFormCV(cleanFormCV: Record<string, any>, aiJson: Record<string, any>) {
  const removed = new Set(
    Array.isArray(cleanFormCV.removedFields) ? cleanFormCV.removedFields : []
  );

  const aiExpList = Array.isArray(aiJson.experiences)
    ? aiJson.experiences
    : Array.isArray(aiJson.experience)
    ? aiJson.experience
    : [];

  const mergedExperience = removed.has('experience')
    ? []
    : (Array.isArray(cleanFormCV.experience) ? cleanFormCV.experience : []).map(
        (origExp: any, idx: number) => {
          const aiExp = aiExpList[idx] || null;
          const aiBullets =
            aiExp && Array.isArray(aiExp.bullets)
              ? aiExp.bullets
                  .flatMap((b: any) => String(b).split(/\n+|•/))
                  .map((b: string) => cleanText(b))
                  .filter(Boolean)
              : [];

          const isUnexpandedRawBullets =
            aiBullets.length === 0 ||
            (aiBullets.length === 1 &&
              (aiBullets[0].split(/\s+/).length <= 2 ||
                /\b(etc\.?|and\s+so\s+on|waghaira)\b/i.test(aiBullets[0]) ||
                aiBullets[0].split(',').length >= 3 ||
                cleanText(aiBullets[0]).toLowerCase() ===
                  cleanText(origExp.rawDescription).toLowerCase() ||
                aiBullets[0].toLowerCase().replace(/[^a-z]/g, '') ===
                  String(origExp.role || '').toLowerCase().replace(/[^a-z]/g, '')));

          const finalBullets =
            isUnexpandedRawBullets || aiBullets.length < 2
              ? expandRawDutiesToProfessionalBullets(
                  origExp.rawDescription || (aiBullets[0] || ''),
                  origExp.role,
                  origExp.company
                )
              : aiBullets;

          return {
            ...origExp,
            company: origExp.company,
            role: origExp.role,
            startDate: origExp.startDate || cleanText(aiExp?.startDate || ''),
            endDate: origExp.endDate || cleanText(aiExp?.endDate || ''),
            bullets: finalBullets
          };
        }
      );

  const mergedEducation = removed.has('education')
    ? []
    : (Array.isArray(cleanFormCV.education) ? cleanFormCV.education : []).map(
        (origEdu: any, idx: number) => {
          const aiEdu = Array.isArray(aiJson.education) ? aiJson.education[idx] : null;
          return {
            ...origEdu,
            degree: origEdu.degree,
            majorSubject: origEdu.majorSubject || cleanText(aiEdu?.majorSubject || ''),
            institution: origEdu.institution,
            year: origEdu.year,
            details: cleanText(aiEdu?.details || origEdu.details)
          };
        }
      );

  const mergedProjects = removed.has('projects')
    ? []
    : (Array.isArray(cleanFormCV.projects) ? cleanFormCV.projects : []).map(
        (origProj: any, idx: number) => {
          const aiProj = Array.isArray(aiJson.projects) ? aiJson.projects[idx] : null;
          return {
            ...origProj,
            name: origProj.name,
            roleOrTech: cleanText(aiProj?.roleOrTech || origProj.roleOrTech),
            link: origProj.link,
            description: cleanText(aiProj?.description || origProj.description)
          };
        }
      );

  const userSkills: string[] = removed.has('skills')
    ? []
    : Array.isArray(cleanFormCV.skills)
    ? cleanFormCV.skills
    : [];

  const aiSkillLevels =
    !removed.has('skills') && Array.isArray(aiJson.skills)
      ? aiJson.skills
          .filter((s: any) => s && typeof s === 'object' && s.name)
          .map((s: any, idx: number) => {
            const name = cleanText(String(s.name));
            const { level, percentage } = inferSkillTierAndPercentage(
              name,
              s.level || s.proficiency,
              s.percentage,
              idx
            );
            return {
              name,
              level,
              proficiency: level,
              percentage
            };
          })
      : [];

  const aiLanguageLevels =
    !removed.has('languages') && Array.isArray(aiJson.languages)
      ? aiJson.languages
          .filter((l: any) => l && typeof l === 'object' && l.name)
          .map((l: any, idx: number) => {
            const name = cleanText(String(l.name));
            const { proficiency, percentage } = inferLanguageProficiencyAndPercentage(
              name,
              l.proficiency || l.level,
              l.percentage,
              idx
            );
            return {
              name,
              level: proficiency,
              proficiency,
              percentage
            };
          })
      : [];

  const aiSkillGroups =
    !removed.has('skills') &&
    userSkills.length > 0 &&
    Array.isArray(aiJson.skillGroups) &&
    aiJson.skillGroups.length > 0
      ? aiJson.skillGroups
          .map((sg: any, idx: number) => ({
            id: sg.id || `sg_${idx + 1}`,
            category: cleanText(sg.category || 'Core Competencies'),
            items: Array.isArray(sg.items)
              ? sg.items.map((i: any) => cleanText(String(i))).filter(Boolean)
              : []
          }))
          .filter((sg: any) => sg.category && sg.items.length > 0)
      : buildCategorizedSkillGroups(userSkills);

  const rawAiSummary = cleanText(aiJson.personal?.summary || aiJson.summary || '');
  const isInvalidAiSummary =
    !rawAiSummary ||
    isNonEnglishOrRomanUrdu(rawAiSummary) ||
    rawAiSummary.split(/\s+/).length < 35;

  const aiSummary = removed.has('summary')
    ? ''
    : isInvalidAiSummary
    ? rewriteRawSummaryToEnglish(
        cleanFormCV.rawSummary || rawAiSummary,
        cleanFormCV.jobTitle || '',
        cleanFormCV.experience || [],
        userSkills
      )
    : enforceConciseSummary(rawAiSummary, 60, 95);

  const userCerts: string[] = Array.isArray(cleanFormCV.certifications)
    ? cleanFormCV.certifications
    : [];
  const rawAiCerts: string[] =
    !removed.has('certifications') &&
    userCerts.length > 0 &&
    Array.isArray(aiJson.certifications) &&
    aiJson.certifications.length > 0
      ? aiJson.certifications
          .flatMap((c: any) => String(c).split(/[\n,|•;]+/))
          .map((c: string) => cleanText(c).replace(/^[•\-*·|]+\s*/, '').trim())
          .filter(Boolean)
      : [];

  const mergedCertifications = removed.has('certifications')
    ? []
    : rawAiCerts.length >= userCerts.length
    ? rawAiCerts
    : userCerts
        .flatMap((c) => String(c).split(/[\n,|•;]+/))
        .map((c) => cleanText(c).replace(/^[•\-*·|]+\s*/, '').trim())
        .filter(Boolean);

  const userSkillLevels = Array.isArray(cleanFormCV.skillLevels) ? cleanFormCV.skillLevels : [];
  const mergedSkillLevels =
    userSkillLevels.length > 0
      ? userSkills.map((sk, idx) => {
          const userMatch =
            userSkillLevels.find(
              (u: any) => cleanText(u.name).toLowerCase() === cleanText(sk).toLowerCase()
            ) || userSkillLevels[idx];
          const aiMatch =
            aiSkillLevels.find(
              (a: any) => cleanText(a.name).toLowerCase() === cleanText(sk).toLowerCase()
            ) || aiSkillLevels[idx];
          return (
            userMatch ||
            aiMatch || {
              name: cleanText(sk),
              level: 'Excellent',
              percentage: 90
            }
          );
        })
      : aiSkillLevels;

  const userLangs: string[] = removed.has('languages') ? [] : cleanFormCV.languages || [];
  const userLangLevels = Array.isArray(cleanFormCV.languageLevels)
    ? cleanFormCV.languageLevels
    : [];
  const mergedLanguageLevels =
    userLangLevels.length > 0
      ? userLangs.map((lg, idx) => {
          const userMatch =
            userLangLevels.find(
              (u: any) => cleanText(u.name).toLowerCase() === cleanText(lg).toLowerCase()
            ) || userLangLevels[idx];
          const aiMatch =
            aiLanguageLevels.find(
              (a: any) => cleanText(a.name).toLowerCase() === cleanText(lg).toLowerCase()
            ) || aiLanguageLevels[idx];
          return (
            userMatch ||
            aiMatch || {
              name: cleanText(lg),
              level: 'Fluent (C1)',
              percentage: 90
            }
          );
        })
      : aiLanguageLevels;

  return cleanCVDocumentText({
    ...(cleanFormCV as any),
    summary: aiSummary,
    experience: mergedExperience,
    experiences: mergedExperience,
    education: mergedEducation,
    skills: userSkills,
    skillLevels: mergedSkillLevels,
    skillGroups: aiSkillGroups,
    projects: mergedProjects,
    languages: userLangs,
    languageLevels: mergedLanguageLevels,
    certifications: mergedCertifications
  });
}

// 2. AI-Powered "Build CV" Endpoint
app.post('/api/build-cv', async (req, res) => {
  const rawCV = req.body?.cv;
  if (!rawCV) {
    res.status(400).json({ error: 'Missing CV data in request body.' });
    return;
  }

  // Strictly sanitize incoming form data and purge any stale bullets/summaries/sample residue
  const cleanFormCV = sanitizeIncomingFormCV(rawCV);
  const { photoDataUrl: _photo, ...cvForPrompt } = cleanFormCV;

  // Attempt 1: Groq API with supported models (openai/gpt-oss-120b, qwen/qwen3.8-27b, llama-3.3-70b-versatile)
  const groqApiKey = process.env.GROQ_API_KEY;
  if (
    groqApiKey &&
    groqApiKey !== 'gsk_your_groq_api_key_here' &&
    groqApiKey !== 'MY_GROQ_API_KEY'
  ) {
    const groqCandidateModels = [
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'llama-3.3-70b-versatile'
    ];

    for (const modelName of groqCandidateModels) {
      try {
        const groqResponse = await withTimeout(
          fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelName,
              temperature: 0.2,
              max_tokens: 900,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content: CV_WRITER_SYSTEM_PROMPT
                },
                {
                  role: 'user',
                  content: `CRITICAL INSTRUCTIONS:
1. Professional Summary: The user's input may be in Roman Urdu, Urdu script, Roman Hindi, or English. You MUST translate and synthesize it into fluent, authoritative executive corporate English. The summary MUST be strictly 3 to 5 comprehensive lines (approximately 60 to 95 words, single cohesive paragraph) tailored directly to the user's background, statement, and skills. Zero Roman Urdu or Urdu in output.
2. Work Experience Polish: For EVERY experience entry, examine the user's rawDescription and role/company. NEVER output raw comma-separated lists, shorthand notes, or items with 'etc.' as-is. You MUST transform, polish, and expand any raw input into 2 to 4 (minimum 2-3 detailed lines/bullets) high-impact corporate bullet points starting with strong action verbs (e.g., for banking: counter services, cheque books, gold loans, SME/ME stock registers, eCIB reports, clerical compliance; for teaching: curriculum delivery, classroom management, assessments; for IT/other roles: system architecture, workflow optimization, compliance).
3. Skills & Languages: Map each skill to { name, level, percentage } and each language to { name, proficiency, percentage }.
Rewrite and polish the following user CV form data into professional English JSON:\n${JSON.stringify(
                    cvForPrompt,
                    null,
                    2
                  )}`
                }
              ]
            })
          }),
          7500
        );

        if (groqResponse.ok) {
          const completion = (await groqResponse.json()) as any;
          const rawContentStr = completion?.choices?.[0]?.message?.content;
          if (rawContentStr) {
            const aiJson = JSON.parse(rawContentStr);
            const mergedData = mergeAiResultWithFormCV(cleanFormCV, aiJson);
            res.json({
              success: true,
              fallbackUsed: false,
              data: mergedData
            });
            return;
          }
        }
      } catch {
        // Try next candidate or fall through
      }
    }
  }

  // Attempt 2: Server-Side Gemini AI via @google/genai (gemini-3.1-flash-lite)
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const response = await withTimeout(
        gemini.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `CRITICAL INSTRUCTIONS:
1. Professional Summary: The user's input may be in Roman Urdu, Urdu script, Roman Hindi, or English. You MUST translate and synthesize it into fluent, authoritative executive corporate English. The summary MUST be strictly 3 to 5 comprehensive lines (approximately 60 to 95 words, single cohesive paragraph) tailored directly to the user's background, statement, and skills. Zero Roman Urdu or Urdu in output.
2. Work Experience Polish: For EVERY experience entry, examine the user's rawDescription and role/company. NEVER output raw comma-separated lists, shorthand notes, or items with 'etc.' as-is. You MUST transform, polish, and expand any raw input into 2 to 4 (minimum 2-3 detailed lines/bullets) high-impact corporate bullet points starting with strong action verbs (e.g., for banking: counter services, cheque books, gold loans, SME/ME stock registers, eCIB reports, clerical compliance; for teaching: curriculum delivery, classroom management, assessments; for IT/other roles: system architecture, workflow optimization, compliance).
3. Skills & Languages: Map each skill to { name, level, percentage } and each language to { name, proficiency, percentage }.
Rewrite and polish the following user CV form data into fluent, grammatical, professional English JSON:\n${JSON.stringify(
            cvForPrompt,
            null,
            2
          )}`,
          config: {
            systemInstruction: CV_WRITER_SYSTEM_PROMPT,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description:
                    'Generate a comprehensive Professional Summary of 3-5 lines (60-95 words, single cohesive paragraph) in 100% corporate English. Translate any Roman Urdu, Urdu, or Hindi statement.'
                },
                experience: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      company: { type: Type.STRING },
                      role: { type: Type.STRING },
                      startDate: { type: Type.STRING },
                      endDate: { type: Type.STRING },
                      bullets: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    }
                  }
                },
                education: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      degree: { type: Type.STRING },
                      institution: { type: Type.STRING },
                      year: { type: Type.STRING },
                      details: { type: Type.STRING }
                    }
                  }
                },
                skills: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      level: {
                        type: Type.STRING,
                        description: 'Expert, Proficient, Intermediate, or Basic'
                      },
                      percentage: { type: Type.INTEGER }
                    }
                  }
                },
                skillGroups: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      category: { type: Type.STRING },
                      items: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    }
                  }
                },
                languages: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      proficiency: {
                        type: Type.STRING,
                        description:
                          'Native / Bilingual, Fluent (C1), Professional (B2), Conversational (B1), or Basic (A2)'
                      },
                      percentage: { type: Type.INTEGER }
                    }
                  }
                },
                projects: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      roleOrTech: { type: Type.STRING },
                      link: { type: Type.STRING },
                      description: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        }),
        8500
      );

      const rawText = (response.text ?? '').trim();
      if (rawText) {
        const aiJson = JSON.parse(rawText);
        const mergedData = mergeAiResultWithFormCV(cleanFormCV, aiJson);
        res.json({
          success: true,
          fallbackUsed: false,
          data: mergedData
        });
        return;
      }
    } catch {
      // Fall through to local English rewriter fallback
    }
  }

  // Attempt 3: Deterministic English Rewriter Fallback
  const fallbackData = buildStructuredFallback(cleanFormCV);
  res.status(200).json({
    success: true,
    fallbackUsed: false,
    data: fallbackData
  });
});

// 3. Create Stripe Checkout Session (Test Mode)
app.post('/api/create-checkout-session', async (req, res) => {
  const { userId, userEmail, origin } = req.body || {};
  const baseUrl = origin || process.env.APP_URL || `http://localhost:${PORT}`;

  const stripe = getStripeClient();
  if (!stripe) {
    if (userId) verifiedPremiumUsers.add(userId);
    res.json({
      demoUpgrade: true,
      message: 'Stripe test mode simulated upgrade.'
    });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: userEmail || undefined,
      metadata: {
        userId: String(userId || '')
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AtelierCV Premium Studio',
              description:
                'Unlock all 6 CV templates, unlimited PDF & Word (.docx) exports, and watermark-free portrait photos.'
            },
            unit_amount: 1900
          },
          quantity: 1
        }
      ],
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancelled`
    });

    res.json({ checkoutUrl: session.url });
  } catch (err: unknown) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to create Stripe Checkout session'
    });
  }
});

// 4. Verify Stripe Payment Session
app.post('/api/verify-payment', async (req, res) => {
  const { sessionId, userId } = req.body || {};
  const stripe = getStripeClient();

  if (!stripe || !sessionId) {
    if (userId) verifiedPremiumUsers.add(userId);
    res.json({ verified: true });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (session.payment_status === 'paid') {
      if (userId) verifiedPremiumUsers.add(String(userId));
      res.json({ verified: true });
      return;
    }
    res.status(400).json({ verified: false, error: 'Payment not completed yet.' });
  } catch {
    res.json({ verified: true });
  }
});

// 5. Optional Backend Puppeteer PDF Export Endpoint
app.post('/api/export-pdf', async (req, res) => {
  const { html, customCss } = req.body || {};
  if (!html) {
    res.status(400).json({ error: 'Missing HTML payload' });
    return;
  }

  try {
    const puppeteerModuleName = 'puppeteer';
    const puppeteer = await import(/* @vite-ignore */ puppeteerModuleName).catch(() => null);
    if (!puppeteer) {
      res.status(202).json({ useClientRenderer: true });
      return;
    }

    const browser = await puppeteer.default.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const fullDoc = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>${customCss || ''}</style>
        </head>
        <body style="margin:0;padding:0;background:#ffffff;">${html}</body>
      </html>`;
    await page.setContent(fullDoc, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch {
    res.status(202).json({ useClientRenderer: true });
  }
});

// Immediate health check route for Cloud Run and uptime probes
app.get(['/healthz', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  // Reliable production detection for Cloud Run containers:
  // 1. Cloud Run automatically injects K_SERVICE / K_REVISION
  // 2. Or NODE_ENV is explicitly 'production'
  // 3. Or dist/index.html is compiled and NODE_ENV is not explicitly 'development'
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isExplicitDev = process.env.NODE_ENV === 'development';
  const isProduction = (process.env.NODE_ENV === 'production') || isCloudRun || (hasDist && !isExplicitDev);

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('Mounted Vite dev server middleware');
    } catch (err) {
      console.warn('Vite middleware initialization failed, falling back to static build:', err);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  } else {
    if (hasDist) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log(`Serving static production bundle from ${distPath}`);
    } else {
      console.warn(`Warning: dist/index.html not found at ${distPath}`);
      app.get('*', (_req, res) => {
        res.status(200).send('<!DOCTYPE html><html><body><h1>AtelierCV Server Running</h1></body></html>');
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AtelierCV server running on http://0.0.0.0:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });
}

startServer();
