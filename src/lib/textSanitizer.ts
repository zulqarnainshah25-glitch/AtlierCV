import type { CVDocument, ProficiencyItem } from '../types/cv.ts';

const FAKE_PLACEHOLDER_URLS = new Set([
  'linkedin.com/in/profile',
  'linkedin.com/in/username',
  'portfolio.dev',
  'yourportfolio.dev',
  'project-url.com',
  'example.com'
]);

const SAMPLE_AREEBA_URLS = new Set([
  'linkedin.com/in/areebakhan-dev',
  'linkedin.com/in/areebakhan',
  'areebakhan.dev',
  'github.com/areebakhan/paystream-sdk',
  'github.com/areebakhan/docupulse'
]);

const LOWERCASE_CONNECTORS = new Set([
  'of',
  'in',
  'and',
  'for',
  'to',
  'at',
  'on',
  'by',
  'with',
  'from',
  'the'
]);

const STRONG_ACTION_VERBS = new Set([
  'achieved',
  'administered',
  'accelerated',
  'analyzed',
  'architected',
  'assessed',
  'assisted',
  'audited',
  'automated',
  'built',
  'collaborated',
  'communicated',
  'completed',
  'conducted',
  'configured',
  'consolidated',
  'coordinated',
  'created',
  ' cultivated',
  'delivered',
  'deployed',
  'designed',
  'developed',
  'directed',
  'documented',
  'drove',
  'educated',
  'engineered',
  'enhanced',
  'established',
  'evaluated',
  'executed',
  'expanded',
  'facilitated',
  'formulated',
  'fostered',
  'generated',
  'guided',
  'headed',
  'identified',
  'implemented',
  'improved',
  'increased',
  'initiated',
  'instructed',
  'integrated',
  'launched',
  'led',
  'maintained',
  'managed',
  'mentored',
  'modernized',
  'monitored',
  'negotiated',
  'operated',
  'optimized',
  'orchestrated',
  'organized',
  'overhauled',
  'oversaw',
  'performed',
  'pioneered',
  'planned',
  'prepared',
  'presented',
  'processed',
  'produced',
  'promoted',
  'provided',
  'reconciled',
  'reduced',
  'refined',
  'resolved',
  'revamped',
  'reviewed',
  'spearheaded',
  'standardized',
  'streamlined',
  'strengthened',
  'structured',
  'supervised',
  'supported',
  'taught',
  'tested',
  'tracked',
  'trained',
  'transformed',
  'upgraded',
  'verified'
]);

/**
 * Normalizes common acronyms ("Al" -> "AI", "MS office" -> "MS Office", "bise" -> "BISE", etc.)
 */
export function normalizeAcronymsAndProperNouns(input: string): string {
  if (!input) return '';
  // Do not alter URLs or email addresses
  if (/^https?:\/\//i.test(input.trim()) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())) {
    return input;
  }

  let str = input;

  // Fix "Al" or lowercase "ai" when meant as "AI" (Artificial Intelligence)
  str = str
    .replace(/\b(Al|ai|Ai)\s+([Tt]ools|[Ss]ystems|[Mm]odels|[Aa]ssistant|[Aa]gent|[Cc]hatbot|[Bb]ased|[Pp]owered|[Ii]ntegration|[Aa]utomation)\b/g, (_, _ai, suffix) => {
      const capSuffix = suffix.charAt(0).toUpperCase() + suffix.slice(1);
      return `AI ${capSuffix}`;
    })
    .replace(/\b([Gg]en|[Oo]pen)(Al|ai|Ai)\b/g, (_, prefix) => {
      const capPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
      return `${capPrefix}AI`;
    })
    .replace(/(^|[,|•/(\s])(Al|ai|Ai)($|[,|•/)\s.])/g, '$1AI$3');

  // Fix Microsoft Office & Adobe suite casing
  str = str
    .replace(/\b[Mm][Ss]\s+[Oo]ffice\b/g, 'MS Office')
    .replace(/\b[Mm][Ss]\s+[Ww]ord\b/g, 'MS Word')
    .replace(/\b[Mm][Ss]\s+[Ee]xcel\b/g, 'MS Excel')
    .replace(/\b[Mm][Ss]\s+[Pp]ower[Pp]oint\b/g, 'MS PowerPoint')
    .replace(/\b[Mm]icrosoft\s+[Oo]ffice\b/g, 'Microsoft Office')
    .replace(/\b[Aa]dobe\s+[Pp]hotoshop\b/g, 'Adobe Photoshop')
    .replace(/\b[Aa]dobe\s+[Ii]llustrator\b/g, 'Adobe Illustrator')
    .replace(/\b[Aa]dobe\s+[Ii]n[Dd]esign\b/g, 'Adobe InDesign');

  // Fix common educational, banking, corporate, and technical acronyms
  str = str
    .replace(/\bnbp\b/gi, 'NBP')
    .replace(/\bhbl\b/gi, 'HBL')
    .replace(/\bubl\b/gi, 'UBL')
    .replace(/\bmcb\b/gi, 'MCB')
    .replace(/\bseld\b/gi, 'SELD')
    .replace(/\bbise\s+sukkur\b/gi, 'BISE Sukkur')
    .replace(/\bbise\s+hyderabad\b/gi, 'BISE Hyderabad')
    .replace(/\bbise\s+karachi\b/gi, 'BISE Karachi')
    .replace(/\bbise\s+larkana\b/gi, 'BISE Larkana')
    .replace(/\bbise\b/gi, 'BISE')
    .replace(/\bnust\b/gi, 'NUST')
    .replace(/\blums\b/gi, 'LUMS')
    .replace(/\biba\b/gi, 'IBA')
    .replace(/\bbba\b/gi, 'BBA')
    .replace(/\bmba\b/gi, 'MBA')
    .replace(/\bcgpa\b/gi, 'CGPA')
    .replace(/\bgpa\b/gi, 'GPA')
    .replace(/\biosh\b/gi, 'IOSH')
    .replace(/\bnebosh\b/gi, 'NEBOSH')
    .replace(/\bptw\b/gi, 'PTW')
    .replace(/\baws\b/gi, 'AWS')
    .replace(/\bcrm\b/gi, 'CRM')
    .replace(/\berp\b/gi, 'ERP')
    .replace(/\bhtml\b/gi, 'HTML')
    .replace(/\bcss\b/gi, 'CSS')
    .replace(/\bsql\b/gi, 'SQL')
    .replace(/\bui\/ux\b/gi, 'UI/UX');

  return str;
}

/**
 * Capitalizes proper nouns such as cities, villages, districts, institutions, degrees, and names
 * while preserving acronyms (e.g., "village kotli, taluka rohrri, sukkur" -> "Village Kotli, Taluka Rohrri, Sukkur")
 */
export function capitalizeProperPlaceOrTitle(input: string, trimEdges = true): string {
  const cleaned = cleanText(input, trimEdges);
  if (!cleaned) return '';

  return cleaned
    .split(/(\s+|,\s*|-|\/)/)
    .map((segment, index) => {
      if (!segment || /^(\s+|,\s*|-|\/)$/.test(segment)) return segment;
      // Preserve already uppercase acronyms (2+ uppercase letters like NBP, BISE, BBA, USA, UK, AI, IT, HR)
      if (/^[A-Z0-9&/]{2,}$/.test(segment)) return segment;
      const lower = segment.toLowerCase();
      if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) {
        return lower;
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join('');
}

/**
 * Strips any leaked personal home/residential address (such as "Village ..., Taluka ..., Distt: ..."
 * or the candidate's personal `cv.address`) from Education fields (degree, majorSubject, institution, details).
 */
export function stripAddressFromEducationField(
  fieldValue: string | undefined | null,
  candidateAddress?: string | null
): string {
  if (!fieldValue) return '';
  let result = String(fieldValue).trim();
  if (!result) return '';

  // 1. If the exact candidate personal address is present inside the education field, remove it
  if (candidateAddress && candidateAddress.trim().length > 4) {
    const escapedAddr = candidateAddress
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedAddr, 'gi'), '').trim();
  }

  // 2. Remove rural/residential address patterns (e.g. "Village Syedpur Shareef, Taluka Ubauro, Distt: Ghotki")
  result = result
    .replace(
      /,?\s*\b(?:Village|Vill|VPO|Mouza|Mohalla|Muhalla|Street\s*No|House\s*No)\b[^;|]*?(?:\b(?:Taluka|Tehsil|Distt|District)\b\s*:?\s*[A-Za-z\s]+(?:,\s*)?)+/gi,
      ''
    )
    .replace(
      /,?\s*\b(?:Taluka|Tehsil)\s+[A-Za-z\s]+(?:,\s*(?:Distt|District)\s*:?\s*[A-Za-z\s]+)?/gi,
      ''
    )
    .replace(
      /,?\s*\b(?:Distt|District)\s*:?\s*[A-Za-z\s]+$/gi,
      ''
    )
    .replace(/^[\s,\-–—|·:]+|[\s,\-–—|·:]+$/g, '')
    .trim();

  return result;
}

/**
 * Sanitizes CV text to guarantee 100% clean plain ASCII text in both DOM preview and PDF export:
 */
export function cleanText(input: string | undefined | null, trimEdges = true): string {
  if (input === undefined || input === null) return '';

  let str = String(input);

  // 1. Remove any stray HTML tags
  str = str.replace(/<\/?[a-zA-Z][^>]*>/g, ' ');

  // 2. Remove markdown table border lines and code fences
  str = str.replace(/\|[\s\-:]+\|/g, ' ').replace(/```[a-zA-Z]*|```/g, '');

  // 3. Explicitly unescape LaTeX math sequences first
  str = str
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\\\[/g, '')
    .replace(/\\\]/g, '')
    .replace(/\\\$/g, '$')
    .replace(/\\%/g, '%');

  // 4. Remove all remaining backslashes and square/curly brackets (preserve standard parentheses for CEFR tags like "Basic (A2)")
  str = str
    .replace(/\\/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '');

  // 5. Fix trailing dollar sign patterns left behind by LaTeX
  str = str.replace(/\b(\d+(?:\.\d+)?[MKBmkb]?)\s*\$/g, '$$$1');

  // 6. Normalize Unicode punctuation (never convert bullets into pipe "|" characters)
  str = str
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2013\u2014\u2015\u2212]/g, ' - ')
    .replace(/[\u2022\u00B7\u2027\u25AA\u25CF]/g, ' ')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 7. Ensure proper space around ampersand (&) when between words (e.g. "SKILLS &CORE" -> "SKILLS & CORE")
  if (!/^https?:\/\//i.test(str.trim())) {
    str = str.replace(/([A-Za-z0-9])\s*&\s*([A-Za-z0-9])/g, '$1 & $2');
  }

  // 8. Normalize acronyms ("Al" -> "AI", "MS office" -> "MS Office", etc.)
  str = normalizeAcronymsAndProperNouns(str);

  // 9. Collapse multiple horizontal spaces into a single standard ASCII space
  str = str.replace(/[ \t]{2,}/g, ' ');

  return trimEdges ? str.trim() : str;
}

export function toStandardPdfAscii(input: string | undefined | null): string {
  const cleaned = cleanText(input, true);
  return cleaned
    .replace(/\\/g, '')
    .replace(/[()[\]{}]/g, '')
    .replace(/\b(\d+(?:\.\d+)?[MKBmkb]?)\s*\$/g, '$$$1')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function isValidUrl(urlInput: string | undefined | null): boolean {
  if (!urlInput) return false;
  const cleaned = cleanText(urlInput, true);
  if (cleaned.length < 4) return false;
  const lower = cleaned.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (FAKE_PLACEHOLDER_URLS.has(lower)) return false;

  // Reject junk placeholders like xyx, xyz, abc, test, na, none, etc.
  if (/^(xy+z?|xyz|xyx|abc|test|na|none|nil|null|undefined|asdf|qwerty|-+)$/i.test(lower)) {
    return false;
  }

  return true;
}

export function cleanUrlField(
  urlInput: string | undefined | null,
  isSampleOwner: boolean,
  trimEdges = true
): string {
  if (!urlInput) return '';
  let str = String(urlInput).trim();
  const lower = str.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (FAKE_PLACEHOLDER_URLS.has(lower)) return '';
  if (!isSampleOwner && (SAMPLE_AREEBA_URLS.has(lower) || lower.includes('areebakhan'))) {
    return '';
  }
  return trimEdges ? str : String(urlInput);
}

export function stripSampleResidue(cv: CVDocument): CVDocument {
  const nameLower = (cv.fullName || '').trim().toLowerCase();
  const isAreeba = nameLower === 'areeba khan';
  if (isAreeba) return cv;

  const isSampleText = (txt: string | undefined | null): boolean => {
    if (!txt) return false;
    const lower = txt.toLowerCase();
    return (
      lower.includes('areeba') ||
      lower.includes('finpay technologies') ||
      lower.includes('cloudscale systems') ||
      lower.includes('paystream open sdk') ||
      lower.includes('docupulse offline sync') ||
      lower.includes('merchant payment analytics platform') ||
      lower.includes('18m in monthly transaction volume') ||
      lower.includes('cut deployment failures by 65%') ||
      lower.includes('45,000+ daily active enterprise users') ||
      lower.includes('fintech and e-commerce sectors')
    );
  };

  const SAMPLE_SKILL_SET = new Set([
    'typescript',
    'react 19',
    'node.js',
    'express',
    'postgresql',
    'firebase firestore',
    'docker',
    'aws',
    'system design',
    'graphql'
  ]);

  const allSkillsMatchSample =
    Array.isArray(cv.skills) &&
    cv.skills.length === 10 &&
    cv.skills.every((s) => SAMPLE_SKILL_SET.has(String(s).trim().toLowerCase()));

  const isSampleSkillGroup = (cat: string) => {
    const c = (cat || '').trim().toLowerCase();
    return c === 'frontend architecture' || c === 'backend & data' || c === 'cloud & devops';
  };

  const isSampleCert = (cert: string) => {
    const c = (cert || '').trim().toLowerCase();
    return (
      c.includes('aws certified solutions architect') ||
      c.includes('meta frontend developer professional certificate')
    );
  };

  const cleanedExperience = (cv.experience || [])
    .filter((exp) => !isSampleText(exp.company) && !isSampleText(exp.rawDescription))
    .map((exp) => ({
      ...exp,
      bullets: (exp.bullets || []).filter((b) => !isSampleText(b))
    }));

  const cleanedProjects = (cv.projects || []).filter(
    (proj) =>
      !isSampleText(proj.name) &&
      !isSampleText(proj.description) &&
      !SAMPLE_AREEBA_URLS.has((proj.link || '').toLowerCase())
  );

  const cleanedEducation = (cv.education || []).filter(
    (edu) =>
      !(
        (edu.institution || '').toLowerCase().includes('national university of sciences') &&
        (edu.details || '').toLowerCase().includes('3.82/4.00')
      )
  );

  const cleanedSkillGroups = (cv.skillGroups || []).filter(
    (sg) => !isSampleSkillGroup(sg.category)
  );
  const cleanedCerts = (cv.certifications || []).filter((c) => !isSampleCert(c));
  const cleanedRefs = (cv.references || []).filter(
    (r) =>
      !(
        (r.name || '').toLowerCase().includes('salman tariq') ||
        (r.name || '').toLowerCase().includes('hina majeed') ||
        (r.company || '').toLowerCase().includes('finpay')
      )
  );

  return {
    ...cv,
    email: (cv.email || '').trim().toLowerCase() === 'areeba.khan@techmail.pk' ? '' : cv.email,
    phone: (cv.phone || '').trim() === '+92 300 4567890' ? '' : cv.phone,
    address: (cv.address || '').trim() === 'DHA Phase 5, Lahore, Pakistan' ? '' : cv.address,
    linkedinUrl: cleanUrlField(cv.linkedinUrl, false, false),
    portfolioUrl: cleanUrlField(cv.portfolioUrl, false, false),
    rawSummary: isSampleText(cv.rawSummary) ? '' : cv.rawSummary,
    summary: isSampleText(cv.summary) ? '' : cv.summary,
    experience: cleanedExperience,
    education: cleanedEducation,
    skills: allSkillsMatchSample ? [] : cv.skills || [],
    skillGroups: cleanedSkillGroups,
    projects: cleanedProjects,
    certifications: cleanedCerts,
    references: cleanedRefs
  };
}

/**
 * Detects whether a string is written in Urdu script, Roman Urdu, Roman Hindi, or broken non-English.
 */
export function isNonEnglishOrRomanUrdu(text: string | undefined | null): boolean {
  if (!text) return false;
  const cleaned = cleanText(text, true);
  if (!cleaned) return false;

  // 1. Urdu / Arabic / Persian script detection
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cleaned)) {
    return true;
  }

  // 2. Devanagari script detection
  if (/[\u0900-\u097F]/.test(cleaned)) {
    return true;
  }

  const lower = cleaned.toLowerCase();

  // 3. High-confidence multi-word Roman Urdu phrases
  const directPhrases = [
    /\b(mera\s+naam|meri\s+taleem|mera\s+tajruba|mera\s+tajurba)\b/i,
    /\b(kaam\s+karta|kaam\s+kiya|kaam\s+kartay|kam\s+karta|kam\s+kiya)\b/i,
    /\b(karta\s+hoon|karti\s+hoon|karte\s+hain|kartay\s+hain|raha\s+hoon|rahi\s+hoon|rahe\s+hain)\b/i,
    /\b(saal\s+se|sal\s+se|saal\s+ka|sal\s+ka)\b/i,
    /\b(mujhe\s+chahiye|mujhe\s+aata|mujhe\s+ata)\b/i,
    /\b(teach\s+kar\s+raha|parha\s+raha|padha\s+raha)\b/i,
    /\b(aur\s+waghaira|waghaira\s+waghaira)\b/i,
    /\b(mene\s+kiya|maine\s+kiya|hum\s+ne\s+kiya)\b/i
  ];
  if (directPhrases.some((pattern) => pattern.test(lower))) {
    return true;
  }

  // 4. Roman Urdu & Hindi distinct non-English word marker frequency
  const romanUrduDistinctWords = new Set([
    'main',
    'maine',
    'mene',
    'mujhe',
    'mera',
    'meri',
    'mere',
    'humein',
    'hamara',
    'hamari',
    'woh',
    'yeh',
    'iss',
    'inn',
    'unhon',
    'inhon',
    'uss',
    'kay',
    'mein',
    'hain',
    'hoon',
    'karta',
    'karti',
    'karte',
    'kartay',
    'karna',
    'karne',
    'karein',
    'kiya',
    'kia',
    'raha',
    'rahi',
    'rahe',
    'chahiye',
    'seekha',
    'seekhe',
    'padhaya',
    'parhaya',
    'tajruba',
    'tajurba',
    'shamil',
    'waghaira',
    'bohot',
    'boht',
    'zyada',
    'ziyada',
    'naukri',
    'mulazmat',
    'taleem',
    'bhi'
  ]);

  const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
  let matchCount = 0;
  for (const w of words) {
    if (romanUrduDistinctWords.has(w)) {
      matchCount++;
      if (matchCount >= 2) return true;
    }
  }

  return matchCount >= 2;
}

/**
 * Intelligent English rewriter that transforms Roman Urdu, Urdu, Roman Hindi, or shorthand notes
 * into a structured, executive 3 to 5 lines (60 to 95 words) corporate Professional Summary.
 * Guarantees zero sentence repetition and 100% corporate English.
 */
export function rewriteRawSummaryToEnglish(
  rawText: string | undefined | null,
  jobTitle: string | undefined | null,
  experience: Array<{ role?: string; company?: string; rawDescription?: string }> = [],
  skills: string[] = []
): string {
  const cleanRaw = cleanText(rawText, true);
  const roleTitle = cleanText(jobTitle, true) || experience[0]?.role || 'Professional';

  // Extract combined context from raw text, job title, and experiences
  const combinedContext = [
    cleanRaw,
    jobTitle || '',
    ...experience.map((e) => `${e.role || ''} ${e.company || ''} ${e.rawDescription || ''}`),
    ...skills
  ]
    .join(' ')
    .toLowerCase();

  const mentionsBank = /\b(bank|banking|nbp|hbl|ubl|mcb|allied|mizan|cashier|teller|finance|branch|account|loan|trainee|ecib|check\s*book|cheque|gold\s*loan|sme)\b/i.test(
    combinedContext
  );

  const mentionsTeaching = /\b(teach|teacher|school|class|student|seld|education|educator|lecturer|tutor|academy|curriculum|lesson|pedagogy|literacy|primary)\b/i.test(
    combinedContext
  );

  const mentionsTech = /\b(software|developer|engineer|full-?stack|frontend|backend|react|node|web|it|python|java|sql|api|programming|cloud)\b/i.test(
    combinedContext
  );

  const mentionsAdminOrMgmt = /\b(admin|administration|manager|management|coordinator|operations|supervisor|assistant|executive|clerk|office)\b/i.test(
    combinedContext
  );

  let synthesizedSummary = '';

  // Case 1: Dual Background - Teaching and Banking (Common in SELD + NBP profiles)
  if (mentionsBank && mentionsTeaching) {
    synthesizedSummary =
      `Dedicated and versatile ${roleTitle} offering demonstrated expertise across primary classroom instruction and commercial banking operations. Skilled in curriculum implementation, interactive student mentorship, and foundational literacy development alongside core branch workflows, counter services, and loan documentation. Proven ability to maintain strict regulatory compliance, manage accurate institutional records, and foster positive stakeholder engagement. Committed to upholding the highest standards of operational integrity and continuous educational and organizational excellence.`;
  }
  // Case 2: Banking / Financial Services (e.g. National Bank of Pakistan)
  else if (mentionsBank) {
    synthesizedSummary =
      `Results-oriented Banking Operations Professional with practical experience in branch services, financial documentation, and retail customer support. Proficient in managing counter transactions, cheque book issuances, eCIB verifications, and collateral documentation including gold and SME loan registers. Recognized for strong procedural discipline, cash reconciliation precision, and full adherence to banking compliance regulations. Dedicated to delivering seamless financial services and optimizing daily branch efficiency.`;
  }
  // Case 3: Education / Primary Teaching (e.g. SELD, Schools)
  else if (mentionsTeaching) {
    synthesizedSummary =
      `Passionate and student-centered ${roleTitle} with hands-on experience in primary curriculum delivery, classroom management, and foundational student development. Adept at designing engaging lesson plans, conducting comprehensive student assessments, and fostering a structured, inclusive learning atmosphere. Skilled in leveraging modern instructional methodologies to support diverse learning needs and improve student achievement. Committed to advancing institutional standards, student well-being, and lifelong learning.`;
  }
  // Case 4: Software / IT / Development
  else if (mentionsTech) {
    const techSkills = skills.slice(0, 4).join(', ') || 'modern software development';
    synthesizedSummary =
      `Innovative and detail-driven ${roleTitle} with practical expertise in software development, web applications, and digital solutions. Skilled in ${techSkills}, with a focus on writing clean, modular code and optimizing user experiences. Proven ability to collaborate effectively within cross-functional teams, resolve complex technical challenges, and adhere to industry best practices. Dedicated to engineering robust, scalable software that drives organizational impact and technological innovation.`;
  }
  // Case 5: Administration / Operations
  else if (mentionsAdminOrMgmt) {
    synthesizedSummary =
      `Resourceful and proactive ${roleTitle} with a proven track record in administrative coordination, office workflow optimization, and multi-departmental support. Highly skilled in record maintenance, procedural compliance, calendar scheduling, and professional stakeholder communication. Recognized for meticulous attention to detail, efficient time management, and the ability to resolve daily operational bottlenecks. Committed to enhancing workplace productivity and driving operational excellence.`;
  }
  // Case 6: General Professional Profile
  else {
    const skillPhrase =
      skills.length > 0
        ? `Proven competencies in ${skills.slice(0, 4).join(', ')}.`
        : 'Demonstrated strengths in operational execution, task management, and collaborative problem-solving.';
    synthesizedSummary =
      `Accomplished and performance-driven ${roleTitle} dedicated to delivering high-quality results across dynamic organizational environments. ${skillPhrase} Experienced in maintaining rigorous workflow standards, managing project documentation, and communicating effectively across diverse professional teams. Recognized for reliability, strong work ethic, and proactive approach to challenges. Committed to supporting institutional goals and achieving long-term professional excellence.`;
  }

  return enforceConciseSummary(synthesizedSummary, 60, 95);
}

/**
 * STRICT SINGLE-PARAGRAPH DEDUPLICATED SUMMARY FUNCTION:
 * Guarantees a single cohesive paragraph (3 to 5 sentences / lines, 60 to 95 words) with ZERO sentence or half-string duplication.
 */
export function enforceConciseSummary(
  input: string | undefined | null,
  minWords = 50,
  maxWords = 95
): string {
  const cleaned = cleanText(input, true).replace(/\s*\n+\s*/g, ' ');
  if (!cleaned) return '';

  // Check if the entire string was accidentally concatenated twice (e.g., "abc. abc.")
  const halfLen = Math.floor(cleaned.length / 2);
  let baseText = cleaned;
  if (cleaned.length > 30) {
    const firstHalf = cleaned.slice(0, halfLen).trim();
    const secondHalf = cleaned.slice(halfLen).trim();
    if (
      firstHalf.toLowerCase().replace(/[^a-z0-9]/g, '') ===
      secondHalf.toLowerCase().replace(/[^a-z0-9]/g, '')
    ) {
      baseText = firstHalf;
    }
  }

  const sentences = baseText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const uniqueSentences: string[] = [];
  const seenNormalized = new Set<string>();

  for (const s of sentences) {
    const norm = s
      .toLowerCase()
      .replace(/^professional\s+summary[:\-\s]*/i, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!norm || seenNormalized.has(norm)) continue;
    // Also skip if this sentence is already a substring of an existing sentence
    const isDuplicateSubstring = Array.from(seenNormalized).some(
      (existing) => existing.includes(norm) || norm.includes(existing)
    );
    if (isDuplicateSubstring) continue;

    seenNormalized.add(norm);
    const cleanSentence = s.replace(/^professional\s+summary[:\-\s]*/i, '').trim();
    const capitalized =
      cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1);
    const formatted = /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    uniqueSentences.push(formatted);
    // Allow up to 5 sentences for a 3 to 5 line executive summary
    if (uniqueSentences.length >= 5) break;
  }

  let finalSummary = '';
  let wordCount = 0;

  for (const sentence of uniqueSentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (wordCount + words.length > maxWords) {
      if (wordCount === 0 || wordCount < minWords) {
        const sliced = words.slice(0, maxWords).join(' ').replace(/[,;:\-]+$/, '');
        finalSummary = /[.!?]$/.test(sliced) ? sliced : `${sliced}.`;
      }
      break;
    }
    finalSummary += (finalSummary ? ' ' : '') + sentence;
    wordCount += words.length;
  }

  return finalSummary.trim();
}

/**
 * Ensures every bullet point begins with a strong corporate action verb and is properly punctuated.
 */
export function ensureActionVerbBullet(rawBullet: string): string {
  let b = cleanText(rawBullet, true)
    .replace(/^[•\-*·|\d.)]+\s*/, '')
    .replace(/\bclassed\b/gi, 'classes')
    .trim();
  if (!b) return '';

  // Strip weak conversational prefixes and convert to strong action verbs
  b = b
    .replace(/^(i\s+was\s+responsible\s+for|responsible\s+for|duties\s+included|worked\s+on|working\s+on)\s+/i, 'Managed ')
    .replace(/^(i\s+worked\s+as\s+a?\s*|worked\s+as\s+a?\s*)/i, 'Served as ')
    .replace(/^(i\s+taught|teaching)\s+/i, 'Instructed and delivered ')
    .replace(/^(i\s+assisted\s+in|helping\s+with|helped\s+with)\s+/i, 'Assisted with ')
    .replace(/^(i\s+handled|handling)\s+/i, 'Administered ')
    .replace(/^(i\s+did|doing)\s+/i, 'Executed ');

  const words = b.split(/\s+/);
  const firstWordLower = (words[0] || '').toLowerCase().replace(/[^a-z]/g, '');

  // If the first word ends in "-ing" (gerund), convert common gerunds to past/present action verbs
  const gerundMap: Record<string, string> = {
    managing: 'Managed',
    leading: 'Led',
    developing: 'Developed',
    creating: 'Created',
    building: 'Built',
    designing: 'Designed',
    implementing: 'Implemented',
    delivering: 'Delivered',
    coordinating: 'Coordinated',
    supervising: 'Supervised',
    monitoring: 'Monitored',
    supporting: 'Supported',
    maintaining: 'Maintained',
    preparing: 'Prepared',
    conducting: 'Conducted',
    organizing: 'Organized',
    processing: 'Processed',
    performing: 'Performed',
    training: 'Trained',
    evaluating: 'Evaluated',
    analyzing: 'Analyzed'
  };

  if (gerundMap[firstWordLower]) {
    words[0] = gerundMap[firstWordLower];
    b = words.join(' ');
  } else if (!STRONG_ACTION_VERBS.has(firstWordLower) && words.length <= 5) {
    // Prefix short noun phrases with "Executed" or "Delivered"
    b = `Executed ${b.charAt(0).toLowerCase()}${b.slice(1)}`;
  } else {
    b = b.charAt(0).toUpperCase() + b.slice(1);
  }

  return /[.!?]$/.test(b) ? b : `${b}.`;
}

export function expandRawDutiesToProfessionalBullets(
  rawDesc: string | undefined | null,
  role: string | undefined | null,
  company: string | undefined | null
): string[] {
  const roleText = capitalizeProperPlaceOrTitle(role || '');
  const compText = capitalizeProperPlaceOrTitle(company || '');
  const cleanRaw = cleanText(rawDesc, true);
  const combined = `${roleText} ${compText} ${cleanRaw}`.toLowerCase();

  // Strip trailing "etc", "and so on", "aur waghaira", etc.
  const sanitizedRaw = cleanRaw
    .replace(/\b(etc\.?|and\s+so\s+on|waghaira|aur\s+waghaira)\b/gi, '')
    .trim();

  const isBank = /\b(bank|banking|nbp|hbl|ubl|mcb|trainee|cashier|teller|finance|branch|account|loan|ecib|check\s*book|cheque|gold\s*loan|sme)\b/i.test(
    combined
  );
  const isTeach = /\b(teach|teacher|school|class|student|seld|education|lecturer|tutor|academy|curriculum|lesson)\b/i.test(
    combined
  );
  const isTech = /\b(software|developer|engineer|full-?stack|frontend|backend|react|node|web|it|python|java|sql|api)\b/i.test(
    combined
  );

  const matchedBullets: string[] = [];

  // 1. Specific Banking & Finance Keypoint Detection (e.g., National Bank of Pakistan)
  if (isBank) {
    if (/\b(counter\s*services?|cash|teller|customer\s*services?)\b/i.test(combined)) {
      matchedBullets.push(
        `Facilitated frontline banking counter services at ${compText || 'the branch'}, managing high-volume cash transactions, client inquiries, and account services with rigorous operational precision.`
      );
    }
    if (/\b(check\s*book|cheque\s*book|issuance)\b/i.test(combined)) {
      matchedBullets.push(
        `Administered end-to-end cheque book issuance protocols, verifying customer account credentials, signature mandates, and maintaining central ledger inventory.`
      );
    }
    if (/\b(gold\s*loan|pledge)\b/i.test(combined)) {
      matchedBullets.push(
        `Prepared and reviewed gold loan financing proposals, verified appraisal documentation, and maintained meticulous collateral pledge registers in strict compliance with credit policy.`
      );
    }
    if (/\b(sme|me\s*loans?|stock\s*register|stock\s*maintenance)\b/i.test(combined)) {
      matchedBullets.push(
        `Managed Small & Medium Enterprise (SME) and Microenterprise (ME) loan documentation, conducting periodic physical stock inspections and updating hypothecation stock registers.`
      );
    }
    if (/\b(ecib|cib|credit\s*report|credit\s*history)\b/i.test(combined)) {
      matchedBullets.push(
        `Generated and analyzed electronic Credit Information Bureau (eCIB) reports to evaluate borrower creditworthiness and mitigate financial credit risk.`
      );
    }
    if (/\b(office\s*work|clerical|admin|audit|register\s*maintaining|reconciliation)\b/i.test(combined)) {
      matchedBullets.push(
        `Coordinated daily branch clerical workflows, customer correspondence, and record management, ensuring 100% adherence to internal audit and State Bank regulatory standards.`
      );
    }

    if (matchedBullets.length >= 2) {
      return matchedBullets.slice(0, 4);
    }
    if (matchedBullets.length === 1) {
      matchedBullets.push(
        `Collaborated with senior branch officers to execute daily ledger reconciliations and maintain a secure, compliant banking operations environment.`
      );
      return matchedBullets;
    }
  }

  // 2. Specific Education & Teaching Keypoint Detection (e.g., School Education and Literacy Department, Sindh / SELD)
  if (isTeach) {
    if (/\b(lesson|curriculum|teaching|instruction|plan|lecture)\b/i.test(combined)) {
      matchedBullets.push(
        `Delivered structured lesson plans aligned with provincial curriculum standards at ${compText || 'the school'}, fostering an interactive and disciplined classroom learning environment.`
      );
    }
    if (/\b(assessment|paper\s*checking|exam|grading|evaluation|test)\b/i.test(combined)) {
      matchedBullets.push(
        `Conducted regular formative and summative student assessments, tracking academic performance milestones and designing targeted remediation for struggling pupils.`
      );
    }
    if (/\b(classroom\s*management|discipline|attendance|mentoring)\b/i.test(combined)) {
      matchedBullets.push(
        `Implemented positive classroom management strategies, maintaining consistent student attendance records and promoting active student engagement.`
      );
    }
    if (/\b(parent|meeting|administration|seld|department|faculty)\b/i.test(combined)) {
      matchedBullets.push(
        `Collaborated actively with school administration, faculty colleagues, and parents to support holistic student development and institutional educational benchmarks.`
      );
    }

    if (matchedBullets.length >= 2) {
      return matchedBullets.slice(0, 4);
    }
    if (matchedBullets.length === 1) {
      matchedBullets.push(
        `Assessed individual student progress through structured evaluations and adapted pedagogical methods to address diverse learning styles.`
      );
      return matchedBullets;
    }
  }

  // 3. Specific Tech & Software Engineering Keypoint Detection
  if (isTech) {
    return [
      `Architected and developed high-performance technical systems at ${compText || 'the organization'}, ensuring scalable architecture and clean code standards.`,
      `Collaborated closely with cross-functional engineering teams to troubleshoot technical bottlenecks and optimize operational workflows.`,
      `Maintained continuous integration pipelines, comprehensive technical documentation, and high code quality through rigorous peer reviews.`
    ];
  }

  // 4. Universal Smart Duty Extraction for ANY other role (Sales, Marketing, HR, Healthcare, Engineering, Admin, etc.)
  // Split raw description by comma, semicolon, newline, bullet, or "and"
  const rawParts = sanitizedRaw
    .split(/[,;\n•·|]+/)
    .map((p) => p.replace(/^(and\s+|responsibilities\s*included:?\s*|duties:?\s*)/i, '').trim())
    .filter((p) => p.length >= 3 && !/^(etc|none|nil|na|work|doing|task)$/i.test(p));

  if (rawParts.length >= 2) {
    const actionVerbs = [
      'Spearheaded and administered',
      'Orchestrated and executed',
      'Managed and optimized',
      'Supervised and coordinated',
      'Implemented and delivered'
    ];

    const generated = rawParts.slice(0, 4).map((part, pIdx) => {
      const verb = actionVerbs[pIdx % actionVerbs.length];
      const lowerPart = part.toLowerCase();

      // Check if part already begins with action verb
      const words = part.split(/\s+/);
      const firstLower = (words[0] || '').toLowerCase();
      if (STRONG_ACTION_VERBS.has(firstLower)) {
        return ensureActionVerbBullet(part);
      }

      if (lowerPart.includes('management') || lowerPart.includes('maintaining') || lowerPart.includes('maintenance')) {
        return `Maintained and supervised ${part.replace(/^(maintaining|maintenance\s+of)\s*/i, '')}, ensuring high operational accuracy and standard procedure compliance.`;
      }
      if (lowerPart.includes('generation') || lowerPart.includes('development') || lowerPart.includes('creating')) {
        return `Generated and analyzed ${part.replace(/^(generation\s+of|development\s+of)\s*/i, '')}, streamlining departmental reporting and operational workflows.`;
      }
      if (lowerPart.includes('service') || lowerPart.includes('support') || lowerPart.includes('client') || lowerPart.includes('customer')) {
        return `Delivered high-quality ${part}, resolving inquiries efficiently and maintaining strong stakeholder satisfaction.`;
      }

      return `${verb} ${part.charAt(0).toLowerCase()}${part.slice(1)} at ${compText || 'the organization'}, ensuring rigorous procedural compliance and reliable performance.`;
    });

    if (generated.length >= 2) {
      return generated;
    }
  }

  // 5. High-Impact Default Role Synthesis (Guaranteeing minimum 2-3 lines per experience)
  return [
    `Executed key responsibilities as ${roleText || 'Team Member'} at ${compText || 'the organization'}, ensuring procedural compliance, operational accuracy, and high service quality.`,
    `Collaborated proactively with colleagues and departmental leadership to streamline daily workflows and resolve operational challenges.`,
    `Maintained accurate documentation, logs, and quality standards across all assigned projects and operational initiatives.`
  ];
}

export function generateProfessionalRoleBullets(
  role: string | undefined,
  company: string | undefined,
  rawDescription?: string | undefined
): string[] {
  return expandRawDutiesToProfessionalBullets(rawDescription, role, company);
}

/**
 * Infers an accurate, professional skill tier & percentage (between 70% and 90% by default)
 * following Directive #2:
 * - Expert / Master: 90% - 100%
 * - Proficient / Advanced: 80% - 89%
 * - Intermediate: 70% - 79%
 * - Beginner / Basic: 50% - 69%
 */
export function inferSkillTierAndPercentage(
  skillName: string,
  explicitLevel?: string,
  explicitPct?: number,
  fallbackIndex = 0
): { level: string; percentage: number } {
  const lowerName = skillName.toLowerCase();
  const rawLevel = (explicitLevel || '').trim();
  const lowerLevel = rawLevel.toLowerCase();

  let pct =
    typeof explicitPct === 'number' && explicitPct >= 40 && explicitPct <= 100
      ? Math.round(explicitPct)
      : undefined;

  if (lowerLevel) {
    if (/expert|master|excellent/.test(lowerLevel)) {
      return { level: 'Expert', percentage: pct && pct >= 90 ? pct : 90 };
    }
    if (/proficient|advanced/.test(lowerLevel)) {
      return {
        level: lowerLevel.includes('advanced') ? 'Advanced' : 'Proficient',
        percentage: pct && pct >= 80 && pct <= 89 ? pct : 85
      };
    }
    if (/intermediate|good|competent/.test(lowerLevel)) {
      return { level: 'Intermediate', percentage: pct && pct >= 70 && pct <= 79 ? pct : 75 };
    }
    if (/beginner|basic|elementary|novice/.test(lowerLevel)) {
      return { level: 'Basic', percentage: pct && pct >= 50 && pct <= 69 ? pct : 60 };
    }
  }

  if (pct !== undefined) {
    if (pct >= 90) return { level: 'Expert', percentage: pct };
    if (pct >= 80) return { level: 'Proficient', percentage: pct };
    if (pct >= 70) return { level: 'Intermediate', percentage: pct };
    return { level: 'Basic', percentage: pct };
  }

  // Infer from skill name when no explicit command is given
  if (
    /\b(ms office|microsoft office|ms word|ms excel|ms powerpoint|classroom management|teaching|curriculum|communication|customer service|banking operations|team leadership)\b/i.test(
      lowerName
    )
  ) {
    return { level: 'Expert', percentage: 90 };
  }
  if (
    /\b(photoshop|illustrator|indesign|graphic design|video editing|canva|premiere|autocad)\b/i.test(
      lowerName
    )
  ) {
    return { level: 'Intermediate', percentage: 75 };
  }
  if (/\b(ai|ai tools|artificial intelligence|data analysis|financial|assessment|planning)\b/i.test(lowerName)) {
    return { level: 'Proficient', percentage: 85 };
  }

  const tierDefaults: Array<{ level: string; percentage: number }> = [
    { level: 'Expert', percentage: 90 },
    { level: 'Proficient', percentage: 85 },
    { level: 'Intermediate', percentage: 75 },
    { level: 'Proficient', percentage: 80 }
  ];
  return tierDefaults[fallbackIndex % tierDefaults.length];
}

/**
 * De-joins accidentally concatenated skill strings (e.g., "AIMS Office", "MS OfficeAdobe Photoshop", "AI | MS Office")
 * and extracts clean individual skill items with optional inline level/percentage.
 */
export function extractStructuredSkillEntities(
  rawInput: Array<string | ProficiencyItem | any>
): Array<{ name: string; level?: string; percentage?: number }> {
  const results: Array<{ name: string; level?: string; percentage?: number }> = [];

  const dejoinSkillText = (text: string): string => {
    return String(text || '')
      .replace(/\b(Al|AI|ai)\s*(MS\s*Office|Microsoft\s*Office|Adobe\s*Photoshop|Classroom\s*Management)/gi, 'AI, $2')
      .replace(/(MS\s*Office|Microsoft\s*Office)\s*(Adobe\s*Photoshop|AI\b|AI\s*Tools|Classroom\s*Management)/gi, '$1, $2')
      .replace(/(Adobe\s*Photoshop)\s*(MS\s*Office|Microsoft\s*Office|AI\b|AI\s*Tools|Classroom\s*Management)/gi, '$1, $2')
      .replace(/(Classroom\s*Management)\s*(Student\s*Assessment|Curriculum\s*Delivery|MS\s*Office|AI\b)/gi, '$1, $2')
      .replace(/(Student\s*Assessment)\s*(Curriculum\s*Delivery|Classroom\s*Management|MS\s*Office|AI\b)/gi, '$1, $2')
      .replace(/([a-z])(MS\s+Office|Adobe\s+Photoshop|Classroom\s+Management|Student\s+Assessment|Curriculum\s+Delivery)/g, '$1, $2');
  };

  for (const item of rawInput || []) {
    if (!item) continue;

    if (typeof item === 'object' && 'name' in item) {
      const subParts = dejoinSkillText(String(item.name || ''))
        .split(/[\n,|•·;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const part of subParts) {
        const cleaned = capitalizeProperPlaceOrTitle(part, true)
          .replace(/^[•\-*·|]+\s*/, '')
          .trim();
        if (!cleaned || cleaned.toLowerCase().includes('table')) continue;
        results.push({
          name: cleaned,
          level: cleanText(item.level || item.proficiency || '', true) || undefined,
          percentage: typeof item.percentage === 'number' ? item.percentage : undefined
        });
      }
      continue;
    }

    const rawStr = dejoinSkillText(String(item));
    const chunks = rawStr
      .split(/[\n,|•·;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const chunk of chunks) {
      let namePart = chunk;
      let explicitLevel: string | undefined;
      let explicitPct: number | undefined;

      // Extract trailing percentage like "(85%)" or "85%"
      const pctMatch = namePart.match(/\(?(\d{2,3})\s*%\)?/);
      if (pctMatch) {
        explicitPct = Number(pctMatch[1]);
        namePart = namePart.replace(pctMatch[0], '').trim();
      }

      // Extract trailing level like "- Proficient" or "(Expert)"
      const lvlMatch = namePart.match(/(?:[-—:]|\()\s*(Expert|Master|Proficient|Advanced|Intermediate|Beginner|Basic)\s*\)?$/i);
      if (lvlMatch) {
        explicitLevel = lvlMatch[1];
        namePart = namePart.slice(0, lvlMatch.index).trim();
      }

      const cleanedName = capitalizeProperPlaceOrTitle(namePart, true)
        .replace(/^[•\-*·|]+\s*/, '')
        .replace(/[-—:(\s]+$/, '')
        .trim();

      if (!cleanedName || cleanedName.toLowerCase().includes('table')) continue;
      results.push({
        name: cleanedName,
        level: explicitLevel,
        percentage: explicitPct
      });
    }
  }

  return results;
}

/**
 * De-joins accidentally concatenated language strings (e.g., "EnglishUrdu", "EnglishBasic (A2)", "English | Urdu | Sindhi")
 * and extracts clean individual language items with optional inline CEFR proficiency and percentage.
 */
export function extractStructuredLanguageEntities(
  rawInput: Array<string | ProficiencyItem | any>
): Array<{ name: string; proficiency?: string; percentage?: number }> {
  const results: Array<{ name: string; proficiency?: string; percentage?: number }> = [];

  const dejoinLangText = (text: string): string => {
    return String(text || '')
      .replace(
        /\b(English|Urdu|Sindhi|Punjabi|Pashto|Balochi|Saraiki|Arabic|French|German|Spanish|Chinese)\s*(English|Urdu|Sindhi|Punjabi|Pashto|Balochi|Saraiki|Arabic|French|German|Spanish|Chinese)\b/gi,
        '$1, $2'
      )
      .replace(
        /\b(English|Urdu|Sindhi|Punjabi|Pashto|Balochi|Saraiki|Arabic|French|German|Spanish|Chinese)\s*(Native\s*\/?\s*Bilingual|Fluent\s*\(?C[12]\)?|Professional\s*\(?B2\)?|Conversational\s*\(?B1\)?|Basic\s*\(?A[12]\)?)/gi,
        '$1 - $2'
      );
  };

  for (const item of rawInput || []) {
    if (!item) continue;

    if (typeof item === 'object' && 'name' in item) {
      const subParts = dejoinLangText(String(item.name || ''))
        .split(/[\n,|•·;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const part of subParts) {
        const cleaned = capitalizeProperPlaceOrTitle(part, true)
          .replace(/^[•\-*·|]+\s*/, '')
          .trim();
        if (!cleaned) continue;
        results.push({
          name: cleaned,
          proficiency: cleanText(item.proficiency || item.level || '', true) || undefined,
          percentage: typeof item.percentage === 'number' ? item.percentage : undefined
        });
      }
      continue;
    }

    const rawStr = dejoinLangText(String(item));
    const chunks = rawStr
      .split(/[\n,|•·;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const chunk of chunks) {
      let namePart = chunk;
      let explicitProf: string | undefined;
      let explicitPct: number | undefined;

      const pctMatch = namePart.match(/\(?(\d{2,3})\s*%\)?/);
      if (pctMatch) {
        explicitPct = Number(pctMatch[1]);
        namePart = namePart.replace(pctMatch[0], '').trim();
      }

      const profMatch = namePart.match(
        /(?:[-—:]|\()\s*(Native\s*\/?\s*Bilingual|Fluent(?:\s*\(?C[12]\)?)?|Professional(?:\s*\(?B[12]\)?)?|Conversational(?:\s*\(?B[12]\)?)?|Basic(?:\s*\(?A[12]\)?)?|C[12]|B[12]|A[12])\s*\)?$/i
      );
      if (profMatch) {
        explicitProf = profMatch[1];
        namePart = namePart.slice(0, profMatch.index).trim();
      }

      const cleanedName = capitalizeProperPlaceOrTitle(namePart, true)
        .replace(/^[•\-*·|]+\s*/, '')
        .replace(/[-—:(\s]+$/, '')
        .trim();

      if (!cleanedName) continue;
      results.push({
        name: cleanedName,
        proficiency: explicitProf,
        percentage: explicitPct
      });
    }
  }

  return results;
}

/**
 * Computes structured proficiency objects for Skills:
 * [{ name: "AI", level: "Proficient", percentage: 85 }, ...]
 */
export function buildSkillProficiencyLevels(
  skills: string[],
  existing?: ProficiencyItem[]
): ProficiencyItem[] {
  return skills.map((rawSkill, idx) => {
    const cleanName = capitalizeProperPlaceOrTitle(rawSkill, true);
    const match =
      (existing || []).find(
        (item) => cleanText(item?.name).toLowerCase() === cleanName.toLowerCase()
      ) ||
      (existing &&
      existing[idx] &&
      cleanText(existing[idx].name).toLowerCase() === cleanName.toLowerCase()
        ? existing[idx]
        : undefined);

    const { level, percentage } = inferSkillTierAndPercentage(
      cleanName,
      match?.level || match?.proficiency,
      match?.percentage,
      idx
    );

    return {
      name: cleanName,
      level,
      proficiency: level,
      percentage
    };
  });
}

/**
 * Infers standard CEFR / Descriptive language proficiency and percentage following Directive #2:
 * - Native / Bilingual: 100%
 * - Fluent (C1/C2): 85% - 95%
 * - Conversational / Professional (B1/B2): 70% - 80%
 * - Basic (A1/A2): 50% - 65%
 */
export function inferLanguageProficiencyAndPercentage(
  langName: string,
  explicitProficiency?: string,
  explicitPct?: number,
  fallbackIndex = 0
): { proficiency: string; percentage: number } {
  const lowerName = langName.toLowerCase();
  const rawProf = cleanText(explicitProficiency || '', true);
  const lowerProf = rawProf.toLowerCase();

  let pct =
    typeof explicitPct === 'number' && explicitPct >= 40 && explicitPct <= 100
      ? Math.round(explicitPct)
      : undefined;

  if (lowerProf) {
    if (/native|bilingual|mother/.test(lowerProf)) {
      return { proficiency: 'Native / Bilingual', percentage: 100 };
    }
    if (/c2/.test(lowerProf)) {
      return { proficiency: 'Fluent (C2)', percentage: pct && pct >= 90 && pct <= 99 ? pct : 95 };
    }
    if (/fluent|c1/.test(lowerProf)) {
      return { proficiency: 'Fluent (C1)', percentage: pct && pct >= 85 && pct <= 95 ? pct : 90 };
    }
    if (/professional|b2/.test(lowerProf)) {
      return {
        proficiency: 'Professional (B2)',
        percentage: pct && pct >= 75 && pct <= 84 ? pct : 80
      };
    }
    if (/conversational|intermediate|b1/.test(lowerProf)) {
      return {
        proficiency: 'Conversational (B1)',
        percentage: pct && pct >= 70 && pct <= 80 ? pct : 75
      };
    }
    if (/basic|beginner|elementary|a1|a2/.test(lowerProf)) {
      const tag = lowerProf.includes('a1') ? 'Basic (A1)' : 'Basic (A2)';
      return { proficiency: tag, percentage: pct && pct >= 50 && pct <= 65 ? pct : 60 };
    }
  }

  if (pct !== undefined) {
    if (pct >= 98) return { proficiency: 'Native / Bilingual', percentage: 100 };
    if (pct >= 85) return { proficiency: 'Fluent (C1)', percentage: pct };
    if (pct >= 78) return { proficiency: 'Professional (B2)', percentage: pct };
    if (pct >= 70) return { proficiency: 'Conversational (B1)', percentage: pct };
    return { proficiency: 'Basic (A2)', percentage: pct };
  }

  // Smart language-specific defaults when user only typed language names
  if (/\b(sindhi|punjabi|pashto|balochi|saraiki|hindko|kashmiri|brahui)\b/i.test(lowerName)) {
    return { proficiency: 'Native / Bilingual', percentage: 100 };
  }
  if (/\b(urdu)\b/i.test(lowerName)) {
    return { proficiency: 'Conversational (B1)', percentage: 75 };
  }
  if (/\b(english)\b/i.test(lowerName)) {
    return { proficiency: 'Basic (A2)', percentage: 60 };
  }

  const defaults: Array<{ proficiency: string; percentage: number }> = [
    { proficiency: 'Native / Bilingual', percentage: 100 },
    { proficiency: 'Fluent (C1)', percentage: 90 },
    { proficiency: 'Conversational (B1)', percentage: 75 },
    { proficiency: 'Basic (A2)', percentage: 60 }
  ];
  return defaults[fallbackIndex % defaults.length];
}

/**
 * Computes structured CEFR proficiency objects for Languages:
 * [{ name: "English", proficiency: "Basic (A2)", level: "Basic (A2)", percentage: 60 }, ...]
 */
export function buildLanguageProficiencyLevels(
  languages: string[],
  existing?: ProficiencyItem[]
): ProficiencyItem[] {
  return languages.map((rawLang, idx) => {
    const cleaned = capitalizeProperPlaceOrTitle(rawLang, true);
    const match =
      (existing || []).find(
        (item) => cleanText(item?.name).toLowerCase() === cleaned.toLowerCase()
      ) ||
      (existing &&
      existing[idx] &&
      cleanText(existing[idx].name).toLowerCase() === cleaned.toLowerCase()
        ? existing[idx]
        : undefined);

    const { proficiency, percentage } = inferLanguageProficiencyAndPercentage(
      cleaned,
      match?.proficiency || match?.level,
      match?.percentage,
      idx
    );

    return {
      name: cleaned,
      level: proficiency,
      proficiency,
      percentage
    };
  });
}

export function cleanCVDocumentText(rawCv: CVDocument): CVDocument {
  const cv = stripSampleResidue(rawCv);
  const removed = new Set(Array.isArray(cv.removedFields) ? cv.removedFields : []);
  const isSampleOwner = (cv.fullName || '').trim().toLowerCase() === 'areeba khan';

  const rawExpList =
    Array.isArray(cv.experience) && cv.experience.length > 0
      ? cv.experience
      : Array.isArray(cv.experiences)
      ? cv.experiences
      : [];

  const experience = removed.has('experience')
    ? []
    : rawExpList.map((exp) => {
        const company = capitalizeProperPlaceOrTitle(exp.company);
        const role = capitalizeProperPlaceOrTitle(exp.role);
        const startDate = cleanText(
          exp.startDate || (exp as any).start || (exp as any).from || ''
        );
        const endDate = cleanText(exp.endDate || (exp as any).end || (exp as any).to || '');
        const rawDescription = cleanText(exp.rawDescription);

        // Split any paragraph bullets into individual sentences and enforce strong action verbs + deduplication
        const rawBulletCandidates =
          Array.isArray(exp.bullets) && exp.bullets.length > 0
            ? exp.bullets
            : rawDescription
            ? rawDescription.split(/(?<=[.!?])\s+|\n+|;+/)
            : [];

        const seenBullets = new Set<string>();
        let bullets: string[] = [];

        for (const candidate of rawBulletCandidates) {
          const splitParts = String(candidate)
            .split(/\n+|•/)
            .map((p) => ensureActionVerbBullet(p))
            .filter((p) => p.length > 3 && !/^<\/?[a-z]+/i.test(p));

          for (const part of splitParts) {
            const norm = part.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!norm || seenBullets.has(norm)) continue;
            seenBullets.add(norm);
            bullets.push(part);
          }
        }

        // Check if bullets are raw, unexpanded comma-separated notes, shorthand lists with "etc", or trivial
        const isRawCommaNotes =
          bullets.length === 1 &&
          (/\b(etc\.?|and\s+so\s+on|waghaira)\b/i.test(bullets[0]) ||
            (bullets[0].split(',').length >= 3 &&
              !STRONG_ACTION_VERBS.has((bullets[0].split(/\s+/)[0] || '').toLowerCase())));

        const isTrivial =
          bullets.length === 0 ||
          isRawCommaNotes ||
          (bullets.length === 1 &&
            (bullets[0].split(/\s+/).length <= 3 ||
              bullets[0].toLowerCase().replace(/[^a-z]/g, '') ===
                `executed${role.toLowerCase().replace(/[^a-z]/g, '')}` ||
              bullets[0].toLowerCase().replace(/[^a-z]/g, '') ===
                role.toLowerCase().replace(/[^a-z]/g, '')));

        if (isTrivial && (role || company || rawDescription)) {
          bullets = expandRawDutiesToProfessionalBullets(
            rawDescription || (bullets[0] || ''),
            role,
            company
          );
        } else if (bullets.length === 1 && (role || company)) {
          const generated = expandRawDutiesToProfessionalBullets(
            rawDescription || bullets[0],
            role,
            company
          );
          if (generated.length >= 2) {
            bullets = generated;
          }
        }

        return {
          ...exp,
          company,
          role,
          startDate,
          endDate,
          rawDescription,
          bullets
        };
      });

  const parsedSkillEntities = extractStructuredSkillEntities([
    ...(Array.isArray(cv.skills) ? cv.skills : []),
    ...((cv.skills && cv.skills.length > 0)
      ? []
      : (cv.skillGroups || []).flatMap((sg) => sg.items || []))
  ]);

  const parsedExistingSkillLevels = extractStructuredSkillEntities(
    Array.isArray(cv.skillLevels) ? cv.skillLevels : []
  ).map((s) => ({
    name: s.name,
    level: s.level || '',
    proficiency: s.level || '',
    percentage: typeof s.percentage === 'number' ? s.percentage : NaN
  }));

  const inlineSkillObjects: ProficiencyItem[] = parsedSkillEntities
    .filter((s) => s.level || typeof s.percentage === 'number')
    .map((s) => ({
      name: s.name,
      level: s.level || '',
      proficiency: s.level || '',
      percentage: typeof s.percentage === 'number' ? s.percentage : NaN
    }));

  const seenSkills = new Set<string>();
  const skills = removed.has('skills')
    ? []
    : parsedSkillEntities
        .map((s) => s.name)
        .filter((s) => {
          if (!s || s.toLowerCase().includes('table')) return false;
          const key = s.toLowerCase();
          if (seenSkills.has(key)) return false;
          seenSkills.add(key);
          return true;
        });

  const combinedExistingSkills = [...parsedExistingSkillLevels, ...inlineSkillObjects];

  const skillLevels = removed.has('skills')
    ? []
    : buildSkillProficiencyLevels(skills, combinedExistingSkills);

  const skillGroups = removed.has('skills')
    ? []
    : (cv.skillGroups || [])
        .map((sg) => ({
          ...sg,
          category: capitalizeProperPlaceOrTitle(sg.category),
          items: extractStructuredSkillEntities(sg.items || [])
            .map((i) => i.name)
            .filter((i) => i.length > 0 && !i.toLowerCase().includes('table'))
        }))
        .filter((sg) => sg.category.length > 0 && sg.items.length > 0);

  const seenCerts = new Set<string>();
  const rawCerts = removed.has('certifications')
    ? []
    : Array.isArray(cv.certifications)
    ? cv.certifications
    : [];
  const certifications: string[] = [];
  for (const c of rawCerts) {
    const splitItems = String(c)
      .split(/\n|\||•|;|,/)
      .flatMap((part) => part.replace(/(Associate)\s+(Meta\s+Frontend)/i, '$1|$2').split('|'))
      .map((item) => capitalizeProperPlaceOrTitle(item).replace(/^[•\-*·|]+\s*/, '').trim())
      .filter((item) => item.length > 1 && !/^(cert|none|nil|na)$/i.test(item));

    for (const item of splitItems) {
      const key = item.toLowerCase();
      if (!seenCerts.has(key)) {
        seenCerts.add(key);
        certifications.push(item);
      }
    }
  }

  const parsedLangEntities = extractStructuredLanguageEntities(
    Array.isArray(cv.languages) ? cv.languages : []
  );

  const parsedExistingLangLevels = extractStructuredLanguageEntities(
    Array.isArray(cv.languageLevels) ? cv.languageLevels : []
  ).map((l) => ({
    name: l.name,
    level: l.proficiency || '',
    proficiency: l.proficiency || '',
    percentage: typeof l.percentage === 'number' ? l.percentage : NaN
  }));

  const inlineLangObjects: ProficiencyItem[] = parsedLangEntities
    .filter((l) => l.proficiency || typeof l.percentage === 'number')
    .map((l) => ({
      name: l.name,
      level: l.proficiency || '',
      proficiency: l.proficiency || '',
      percentage: typeof l.percentage === 'number' ? l.percentage : NaN
    }));

  const seenLangs = new Set<string>();
  const languages = removed.has('languages')
    ? []
    : parsedLangEntities
        .map((l) => l.name)
        .filter((l) => {
          if (!l) return false;
          const key = l.toLowerCase();
          if (seenLangs.has(key)) return false;
          seenLangs.add(key);
          return true;
        });

  const combinedExistingLangs = [...parsedExistingLangLevels, ...inlineLangObjects];

  const languageLevels = removed.has('languages')
    ? []
    : buildLanguageProficiencyLevels(languages, combinedExistingLangs);

  const references = removed.has('references')
    ? []
    : (cv.references || []).map((refItem, idx) => ({
        id: refItem.id || `ref_${idx + 1}`,
        name: capitalizeProperPlaceOrTitle(refItem.name),
        designation: capitalizeProperPlaceOrTitle(refItem.designation),
        company: capitalizeProperPlaceOrTitle(refItem.company),
        contact: cleanText(refItem.contact)
      }));

  const fullName = capitalizeProperPlaceOrTitle(cv.fullName || cv.personal?.fullName || '');
  const jobTitle = removed.has('jobTitle')
    ? ''
    : capitalizeProperPlaceOrTitle(cv.jobTitle || cv.personal?.jobTitle || '');
  const email = removed.has('email') ? '' : cleanText(cv.email || cv.personal?.email || '');
  const phone = removed.has('phone') ? '' : cleanText(cv.phone || cv.personal?.phone || '');
  const address = removed.has('address')
    ? ''
    : capitalizeProperPlaceOrTitle(cv.address || cv.personal?.address || '');
  const linkedinUrl = removed.has('linkedinUrl')
    ? ''
    : cleanUrlField(cv.linkedinUrl || cv.personal?.linkedinUrl || '', isSampleOwner);
  const portfolioUrl = removed.has('portfolioUrl')
    ? ''
    : cleanUrlField(cv.portfolioUrl || cv.personal?.portfolioUrl || '', isSampleOwner);
  const rawSummary = removed.has('summary') ? '' : cleanText(cv.rawSummary);
  let summary = removed.has('summary')
    ? ''
    : cleanText(cv.summary || cv.personal?.summary || '');

  // If summary contains Roman Urdu / non-English, clear it so it gets rewritten
  if (summary && isNonEnglishOrRomanUrdu(summary)) {
    summary = '';
  }

  // If summary is empty, generate or translate from candidate rawSummary or career context
  if (!summary && !removed.has('summary')) {
    const candidateText = rawSummary || '';
    if (candidateText || cv.jobTitle || (cv.experience && cv.experience.length > 0)) {
      summary = rewriteRawSummaryToEnglish(
        candidateText,
        cv.jobTitle || cv.personal?.jobTitle || '',
        cv.experience || (cv as any).experiences || [],
        skills
      );
    }
  }

  summary = enforceConciseSummary(summary);

  const education = removed.has('education')
    ? []
    : (cv.education || []).map((edu) => ({
        ...edu,
        degree: capitalizeProperPlaceOrTitle(stripAddressFromEducationField(edu?.degree, address)),
        majorSubject: capitalizeProperPlaceOrTitle(
          stripAddressFromEducationField(edu?.majorSubject || '', address)
        ),
        institution: capitalizeProperPlaceOrTitle(
          stripAddressFromEducationField(edu?.institution, address)
        ),
        year: cleanText(edu?.year),
        details: cleanText(stripAddressFromEducationField(edu?.details, address))
      }));

  return {
    ...cv,
    title: cleanText(cv.title),
    fullName,
    jobTitle,
    email,
    phone,
    address,
    linkedinUrl,
    portfolioUrl,
    photoDataUrl: removed.has('photoDataUrl') ? '' : cv.photoDataUrl || '',
    rawSummary,
    summary,
    personal: {
      fullName,
      jobTitle,
      email,
      phone,
      address,
      linkedinUrl,
      portfolioUrl,
      summary
    },
    experience,
    experiences: experience,
    education,
    skills,
    skillLevels,
    skillGroups,
    projects: removed.has('projects')
      ? []
      : (cv.projects || []).map((proj) => ({
          ...proj,
          name: capitalizeProperPlaceOrTitle(proj.name),
          roleOrTech: capitalizeProperPlaceOrTitle(proj.roleOrTech),
          link: cleanUrlField(proj.link, isSampleOwner),
          description: cleanText(proj.description)
        })),
    languages,
    languageLevels,
    certifications,
    references,
    referencesOnRequest: removed.has('references')
      ? false
      : cv.referencesOnRequest !== undefined
      ? Boolean(cv.referencesOnRequest)
      : true,
    removedFields: Array.from(removed)
  };
}