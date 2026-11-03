// server.ts
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

// src/lib/textSanitizer.ts
var FAKE_PLACEHOLDER_URLS = /* @__PURE__ */ new Set([
  "linkedin.com/in/profile",
  "linkedin.com/in/username",
  "portfolio.dev",
  "yourportfolio.dev",
  "project-url.com",
  "example.com"
]);
var SAMPLE_AREEBA_URLS = /* @__PURE__ */ new Set([
  "linkedin.com/in/areebakhan-dev",
  "linkedin.com/in/areebakhan",
  "areebakhan.dev",
  "github.com/areebakhan/paystream-sdk",
  "github.com/areebakhan/docupulse"
]);
var LOWERCASE_CONNECTORS = /* @__PURE__ */ new Set([
  "of",
  "in",
  "and",
  "for",
  "to",
  "at",
  "on",
  "by",
  "with",
  "from",
  "the"
]);
var STRONG_ACTION_VERBS = /* @__PURE__ */ new Set([
  "achieved",
  "administered",
  "accelerated",
  "analyzed",
  "architected",
  "assessed",
  "assisted",
  "audited",
  "automated",
  "built",
  "collaborated",
  "communicated",
  "completed",
  "conducted",
  "configured",
  "consolidated",
  "coordinated",
  "created",
  " cultivated",
  "delivered",
  "deployed",
  "designed",
  "developed",
  "directed",
  "documented",
  "drove",
  "educated",
  "engineered",
  "enhanced",
  "established",
  "evaluated",
  "executed",
  "expanded",
  "facilitated",
  "formulated",
  "fostered",
  "generated",
  "guided",
  "headed",
  "identified",
  "implemented",
  "improved",
  "increased",
  "initiated",
  "instructed",
  "integrated",
  "launched",
  "led",
  "maintained",
  "managed",
  "mentored",
  "modernized",
  "monitored",
  "negotiated",
  "operated",
  "optimized",
  "orchestrated",
  "organized",
  "overhauled",
  "oversaw",
  "performed",
  "pioneered",
  "planned",
  "prepared",
  "presented",
  "processed",
  "produced",
  "promoted",
  "provided",
  "reconciled",
  "reduced",
  "refined",
  "resolved",
  "revamped",
  "reviewed",
  "spearheaded",
  "standardized",
  "streamlined",
  "strengthened",
  "structured",
  "supervised",
  "supported",
  "taught",
  "tested",
  "tracked",
  "trained",
  "transformed",
  "upgraded",
  "verified"
]);
function normalizeAcronymsAndProperNouns(input) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input.trim()) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())) {
    return input;
  }
  let str = input;
  str = str.replace(/\b(Al|ai|Ai)\s+([Tt]ools|[Ss]ystems|[Mm]odels|[Aa]ssistant|[Aa]gent|[Cc]hatbot|[Bb]ased|[Pp]owered|[Ii]ntegration|[Aa]utomation)\b/g, (_, _ai, suffix) => {
    const capSuffix = suffix.charAt(0).toUpperCase() + suffix.slice(1);
    return `AI ${capSuffix}`;
  }).replace(/\b([Gg]en|[Oo]pen)(Al|ai|Ai)\b/g, (_, prefix) => {
    const capPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    return `${capPrefix}AI`;
  }).replace(/(^|[,|•/(\s])(Al|ai|Ai)($|[,|•/)\s.])/g, "$1AI$3");
  str = str.replace(/\b[Mm][Ss]\s+[Oo]ffice\b/g, "MS Office").replace(/\b[Mm][Ss]\s+[Ww]ord\b/g, "MS Word").replace(/\b[Mm][Ss]\s+[Ee]xcel\b/g, "MS Excel").replace(/\b[Mm][Ss]\s+[Pp]ower[Pp]oint\b/g, "MS PowerPoint").replace(/\b[Mm]icrosoft\s+[Oo]ffice\b/g, "Microsoft Office").replace(/\b[Aa]dobe\s+[Pp]hotoshop\b/g, "Adobe Photoshop").replace(/\b[Aa]dobe\s+[Ii]llustrator\b/g, "Adobe Illustrator").replace(/\b[Aa]dobe\s+[Ii]n[Dd]esign\b/g, "Adobe InDesign");
  str = str.replace(/\bnbp\b/gi, "NBP").replace(/\bhbl\b/gi, "HBL").replace(/\bubl\b/gi, "UBL").replace(/\bmcb\b/gi, "MCB").replace(/\bseld\b/gi, "SELD").replace(/\bbise\s+sukkur\b/gi, "BISE Sukkur").replace(/\bbise\s+hyderabad\b/gi, "BISE Hyderabad").replace(/\bbise\s+karachi\b/gi, "BISE Karachi").replace(/\bbise\s+larkana\b/gi, "BISE Larkana").replace(/\bbise\b/gi, "BISE").replace(/\bnust\b/gi, "NUST").replace(/\blums\b/gi, "LUMS").replace(/\biba\b/gi, "IBA").replace(/\bbba\b/gi, "BBA").replace(/\bmba\b/gi, "MBA").replace(/\bcgpa\b/gi, "CGPA").replace(/\bgpa\b/gi, "GPA").replace(/\biosh\b/gi, "IOSH").replace(/\bnebosh\b/gi, "NEBOSH").replace(/\bptw\b/gi, "PTW").replace(/\baws\b/gi, "AWS").replace(/\bcrm\b/gi, "CRM").replace(/\berp\b/gi, "ERP").replace(/\bhtml\b/gi, "HTML").replace(/\bcss\b/gi, "CSS").replace(/\bsql\b/gi, "SQL").replace(/\bui\/ux\b/gi, "UI/UX");
  return str;
}
function capitalizeProperPlaceOrTitle(input, trimEdges = true) {
  const cleaned = cleanText(input, trimEdges);
  if (!cleaned) return "";
  return cleaned.split(/(\s+|,\s*|-|\/)/).map((segment, index) => {
    if (!segment || /^(\s+|,\s*|-|\/)$/.test(segment)) return segment;
    if (/^[A-Z0-9&/]{2,}$/.test(segment)) return segment;
    const lower = segment.toLowerCase();
    if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) {
      return lower;
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }).join("");
}
function cleanText(input, trimEdges = true) {
  if (input === void 0 || input === null) return "";
  let str = String(input);
  str = str.replace(/<\/?[a-zA-Z][^>]*>/g, " ");
  str = str.replace(/\|[\s\-:]+\|/g, " ").replace(/```[a-zA-Z]*|```/g, "");
  str = str.replace(/\\\(/g, "").replace(/\\\)/g, "").replace(/\\\[/g, "").replace(/\\\]/g, "").replace(/\\\$/g, "$").replace(/\\%/g, "%");
  str = str.replace(/\\/g, "").replace(/\[/g, "").replace(/\]/g, "").replace(/\{/g, "").replace(/\}/g, "");
  str = str.replace(/\b(\d+(?:\.\d+)?[MKBmkb]?)\s*\$/g, "$$$1");
  str = str.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'").replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"').replace(/[\u2013\u2014\u2015\u2212]/g, " - ").replace(/[\u2022\u00B7\u2027\u25AA\u25CF]/g, " ").replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!/^https?:\/\//i.test(str.trim())) {
    str = str.replace(/([A-Za-z0-9])\s*&\s*([A-Za-z0-9])/g, "$1 & $2");
  }
  str = normalizeAcronymsAndProperNouns(str);
  str = str.replace(/[ \t]{2,}/g, " ");
  return trimEdges ? str.trim() : str;
}
function cleanUrlField(urlInput, isSampleOwner, trimEdges = true) {
  if (!urlInput) return "";
  let str = String(urlInput).trim();
  const lower = str.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (FAKE_PLACEHOLDER_URLS.has(lower)) return "";
  if (!isSampleOwner && (SAMPLE_AREEBA_URLS.has(lower) || lower.includes("areebakhan"))) {
    return "";
  }
  return trimEdges ? str : String(urlInput);
}
function stripSampleResidue(cv) {
  const nameLower = (cv.fullName || "").trim().toLowerCase();
  const isAreeba = nameLower === "areeba khan";
  if (isAreeba) return cv;
  const isSampleText = (txt) => {
    if (!txt) return false;
    const lower = txt.toLowerCase();
    return lower.includes("areeba") || lower.includes("finpay technologies") || lower.includes("cloudscale systems") || lower.includes("paystream open sdk") || lower.includes("docupulse offline sync") || lower.includes("merchant payment analytics platform") || lower.includes("18m in monthly transaction volume") || lower.includes("cut deployment failures by 65%") || lower.includes("45,000+ daily active enterprise users") || lower.includes("fintech and e-commerce sectors");
  };
  const SAMPLE_SKILL_SET = /* @__PURE__ */ new Set([
    "typescript",
    "react 19",
    "node.js",
    "express",
    "postgresql",
    "firebase firestore",
    "docker",
    "aws",
    "system design",
    "graphql"
  ]);
  const allSkillsMatchSample = Array.isArray(cv.skills) && cv.skills.length === 10 && cv.skills.every((s) => SAMPLE_SKILL_SET.has(String(s).trim().toLowerCase()));
  const isSampleSkillGroup = (cat) => {
    const c = (cat || "").trim().toLowerCase();
    return c === "frontend architecture" || c === "backend & data" || c === "cloud & devops";
  };
  const isSampleCert = (cert) => {
    const c = (cert || "").trim().toLowerCase();
    return c.includes("aws certified solutions architect") || c.includes("meta frontend developer professional certificate");
  };
  const cleanedExperience = (cv.experience || []).filter((exp) => !isSampleText(exp.company) && !isSampleText(exp.rawDescription)).map((exp) => ({
    ...exp,
    bullets: (exp.bullets || []).filter((b) => !isSampleText(b))
  }));
  const cleanedProjects = (cv.projects || []).filter(
    (proj) => !isSampleText(proj.name) && !isSampleText(proj.description) && !SAMPLE_AREEBA_URLS.has((proj.link || "").toLowerCase())
  );
  const cleanedEducation = (cv.education || []).filter(
    (edu) => !((edu.institution || "").toLowerCase().includes("national university of sciences") && (edu.details || "").toLowerCase().includes("3.82/4.00"))
  );
  const cleanedSkillGroups = (cv.skillGroups || []).filter(
    (sg) => !isSampleSkillGroup(sg.category)
  );
  const cleanedCerts = (cv.certifications || []).filter((c) => !isSampleCert(c));
  const cleanedRefs = (cv.references || []).filter(
    (r) => !((r.name || "").toLowerCase().includes("salman tariq") || (r.name || "").toLowerCase().includes("hina majeed") || (r.company || "").toLowerCase().includes("finpay"))
  );
  return {
    ...cv,
    email: (cv.email || "").trim().toLowerCase() === "areeba.khan@techmail.pk" ? "" : cv.email,
    phone: (cv.phone || "").trim() === "+92 300 4567890" ? "" : cv.phone,
    address: (cv.address || "").trim() === "DHA Phase 5, Lahore, Pakistan" ? "" : cv.address,
    linkedinUrl: cleanUrlField(cv.linkedinUrl, false, false),
    portfolioUrl: cleanUrlField(cv.portfolioUrl, false, false),
    rawSummary: isSampleText(cv.rawSummary) ? "" : cv.rawSummary,
    summary: isSampleText(cv.summary) ? "" : cv.summary,
    experience: cleanedExperience,
    education: cleanedEducation,
    skills: allSkillsMatchSample ? [] : cv.skills || [],
    skillGroups: cleanedSkillGroups,
    projects: cleanedProjects,
    certifications: cleanedCerts,
    references: cleanedRefs
  };
}
function isNonEnglishOrRomanUrdu(text) {
  if (!text) return false;
  const cleaned = cleanText(text, true);
  if (!cleaned) return false;
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cleaned)) {
    return true;
  }
  if (/[\u0900-\u097F]/.test(cleaned)) {
    return true;
  }
  const lower = cleaned.toLowerCase();
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
  const romanUrduDistinctWords = /* @__PURE__ */ new Set([
    "main",
    "maine",
    "mene",
    "mujhe",
    "mera",
    "meri",
    "mere",
    "humein",
    "hamara",
    "hamari",
    "woh",
    "yeh",
    "iss",
    "inn",
    "unhon",
    "inhon",
    "uss",
    "kay",
    "mein",
    "hain",
    "hoon",
    "karta",
    "karti",
    "karte",
    "kartay",
    "karna",
    "karne",
    "karein",
    "kiya",
    "kia",
    "raha",
    "rahi",
    "rahe",
    "chahiye",
    "seekha",
    "seekhe",
    "padhaya",
    "parhaya",
    "tajruba",
    "tajurba",
    "shamil",
    "waghaira",
    "bohot",
    "boht",
    "zyada",
    "ziyada",
    "naukri",
    "mulazmat",
    "taleem",
    "bhi"
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
function rewriteRawSummaryToEnglish(rawText, jobTitle, experience = [], skills = []) {
  const cleanRaw = cleanText(rawText, true);
  const roleTitle = cleanText(jobTitle, true) || experience[0]?.role || "Professional";
  const combinedContext = [
    cleanRaw,
    jobTitle || "",
    ...experience.map((e) => `${e.role || ""} ${e.company || ""} ${e.rawDescription || ""}`),
    ...skills
  ].join(" ").toLowerCase();
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
  let synthesizedSummary = "";
  if (mentionsBank && mentionsTeaching) {
    synthesizedSummary = `Dedicated and versatile ${roleTitle} offering demonstrated expertise across primary classroom instruction and commercial banking operations. Skilled in curriculum implementation, interactive student mentorship, and foundational literacy development alongside core branch workflows, counter services, and loan documentation. Proven ability to maintain strict regulatory compliance, manage accurate institutional records, and foster positive stakeholder engagement. Committed to upholding the highest standards of operational integrity and continuous educational and organizational excellence.`;
  } else if (mentionsBank) {
    synthesizedSummary = `Results-oriented Banking Operations Professional with practical experience in branch services, financial documentation, and retail customer support. Proficient in managing counter transactions, cheque book issuances, eCIB verifications, and collateral documentation including gold and SME loan registers. Recognized for strong procedural discipline, cash reconciliation precision, and full adherence to banking compliance regulations. Dedicated to delivering seamless financial services and optimizing daily branch efficiency.`;
  } else if (mentionsTeaching) {
    synthesizedSummary = `Passionate and student-centered ${roleTitle} with hands-on experience in primary curriculum delivery, classroom management, and foundational student development. Adept at designing engaging lesson plans, conducting comprehensive student assessments, and fostering a structured, inclusive learning atmosphere. Skilled in leveraging modern instructional methodologies to support diverse learning needs and improve student achievement. Committed to advancing institutional standards, student well-being, and lifelong learning.`;
  } else if (mentionsTech) {
    const techSkills = skills.slice(0, 4).join(", ") || "modern software development";
    synthesizedSummary = `Innovative and detail-driven ${roleTitle} with practical expertise in software development, web applications, and digital solutions. Skilled in ${techSkills}, with a focus on writing clean, modular code and optimizing user experiences. Proven ability to collaborate effectively within cross-functional teams, resolve complex technical challenges, and adhere to industry best practices. Dedicated to engineering robust, scalable software that drives organizational impact and technological innovation.`;
  } else if (mentionsAdminOrMgmt) {
    synthesizedSummary = `Resourceful and proactive ${roleTitle} with a proven track record in administrative coordination, office workflow optimization, and multi-departmental support. Highly skilled in record maintenance, procedural compliance, calendar scheduling, and professional stakeholder communication. Recognized for meticulous attention to detail, efficient time management, and the ability to resolve daily operational bottlenecks. Committed to enhancing workplace productivity and driving operational excellence.`;
  } else {
    const skillPhrase = skills.length > 0 ? `Proven competencies in ${skills.slice(0, 4).join(", ")}.` : "Demonstrated strengths in operational execution, task management, and collaborative problem-solving.";
    synthesizedSummary = `Accomplished and performance-driven ${roleTitle} dedicated to delivering high-quality results across dynamic organizational environments. ${skillPhrase} Experienced in maintaining rigorous workflow standards, managing project documentation, and communicating effectively across diverse professional teams. Recognized for reliability, strong work ethic, and proactive approach to challenges. Committed to supporting institutional goals and achieving long-term professional excellence.`;
  }
  return enforceConciseSummary(synthesizedSummary, 60, 95);
}
function enforceConciseSummary(input, minWords = 50, maxWords = 95) {
  const cleaned = cleanText(input, true).replace(/\s*\n+\s*/g, " ");
  if (!cleaned) return "";
  const halfLen = Math.floor(cleaned.length / 2);
  let baseText = cleaned;
  if (cleaned.length > 30) {
    const firstHalf = cleaned.slice(0, halfLen).trim();
    const secondHalf = cleaned.slice(halfLen).trim();
    if (firstHalf.toLowerCase().replace(/[^a-z0-9]/g, "") === secondHalf.toLowerCase().replace(/[^a-z0-9]/g, "")) {
      baseText = firstHalf;
    }
  }
  const sentences = baseText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 3);
  const uniqueSentences = [];
  const seenNormalized = /* @__PURE__ */ new Set();
  for (const s of sentences) {
    const norm = s.toLowerCase().replace(/^professional\s+summary[:\-\s]*/i, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    if (!norm || seenNormalized.has(norm)) continue;
    const isDuplicateSubstring = Array.from(seenNormalized).some(
      (existing) => existing.includes(norm) || norm.includes(existing)
    );
    if (isDuplicateSubstring) continue;
    seenNormalized.add(norm);
    const cleanSentence = s.replace(/^professional\s+summary[:\-\s]*/i, "").trim();
    const capitalized = cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1);
    const formatted = /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    uniqueSentences.push(formatted);
    if (uniqueSentences.length >= 5) break;
  }
  let finalSummary = "";
  let wordCount = 0;
  for (const sentence of uniqueSentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (wordCount + words.length > maxWords) {
      if (wordCount === 0 || wordCount < minWords) {
        const sliced = words.slice(0, maxWords).join(" ").replace(/[,;:\-]+$/, "");
        finalSummary = /[.!?]$/.test(sliced) ? sliced : `${sliced}.`;
      }
      break;
    }
    finalSummary += (finalSummary ? " " : "") + sentence;
    wordCount += words.length;
  }
  return finalSummary.trim();
}
function ensureActionVerbBullet(rawBullet) {
  let b = cleanText(rawBullet, true).replace(/^[•\-*·|\d.)]+\s*/, "").replace(/\bclassed\b/gi, "classes").trim();
  if (!b) return "";
  b = b.replace(/^(i\s+was\s+responsible\s+for|responsible\s+for|duties\s+included|worked\s+on|working\s+on)\s+/i, "Managed ").replace(/^(i\s+worked\s+as\s+a?\s*|worked\s+as\s+a?\s*)/i, "Served as ").replace(/^(i\s+taught|teaching)\s+/i, "Instructed and delivered ").replace(/^(i\s+assisted\s+in|helping\s+with|helped\s+with)\s+/i, "Assisted with ").replace(/^(i\s+handled|handling)\s+/i, "Administered ").replace(/^(i\s+did|doing)\s+/i, "Executed ");
  const words = b.split(/\s+/);
  const firstWordLower = (words[0] || "").toLowerCase().replace(/[^a-z]/g, "");
  const gerundMap = {
    managing: "Managed",
    leading: "Led",
    developing: "Developed",
    creating: "Created",
    building: "Built",
    designing: "Designed",
    implementing: "Implemented",
    delivering: "Delivered",
    coordinating: "Coordinated",
    supervising: "Supervised",
    monitoring: "Monitored",
    supporting: "Supported",
    maintaining: "Maintained",
    preparing: "Prepared",
    conducting: "Conducted",
    organizing: "Organized",
    processing: "Processed",
    performing: "Performed",
    training: "Trained",
    evaluating: "Evaluated",
    analyzing: "Analyzed"
  };
  if (gerundMap[firstWordLower]) {
    words[0] = gerundMap[firstWordLower];
    b = words.join(" ");
  } else if (!STRONG_ACTION_VERBS.has(firstWordLower) && words.length <= 5) {
    b = `Executed ${b.charAt(0).toLowerCase()}${b.slice(1)}`;
  } else {
    b = b.charAt(0).toUpperCase() + b.slice(1);
  }
  return /[.!?]$/.test(b) ? b : `${b}.`;
}
function expandRawDutiesToProfessionalBullets(rawDesc, role, company) {
  const roleText = capitalizeProperPlaceOrTitle(role || "");
  const compText = capitalizeProperPlaceOrTitle(company || "");
  const cleanRaw = cleanText(rawDesc, true);
  const combined = `${roleText} ${compText} ${cleanRaw}`.toLowerCase();
  const sanitizedRaw = cleanRaw.replace(/\b(etc\.?|and\s+so\s+on|waghaira|aur\s+waghaira)\b/gi, "").trim();
  const isBank = /\b(bank|banking|nbp|hbl|ubl|mcb|trainee|cashier|teller|finance|branch|account|loan|ecib|check\s*book|cheque|gold\s*loan|sme)\b/i.test(
    combined
  );
  const isTeach = /\b(teach|teacher|school|class|student|seld|education|lecturer|tutor|academy|curriculum|lesson)\b/i.test(
    combined
  );
  const isTech = /\b(software|developer|engineer|full-?stack|frontend|backend|react|node|web|it|python|java|sql|api)\b/i.test(
    combined
  );
  const matchedBullets = [];
  if (isBank) {
    if (/\b(counter\s*services?|cash|teller|customer\s*services?)\b/i.test(combined)) {
      matchedBullets.push(
        `Facilitated frontline banking counter services at ${compText || "the branch"}, managing high-volume cash transactions, client inquiries, and account services with rigorous operational precision.`
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
  if (isTeach) {
    if (/\b(lesson|curriculum|teaching|instruction|plan|lecture)\b/i.test(combined)) {
      matchedBullets.push(
        `Delivered structured lesson plans aligned with provincial curriculum standards at ${compText || "the school"}, fostering an interactive and disciplined classroom learning environment.`
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
  if (isTech) {
    return [
      `Architected and developed high-performance technical systems at ${compText || "the organization"}, ensuring scalable architecture and clean code standards.`,
      `Collaborated closely with cross-functional engineering teams to troubleshoot technical bottlenecks and optimize operational workflows.`,
      `Maintained continuous integration pipelines, comprehensive technical documentation, and high code quality through rigorous peer reviews.`
    ];
  }
  const rawParts = sanitizedRaw.split(/[,;\n•·|]+/).map((p) => p.replace(/^(and\s+|responsibilities\s*included:?\s*|duties:?\s*)/i, "").trim()).filter((p) => p.length >= 3 && !/^(etc|none|nil|na|work|doing|task)$/i.test(p));
  if (rawParts.length >= 2) {
    const actionVerbs = [
      "Spearheaded and administered",
      "Orchestrated and executed",
      "Managed and optimized",
      "Supervised and coordinated",
      "Implemented and delivered"
    ];
    const generated = rawParts.slice(0, 4).map((part, pIdx) => {
      const verb = actionVerbs[pIdx % actionVerbs.length];
      const lowerPart = part.toLowerCase();
      const words = part.split(/\s+/);
      const firstLower = (words[0] || "").toLowerCase();
      if (STRONG_ACTION_VERBS.has(firstLower)) {
        return ensureActionVerbBullet(part);
      }
      if (lowerPart.includes("management") || lowerPart.includes("maintaining") || lowerPart.includes("maintenance")) {
        return `Maintained and supervised ${part.replace(/^(maintaining|maintenance\s+of)\s*/i, "")}, ensuring high operational accuracy and standard procedure compliance.`;
      }
      if (lowerPart.includes("generation") || lowerPart.includes("development") || lowerPart.includes("creating")) {
        return `Generated and analyzed ${part.replace(/^(generation\s+of|development\s+of)\s*/i, "")}, streamlining departmental reporting and operational workflows.`;
      }
      if (lowerPart.includes("service") || lowerPart.includes("support") || lowerPart.includes("client") || lowerPart.includes("customer")) {
        return `Delivered high-quality ${part}, resolving inquiries efficiently and maintaining strong stakeholder satisfaction.`;
      }
      return `${verb} ${part.charAt(0).toLowerCase()}${part.slice(1)} at ${compText || "the organization"}, ensuring rigorous procedural compliance and reliable performance.`;
    });
    if (generated.length >= 2) {
      return generated;
    }
  }
  return [
    `Executed key responsibilities as ${roleText || "Team Member"} at ${compText || "the organization"}, ensuring procedural compliance, operational accuracy, and high service quality.`,
    `Collaborated proactively with colleagues and departmental leadership to streamline daily workflows and resolve operational challenges.`,
    `Maintained accurate documentation, logs, and quality standards across all assigned projects and operational initiatives.`
  ];
}
function inferSkillTierAndPercentage(skillName, explicitLevel, explicitPct, fallbackIndex = 0) {
  const lowerName = skillName.toLowerCase();
  const rawLevel = (explicitLevel || "").trim();
  const lowerLevel = rawLevel.toLowerCase();
  let pct = typeof explicitPct === "number" && explicitPct >= 40 && explicitPct <= 100 ? Math.round(explicitPct) : void 0;
  if (lowerLevel) {
    if (/expert|master|excellent/.test(lowerLevel)) {
      return { level: "Expert", percentage: pct && pct >= 90 ? pct : 90 };
    }
    if (/proficient|advanced/.test(lowerLevel)) {
      return {
        level: lowerLevel.includes("advanced") ? "Advanced" : "Proficient",
        percentage: pct && pct >= 80 && pct <= 89 ? pct : 85
      };
    }
    if (/intermediate|good|competent/.test(lowerLevel)) {
      return { level: "Intermediate", percentage: pct && pct >= 70 && pct <= 79 ? pct : 75 };
    }
    if (/beginner|basic|elementary|novice/.test(lowerLevel)) {
      return { level: "Basic", percentage: pct && pct >= 50 && pct <= 69 ? pct : 60 };
    }
  }
  if (pct !== void 0) {
    if (pct >= 90) return { level: "Expert", percentage: pct };
    if (pct >= 80) return { level: "Proficient", percentage: pct };
    if (pct >= 70) return { level: "Intermediate", percentage: pct };
    return { level: "Basic", percentage: pct };
  }
  if (/\b(ms office|microsoft office|ms word|ms excel|ms powerpoint|classroom management|teaching|curriculum|communication|customer service|banking operations|team leadership)\b/i.test(
    lowerName
  )) {
    return { level: "Expert", percentage: 90 };
  }
  if (/\b(photoshop|illustrator|indesign|graphic design|video editing|canva|premiere|autocad)\b/i.test(
    lowerName
  )) {
    return { level: "Intermediate", percentage: 75 };
  }
  if (/\b(ai|ai tools|artificial intelligence|data analysis|financial|assessment|planning)\b/i.test(lowerName)) {
    return { level: "Proficient", percentage: 85 };
  }
  const tierDefaults = [
    { level: "Expert", percentage: 90 },
    { level: "Proficient", percentage: 85 },
    { level: "Intermediate", percentage: 75 },
    { level: "Proficient", percentage: 80 }
  ];
  return tierDefaults[fallbackIndex % tierDefaults.length];
}
function extractStructuredSkillEntities(rawInput) {
  const results = [];
  const dejoinSkillText = (text) => {
    return String(text || "").replace(/\b(Al|AI|ai)\s*(MS\s*Office|Microsoft\s*Office|Adobe\s*Photoshop|Classroom\s*Management)/gi, "AI, $2").replace(/(MS\s*Office|Microsoft\s*Office)\s*(Adobe\s*Photoshop|AI\b|AI\s*Tools|Classroom\s*Management)/gi, "$1, $2").replace(/(Adobe\s*Photoshop)\s*(MS\s*Office|Microsoft\s*Office|AI\b|AI\s*Tools|Classroom\s*Management)/gi, "$1, $2").replace(/(Classroom\s*Management)\s*(Student\s*Assessment|Curriculum\s*Delivery|MS\s*Office|AI\b)/gi, "$1, $2").replace(/(Student\s*Assessment)\s*(Curriculum\s*Delivery|Classroom\s*Management|MS\s*Office|AI\b)/gi, "$1, $2").replace(/([a-z])(MS\s+Office|Adobe\s+Photoshop|Classroom\s+Management|Student\s+Assessment|Curriculum\s+Delivery)/g, "$1, $2");
  };
  for (const item of rawInput || []) {
    if (!item) continue;
    if (typeof item === "object" && "name" in item) {
      const subParts = dejoinSkillText(String(item.name || "")).split(/[\n,|•·;]+/).map((s) => s.trim()).filter(Boolean);
      for (const part of subParts) {
        const cleaned = capitalizeProperPlaceOrTitle(part, true).replace(/^[•\-*·|]+\s*/, "").trim();
        if (!cleaned || cleaned.toLowerCase().includes("table")) continue;
        results.push({
          name: cleaned,
          level: cleanText(item.level || item.proficiency || "", true) || void 0,
          percentage: typeof item.percentage === "number" ? item.percentage : void 0
        });
      }
      continue;
    }
    const rawStr = dejoinSkillText(String(item));
    const chunks = rawStr.split(/[\n,|•·;]+/).map((s) => s.trim()).filter(Boolean);
    for (const chunk of chunks) {
      let namePart = chunk;
      let explicitLevel;
      let explicitPct;
      const pctMatch = namePart.match(/\(?(\d{2,3})\s*%\)?/);
      if (pctMatch) {
        explicitPct = Number(pctMatch[1]);
        namePart = namePart.replace(pctMatch[0], "").trim();
      }
      const lvlMatch = namePart.match(/(?:[-—:]|\()\s*(Expert|Master|Proficient|Advanced|Intermediate|Beginner|Basic)\s*\)?$/i);
      if (lvlMatch) {
        explicitLevel = lvlMatch[1];
        namePart = namePart.slice(0, lvlMatch.index).trim();
      }
      const cleanedName = capitalizeProperPlaceOrTitle(namePart, true).replace(/^[•\-*·|]+\s*/, "").replace(/[-—:(\s]+$/, "").trim();
      if (!cleanedName || cleanedName.toLowerCase().includes("table")) continue;
      results.push({
        name: cleanedName,
        level: explicitLevel,
        percentage: explicitPct
      });
    }
  }
  return results;
}
function extractStructuredLanguageEntities(rawInput) {
  const results = [];
  const dejoinLangText = (text) => {
    return String(text || "").replace(
      /\b(English|Urdu|Sindhi|Punjabi|Pashto|Balochi|Saraiki|Arabic|French|German|Spanish|Chinese)\s*(English|Urdu|Sindhi|Punjabi|Pashto|Balochi|Saraiki|Arabic|French|German|Spanish|Chinese)\b/gi,
      "$1, $2"
    ).replace(
      /\b(English|Urdu|Sindhi|Punjabi|Pashto|Balochi|Saraiki|Arabic|French|German|Spanish|Chinese)\s*(Native\s*\/?\s*Bilingual|Fluent\s*\(?C[12]\)?|Professional\s*\(?B2\)?|Conversational\s*\(?B1\)?|Basic\s*\(?A[12]\)?)/gi,
      "$1 - $2"
    );
  };
  for (const item of rawInput || []) {
    if (!item) continue;
    if (typeof item === "object" && "name" in item) {
      const subParts = dejoinLangText(String(item.name || "")).split(/[\n,|•·;]+/).map((s) => s.trim()).filter(Boolean);
      for (const part of subParts) {
        const cleaned = capitalizeProperPlaceOrTitle(part, true).replace(/^[•\-*·|]+\s*/, "").trim();
        if (!cleaned) continue;
        results.push({
          name: cleaned,
          proficiency: cleanText(item.proficiency || item.level || "", true) || void 0,
          percentage: typeof item.percentage === "number" ? item.percentage : void 0
        });
      }
      continue;
    }
    const rawStr = dejoinLangText(String(item));
    const chunks = rawStr.split(/[\n,|•·;]+/).map((s) => s.trim()).filter(Boolean);
    for (const chunk of chunks) {
      let namePart = chunk;
      let explicitProf;
      let explicitPct;
      const pctMatch = namePart.match(/\(?(\d{2,3})\s*%\)?/);
      if (pctMatch) {
        explicitPct = Number(pctMatch[1]);
        namePart = namePart.replace(pctMatch[0], "").trim();
      }
      const profMatch = namePart.match(
        /(?:[-—:]|\()\s*(Native\s*\/?\s*Bilingual|Fluent(?:\s*\(?C[12]\)?)?|Professional(?:\s*\(?B[12]\)?)?|Conversational(?:\s*\(?B[12]\)?)?|Basic(?:\s*\(?A[12]\)?)?|C[12]|B[12]|A[12])\s*\)?$/i
      );
      if (profMatch) {
        explicitProf = profMatch[1];
        namePart = namePart.slice(0, profMatch.index).trim();
      }
      const cleanedName = capitalizeProperPlaceOrTitle(namePart, true).replace(/^[•\-*·|]+\s*/, "").replace(/[-—:(\s]+$/, "").trim();
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
function buildSkillProficiencyLevels(skills, existing) {
  return skills.map((rawSkill, idx) => {
    const cleanName = capitalizeProperPlaceOrTitle(rawSkill, true);
    const match = (existing || []).find(
      (item) => cleanText(item?.name).toLowerCase() === cleanName.toLowerCase()
    ) || (existing && existing[idx] && cleanText(existing[idx].name).toLowerCase() === cleanName.toLowerCase() ? existing[idx] : void 0);
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
function inferLanguageProficiencyAndPercentage(langName, explicitProficiency, explicitPct, fallbackIndex = 0) {
  const lowerName = langName.toLowerCase();
  const rawProf = cleanText(explicitProficiency || "", true);
  const lowerProf = rawProf.toLowerCase();
  let pct = typeof explicitPct === "number" && explicitPct >= 40 && explicitPct <= 100 ? Math.round(explicitPct) : void 0;
  if (lowerProf) {
    if (/native|bilingual|mother/.test(lowerProf)) {
      return { proficiency: "Native / Bilingual", percentage: 100 };
    }
    if (/c2/.test(lowerProf)) {
      return { proficiency: "Fluent (C2)", percentage: pct && pct >= 90 && pct <= 99 ? pct : 95 };
    }
    if (/fluent|c1/.test(lowerProf)) {
      return { proficiency: "Fluent (C1)", percentage: pct && pct >= 85 && pct <= 95 ? pct : 90 };
    }
    if (/professional|b2/.test(lowerProf)) {
      return {
        proficiency: "Professional (B2)",
        percentage: pct && pct >= 75 && pct <= 84 ? pct : 80
      };
    }
    if (/conversational|intermediate|b1/.test(lowerProf)) {
      return {
        proficiency: "Conversational (B1)",
        percentage: pct && pct >= 70 && pct <= 80 ? pct : 75
      };
    }
    if (/basic|beginner|elementary|a1|a2/.test(lowerProf)) {
      const tag = lowerProf.includes("a1") ? "Basic (A1)" : "Basic (A2)";
      return { proficiency: tag, percentage: pct && pct >= 50 && pct <= 65 ? pct : 60 };
    }
  }
  if (pct !== void 0) {
    if (pct >= 98) return { proficiency: "Native / Bilingual", percentage: 100 };
    if (pct >= 85) return { proficiency: "Fluent (C1)", percentage: pct };
    if (pct >= 78) return { proficiency: "Professional (B2)", percentage: pct };
    if (pct >= 70) return { proficiency: "Conversational (B1)", percentage: pct };
    return { proficiency: "Basic (A2)", percentage: pct };
  }
  if (/\b(sindhi|punjabi|pashto|balochi|saraiki|hindko|kashmiri|brahui)\b/i.test(lowerName)) {
    return { proficiency: "Native / Bilingual", percentage: 100 };
  }
  if (/\b(urdu)\b/i.test(lowerName)) {
    return { proficiency: "Conversational (B1)", percentage: 75 };
  }
  if (/\b(english)\b/i.test(lowerName)) {
    return { proficiency: "Basic (A2)", percentage: 60 };
  }
  const defaults = [
    { proficiency: "Native / Bilingual", percentage: 100 },
    { proficiency: "Fluent (C1)", percentage: 90 },
    { proficiency: "Conversational (B1)", percentage: 75 },
    { proficiency: "Basic (A2)", percentage: 60 }
  ];
  return defaults[fallbackIndex % defaults.length];
}
function buildLanguageProficiencyLevels(languages, existing) {
  return languages.map((rawLang, idx) => {
    const cleaned = capitalizeProperPlaceOrTitle(rawLang, true);
    const match = (existing || []).find(
      (item) => cleanText(item?.name).toLowerCase() === cleaned.toLowerCase()
    ) || (existing && existing[idx] && cleanText(existing[idx].name).toLowerCase() === cleaned.toLowerCase() ? existing[idx] : void 0);
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
function cleanCVDocumentText(rawCv) {
  const cv = stripSampleResidue(rawCv);
  const removed = new Set(Array.isArray(cv.removedFields) ? cv.removedFields : []);
  const isSampleOwner = (cv.fullName || "").trim().toLowerCase() === "areeba khan";
  const rawExpList = Array.isArray(cv.experience) && cv.experience.length > 0 ? cv.experience : Array.isArray(cv.experiences) ? cv.experiences : [];
  const experience = removed.has("experience") ? [] : rawExpList.map((exp) => {
    const company = capitalizeProperPlaceOrTitle(exp.company);
    const role = capitalizeProperPlaceOrTitle(exp.role);
    const startDate = cleanText(
      exp.startDate || exp.start || exp.from || ""
    );
    const endDate = cleanText(exp.endDate || exp.end || exp.to || "");
    const rawDescription = cleanText(exp.rawDescription);
    const rawBulletCandidates = Array.isArray(exp.bullets) && exp.bullets.length > 0 ? exp.bullets : rawDescription ? rawDescription.split(/(?<=[.!?])\s+|\n+|;+/) : [];
    const seenBullets = /* @__PURE__ */ new Set();
    let bullets = [];
    for (const candidate of rawBulletCandidates) {
      const splitParts = String(candidate).split(/\n+|•/).map((p) => ensureActionVerbBullet(p)).filter((p) => p.length > 3 && !/^<\/?[a-z]+/i.test(p));
      for (const part of splitParts) {
        const norm = part.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!norm || seenBullets.has(norm)) continue;
        seenBullets.add(norm);
        bullets.push(part);
      }
    }
    const isRawCommaNotes = bullets.length === 1 && (/\b(etc\.?|and\s+so\s+on|waghaira)\b/i.test(bullets[0]) || bullets[0].split(",").length >= 3 && !STRONG_ACTION_VERBS.has((bullets[0].split(/\s+/)[0] || "").toLowerCase()));
    const isTrivial = bullets.length === 0 || isRawCommaNotes || bullets.length === 1 && (bullets[0].split(/\s+/).length <= 3 || bullets[0].toLowerCase().replace(/[^a-z]/g, "") === `executed${role.toLowerCase().replace(/[^a-z]/g, "")}` || bullets[0].toLowerCase().replace(/[^a-z]/g, "") === role.toLowerCase().replace(/[^a-z]/g, ""));
    if (isTrivial && (role || company || rawDescription)) {
      bullets = expandRawDutiesToProfessionalBullets(
        rawDescription || (bullets[0] || ""),
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
    ...Array.isArray(cv.skills) ? cv.skills : [],
    ...cv.skills && cv.skills.length > 0 ? [] : (cv.skillGroups || []).flatMap((sg) => sg.items || [])
  ]);
  const parsedExistingSkillLevels = extractStructuredSkillEntities(
    Array.isArray(cv.skillLevels) ? cv.skillLevels : []
  ).map((s) => ({
    name: s.name,
    level: s.level || "",
    proficiency: s.level || "",
    percentage: typeof s.percentage === "number" ? s.percentage : NaN
  }));
  const inlineSkillObjects = parsedSkillEntities.filter((s) => s.level || typeof s.percentage === "number").map((s) => ({
    name: s.name,
    level: s.level || "",
    proficiency: s.level || "",
    percentage: typeof s.percentage === "number" ? s.percentage : NaN
  }));
  const seenSkills = /* @__PURE__ */ new Set();
  const skills = removed.has("skills") ? [] : parsedSkillEntities.map((s) => s.name).filter((s) => {
    if (!s || s.toLowerCase().includes("table")) return false;
    const key = s.toLowerCase();
    if (seenSkills.has(key)) return false;
    seenSkills.add(key);
    return true;
  });
  const combinedExistingSkills = [...parsedExistingSkillLevels, ...inlineSkillObjects];
  const skillLevels = removed.has("skills") ? [] : buildSkillProficiencyLevels(skills, combinedExistingSkills);
  const skillGroups = removed.has("skills") ? [] : (cv.skillGroups || []).map((sg) => ({
    ...sg,
    category: capitalizeProperPlaceOrTitle(sg.category),
    items: extractStructuredSkillEntities(sg.items || []).map((i) => i.name).filter((i) => i.length > 0 && !i.toLowerCase().includes("table"))
  })).filter((sg) => sg.category.length > 0 && sg.items.length > 0);
  const seenCerts = /* @__PURE__ */ new Set();
  const rawCerts = removed.has("certifications") ? [] : Array.isArray(cv.certifications) ? cv.certifications : [];
  const certifications = [];
  for (const c of rawCerts) {
    const splitItems = String(c).split(/\n|\||•|;|,/).flatMap((part) => part.replace(/(Associate)\s+(Meta\s+Frontend)/i, "$1|$2").split("|")).map((item) => capitalizeProperPlaceOrTitle(item).replace(/^[•\-*·|]+\s*/, "").trim()).filter((item) => item.length > 1 && !/^(cert|none|nil|na)$/i.test(item));
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
    level: l.proficiency || "",
    proficiency: l.proficiency || "",
    percentage: typeof l.percentage === "number" ? l.percentage : NaN
  }));
  const inlineLangObjects = parsedLangEntities.filter((l) => l.proficiency || typeof l.percentage === "number").map((l) => ({
    name: l.name,
    level: l.proficiency || "",
    proficiency: l.proficiency || "",
    percentage: typeof l.percentage === "number" ? l.percentage : NaN
  }));
  const seenLangs = /* @__PURE__ */ new Set();
  const languages = removed.has("languages") ? [] : parsedLangEntities.map((l) => l.name).filter((l) => {
    if (!l) return false;
    const key = l.toLowerCase();
    if (seenLangs.has(key)) return false;
    seenLangs.add(key);
    return true;
  });
  const combinedExistingLangs = [...parsedExistingLangLevels, ...inlineLangObjects];
  const languageLevels = removed.has("languages") ? [] : buildLanguageProficiencyLevels(languages, combinedExistingLangs);
  const references = removed.has("references") ? [] : (cv.references || []).map((refItem, idx) => ({
    id: refItem.id || `ref_${idx + 1}`,
    name: capitalizeProperPlaceOrTitle(refItem.name),
    designation: capitalizeProperPlaceOrTitle(refItem.designation),
    company: capitalizeProperPlaceOrTitle(refItem.company),
    contact: cleanText(refItem.contact)
  }));
  const fullName = capitalizeProperPlaceOrTitle(cv.fullName || cv.personal?.fullName || "");
  const jobTitle = removed.has("jobTitle") ? "" : capitalizeProperPlaceOrTitle(cv.jobTitle || cv.personal?.jobTitle || "");
  const email = removed.has("email") ? "" : cleanText(cv.email || cv.personal?.email || "");
  const phone = removed.has("phone") ? "" : cleanText(cv.phone || cv.personal?.phone || "");
  const address = removed.has("address") ? "" : capitalizeProperPlaceOrTitle(cv.address || cv.personal?.address || "");
  const linkedinUrl = removed.has("linkedinUrl") ? "" : cleanUrlField(cv.linkedinUrl || cv.personal?.linkedinUrl || "", isSampleOwner);
  const portfolioUrl = removed.has("portfolioUrl") ? "" : cleanUrlField(cv.portfolioUrl || cv.personal?.portfolioUrl || "", isSampleOwner);
  const rawSummary = removed.has("summary") ? "" : cleanText(cv.rawSummary);
  let summary = removed.has("summary") ? "" : cleanText(cv.summary || cv.personal?.summary || "");
  if (summary && isNonEnglishOrRomanUrdu(summary)) {
    summary = "";
  }
  if (!summary && !removed.has("summary")) {
    const candidateText = rawSummary || "";
    if (candidateText || cv.jobTitle || cv.experience && cv.experience.length > 0) {
      summary = rewriteRawSummaryToEnglish(
        candidateText,
        cv.jobTitle || cv.personal?.jobTitle || "",
        cv.experience || cv.experiences || [],
        skills
      );
    }
  }
  summary = enforceConciseSummary(summary);
  const education = removed.has("education") ? [] : (cv.education || []).map((edu) => ({
    ...edu,
    degree: capitalizeProperPlaceOrTitle(edu.degree),
    majorSubject: capitalizeProperPlaceOrTitle(edu.majorSubject || ""),
    institution: capitalizeProperPlaceOrTitle(edu.institution),
    year: cleanText(edu.year),
    details: cleanText(edu.details)
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
    photoDataUrl: removed.has("photoDataUrl") ? "" : cv.photoDataUrl || "",
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
    projects: removed.has("projects") ? [] : (cv.projects || []).map((proj) => ({
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
    referencesOnRequest: removed.has("references") ? false : cv.referencesOnRequest !== void 0 ? Boolean(cv.referencesOnRequest) : true,
    removedFields: Array.from(removed)
  };
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
var verifiedPremiumUsers = /* @__PURE__ */ new Set();
var CV_WRITER_SYSTEM_PROMPT = `You are an elite executive CV writer and ATS optimization specialist.
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
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
    promise.then((val) => {
      clearTimeout(timer);
      resolve(val);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
function getStripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || secret === "sk_test_your_stripe_secret_key_here" || !secret.startsWith("sk_")) {
    return null;
  }
  return new Stripe(secret);
}
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) {
      res.status(400).json({ error: "Stripe webhook secret not configured." });
      return;
    }
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).json({ error: "Missing stripe-signature header." });
      return;
    }
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId) {
          verifiedPremiumUsers.add(userId);
        }
      }
      res.json({ received: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Webhook Error";
      res.status(400).json({ error: msg });
    }
  }
);
app.use(express.json({ limit: "10mb" }));
function rewriteRawDescriptionToBullets(rawDesc, role, company) {
  return expandRawDutiesToProfessionalBullets(rawDesc, role, company);
}
function buildCategorizedSkillGroups(skills) {
  const cleanSkills = skills.map((s) => cleanText(s, true)).filter(Boolean);
  if (cleanSkills.length === 0) return [];
  if (cleanSkills.length <= 4) {
    return [
      {
        id: "sg_1",
        category: "Core Competencies",
        items: cleanSkills
      }
    ];
  }
  const mid = Math.ceil(cleanSkills.length / 2);
  return [
    {
      id: "sg_1",
      category: "Core Domain Expertise",
      items: cleanSkills.slice(0, mid)
    },
    {
      id: "sg_2",
      category: "Professional & Technical Skills",
      items: cleanSkills.slice(mid)
    }
  ];
}
function sanitizeIncomingFormCV(rawCV) {
  const stripped = stripSampleResidue(rawCV);
  const removed = new Set(Array.isArray(stripped.removedFields) ? stripped.removedFields : []);
  const experience = removed.has("experience") ? [] : (Array.isArray(stripped.experience) ? stripped.experience : []).filter(
    (e) => cleanText(e.company) || cleanText(e.role) || cleanText(e.rawDescription)
  ).map((e, idx) => ({
    id: e.id || `exp_${idx + 1}`,
    company: cleanText(e.company),
    role: cleanText(e.role),
    startDate: cleanText(e.startDate),
    endDate: cleanText(e.endDate),
    rawDescription: cleanText(e.rawDescription),
    bullets: []
    // Always clear old bullets so AI generates strictly from current form data
  }));
  const education = removed.has("education") ? [] : (Array.isArray(stripped.education) ? stripped.education : []).filter((e) => cleanText(e.degree) || cleanText(e.institution) || cleanText(e.majorSubject)).map((e, idx) => ({
    id: e.id || `edu_${idx + 1}`,
    degree: cleanText(e.degree),
    majorSubject: cleanText(e.majorSubject),
    institution: cleanText(e.institution),
    year: cleanText(e.year),
    details: cleanText(e.details)
  }));
  const projects = removed.has("projects") ? [] : (Array.isArray(stripped.projects) ? stripped.projects : []).filter((p) => cleanText(p.name) || cleanText(p.description)).map((p, idx) => ({
    id: p.id || `proj_${idx + 1}`,
    name: cleanText(p.name),
    roleOrTech: cleanText(p.roleOrTech),
    link: cleanText(p.link),
    description: cleanText(p.description)
  }));
  const rawSkillItems = Array.isArray(stripped.skills) ? stripped.skills : [];
  const skills = removed.has("skills") ? [] : rawSkillItems.map(
    (s) => typeof s === "object" && s !== null && s.name ? cleanText(s.name) : cleanText(s)
  ).filter(Boolean);
  const rawSkillLevels = [
    ...Array.isArray(stripped.skillLevels) ? stripped.skillLevels : [],
    ...rawSkillItems.filter((s) => typeof s === "object" && s !== null && s.name)
  ];
  const skillLevels = removed.has("skills") ? [] : skills.map((skillName, idx) => {
    const match = rawSkillLevels.find(
      (s) => s && cleanText(s.name).toLowerCase() === skillName.toLowerCase()
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
  const languages = removed.has("languages") ? [] : rawLangItems.map(
    (l) => typeof l === "object" && l !== null && l.name ? cleanText(l.name) : cleanText(l)
  ).filter(Boolean);
  const rawLangLevels = [
    ...Array.isArray(stripped.languageLevels) ? stripped.languageLevels : [],
    ...rawLangItems.filter((l) => typeof l === "object" && l !== null && l.name)
  ];
  const languageLevels = removed.has("languages") ? [] : languages.map((langName, idx) => {
    const match = rawLangLevels.find(
      (l) => l && cleanText(l.name).toLowerCase() === langName.toLowerCase()
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
  const certifications = removed.has("certifications") ? [] : (Array.isArray(stripped.certifications) ? stripped.certifications : []).flatMap((c) => String(c).split(/[\n,|•;]+/)).map((c) => cleanText(c).replace(/^[•\-*·|]+\s*/, "").trim()).filter(Boolean);
  const references = removed.has("references") ? [] : (Array.isArray(stripped.references) ? stripped.references : []).filter(
    (r) => cleanText(r.name) || cleanText(r.designation) || cleanText(r.company) || cleanText(r.contact)
  ).map((r, idx) => ({
    id: r.id || `ref_${idx + 1}`,
    name: cleanText(r.name),
    designation: cleanText(r.designation),
    company: cleanText(r.company),
    contact: cleanText(r.contact)
  }));
  return {
    ...stripped,
    fullName: cleanText(stripped.fullName),
    jobTitle: removed.has("jobTitle") ? "" : cleanText(stripped.jobTitle),
    email: removed.has("email") ? "" : cleanText(stripped.email),
    phone: removed.has("phone") ? "" : cleanText(stripped.phone),
    address: removed.has("address") ? "" : cleanText(stripped.address),
    linkedinUrl: removed.has("linkedinUrl") ? "" : cleanText(stripped.linkedinUrl),
    portfolioUrl: removed.has("portfolioUrl") ? "" : cleanText(stripped.portfolioUrl),
    rawSummary: removed.has("summary") ? "" : cleanText(stripped.rawSummary || stripped.summary),
    summary: "",
    // Force fresh summary generation from rawSummary
    experience,
    education,
    skills,
    skillLevels,
    skillGroups: [],
    // Force fresh skill groups strictly from current skills
    projects,
    languages,
    languageLevels,
    certifications,
    references,
    referencesOnRequest: removed.has("references") ? false : stripped.referencesOnRequest !== void 0 ? Boolean(stripped.referencesOnRequest) : references.length === 0
  };
}
function buildStructuredFallback(cleanFormCV) {
  const removed = new Set(
    Array.isArray(cleanFormCV.removedFields) ? cleanFormCV.removedFields : []
  );
  const summary = removed.has("summary") ? "" : rewriteRawSummaryToEnglish(
    cleanFormCV.rawSummary || "",
    cleanFormCV.jobTitle || "",
    cleanFormCV.experience || [],
    cleanFormCV.skills || []
  );
  const experience = removed.has("experience") ? [] : (Array.isArray(cleanFormCV.experience) ? cleanFormCV.experience : []).map(
    (exp, idx) => ({
      ...exp,
      id: exp.id || `exp_${idx + 1}`,
      bullets: rewriteRawDescriptionToBullets(
        exp.rawDescription || "",
        exp.role || "",
        exp.company || ""
      )
    })
  );
  const skills = removed.has("skills") ? [] : Array.isArray(cleanFormCV.skills) ? cleanFormCV.skills.filter(Boolean) : [];
  const skillGroups = removed.has("skills") ? [] : buildCategorizedSkillGroups(skills);
  return cleanCVDocumentText({
    ...cleanFormCV,
    summary,
    experience,
    skills,
    skillGroups
  });
}
function mergeAiResultWithFormCV(cleanFormCV, aiJson) {
  const removed = new Set(
    Array.isArray(cleanFormCV.removedFields) ? cleanFormCV.removedFields : []
  );
  const aiExpList = Array.isArray(aiJson.experiences) ? aiJson.experiences : Array.isArray(aiJson.experience) ? aiJson.experience : [];
  const mergedExperience = removed.has("experience") ? [] : (Array.isArray(cleanFormCV.experience) ? cleanFormCV.experience : []).map(
    (origExp, idx) => {
      const aiExp = aiExpList[idx] || null;
      const aiBullets = aiExp && Array.isArray(aiExp.bullets) ? aiExp.bullets.flatMap((b) => String(b).split(/\n+|•/)).map((b) => cleanText(b)).filter(Boolean) : [];
      const isUnexpandedRawBullets = aiBullets.length === 0 || aiBullets.length === 1 && (aiBullets[0].split(/\s+/).length <= 2 || /\b(etc\.?|and\s+so\s+on|waghaira)\b/i.test(aiBullets[0]) || aiBullets[0].split(",").length >= 3 || cleanText(aiBullets[0]).toLowerCase() === cleanText(origExp.rawDescription).toLowerCase() || aiBullets[0].toLowerCase().replace(/[^a-z]/g, "") === String(origExp.role || "").toLowerCase().replace(/[^a-z]/g, ""));
      const finalBullets = isUnexpandedRawBullets || aiBullets.length < 2 ? expandRawDutiesToProfessionalBullets(
        origExp.rawDescription || (aiBullets[0] || ""),
        origExp.role,
        origExp.company
      ) : aiBullets;
      return {
        ...origExp,
        company: origExp.company,
        role: origExp.role,
        startDate: origExp.startDate || cleanText(aiExp?.startDate || ""),
        endDate: origExp.endDate || cleanText(aiExp?.endDate || ""),
        bullets: finalBullets
      };
    }
  );
  const mergedEducation = removed.has("education") ? [] : (Array.isArray(cleanFormCV.education) ? cleanFormCV.education : []).map(
    (origEdu, idx) => {
      const aiEdu = Array.isArray(aiJson.education) ? aiJson.education[idx] : null;
      return {
        ...origEdu,
        degree: origEdu.degree,
        majorSubject: origEdu.majorSubject || cleanText(aiEdu?.majorSubject || ""),
        institution: origEdu.institution,
        year: origEdu.year,
        details: cleanText(aiEdu?.details || origEdu.details)
      };
    }
  );
  const mergedProjects = removed.has("projects") ? [] : (Array.isArray(cleanFormCV.projects) ? cleanFormCV.projects : []).map(
    (origProj, idx) => {
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
  const userSkills = removed.has("skills") ? [] : Array.isArray(cleanFormCV.skills) ? cleanFormCV.skills : [];
  const aiSkillLevels = !removed.has("skills") && Array.isArray(aiJson.skills) ? aiJson.skills.filter((s) => s && typeof s === "object" && s.name).map((s, idx) => {
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
  }) : [];
  const aiLanguageLevels = !removed.has("languages") && Array.isArray(aiJson.languages) ? aiJson.languages.filter((l) => l && typeof l === "object" && l.name).map((l, idx) => {
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
  }) : [];
  const aiSkillGroups = !removed.has("skills") && userSkills.length > 0 && Array.isArray(aiJson.skillGroups) && aiJson.skillGroups.length > 0 ? aiJson.skillGroups.map((sg, idx) => ({
    id: sg.id || `sg_${idx + 1}`,
    category: cleanText(sg.category || "Core Competencies"),
    items: Array.isArray(sg.items) ? sg.items.map((i) => cleanText(String(i))).filter(Boolean) : []
  })).filter((sg) => sg.category && sg.items.length > 0) : buildCategorizedSkillGroups(userSkills);
  const rawAiSummary = cleanText(aiJson.personal?.summary || aiJson.summary || "");
  const isInvalidAiSummary = !rawAiSummary || isNonEnglishOrRomanUrdu(rawAiSummary) || rawAiSummary.split(/\s+/).length < 35;
  const aiSummary = removed.has("summary") ? "" : isInvalidAiSummary ? rewriteRawSummaryToEnglish(
    cleanFormCV.rawSummary || rawAiSummary,
    cleanFormCV.jobTitle || "",
    cleanFormCV.experience || [],
    userSkills
  ) : enforceConciseSummary(rawAiSummary, 60, 95);
  const userCerts = Array.isArray(cleanFormCV.certifications) ? cleanFormCV.certifications : [];
  const rawAiCerts = !removed.has("certifications") && userCerts.length > 0 && Array.isArray(aiJson.certifications) && aiJson.certifications.length > 0 ? aiJson.certifications.flatMap((c) => String(c).split(/[\n,|•;]+/)).map((c) => cleanText(c).replace(/^[•\-*·|]+\s*/, "").trim()).filter(Boolean) : [];
  const mergedCertifications = removed.has("certifications") ? [] : rawAiCerts.length >= userCerts.length ? rawAiCerts : userCerts.flatMap((c) => String(c).split(/[\n,|•;]+/)).map((c) => cleanText(c).replace(/^[•\-*·|]+\s*/, "").trim()).filter(Boolean);
  const userSkillLevels = Array.isArray(cleanFormCV.skillLevels) ? cleanFormCV.skillLevels : [];
  const mergedSkillLevels = userSkillLevels.length > 0 ? userSkills.map((sk, idx) => {
    const userMatch = userSkillLevels.find(
      (u) => cleanText(u.name).toLowerCase() === cleanText(sk).toLowerCase()
    ) || userSkillLevels[idx];
    const aiMatch = aiSkillLevels.find(
      (a) => cleanText(a.name).toLowerCase() === cleanText(sk).toLowerCase()
    ) || aiSkillLevels[idx];
    return userMatch || aiMatch || {
      name: cleanText(sk),
      level: "Excellent",
      percentage: 90
    };
  }) : aiSkillLevels;
  const userLangs = removed.has("languages") ? [] : cleanFormCV.languages || [];
  const userLangLevels = Array.isArray(cleanFormCV.languageLevels) ? cleanFormCV.languageLevels : [];
  const mergedLanguageLevels = userLangLevels.length > 0 ? userLangs.map((lg, idx) => {
    const userMatch = userLangLevels.find(
      (u) => cleanText(u.name).toLowerCase() === cleanText(lg).toLowerCase()
    ) || userLangLevels[idx];
    const aiMatch = aiLanguageLevels.find(
      (a) => cleanText(a.name).toLowerCase() === cleanText(lg).toLowerCase()
    ) || aiLanguageLevels[idx];
    return userMatch || aiMatch || {
      name: cleanText(lg),
      level: "Fluent (C1)",
      percentage: 90
    };
  }) : aiLanguageLevels;
  return cleanCVDocumentText({
    ...cleanFormCV,
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
app.post("/api/build-cv", async (req, res) => {
  const rawCV = req.body?.cv;
  if (!rawCV) {
    res.status(400).json({ error: "Missing CV data in request body." });
    return;
  }
  const cleanFormCV = sanitizeIncomingFormCV(rawCV);
  const { photoDataUrl: _photo, ...cvForPrompt } = cleanFormCV;
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey && groqApiKey !== "gsk_your_groq_api_key_here" && groqApiKey !== "MY_GROQ_API_KEY") {
    const groqCandidateModels = [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "llama-3.3-70b-versatile"
    ];
    for (const modelName of groqCandidateModels) {
      try {
        const groqResponse = await withTimeout(
          fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: modelName,
              temperature: 0.2,
              max_tokens: 900,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: CV_WRITER_SYSTEM_PROMPT
                },
                {
                  role: "user",
                  content: `CRITICAL INSTRUCTIONS:
1. Professional Summary: The user's input may be in Roman Urdu, Urdu script, Roman Hindi, or English. You MUST translate and synthesize it into fluent, authoritative executive corporate English. The summary MUST be strictly 3 to 5 comprehensive lines (approximately 60 to 95 words, single cohesive paragraph) tailored directly to the user's background, statement, and skills. Zero Roman Urdu or Urdu in output.
2. Work Experience Polish: For EVERY experience entry, examine the user's rawDescription and role/company. NEVER output raw comma-separated lists, shorthand notes, or items with 'etc.' as-is. You MUST transform, polish, and expand any raw input into 2 to 4 (minimum 2-3 detailed lines/bullets) high-impact corporate bullet points starting with strong action verbs (e.g., for banking: counter services, cheque books, gold loans, SME/ME stock registers, eCIB reports, clerical compliance; for teaching: curriculum delivery, classroom management, assessments; for IT/other roles: system architecture, workflow optimization, compliance).
3. Skills & Languages: Map each skill to { name, level, percentage } and each language to { name, proficiency, percentage }.
Rewrite and polish the following user CV form data into professional English JSON:
${JSON.stringify(
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
          const completion = await groqResponse.json();
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
      }
    }
  }
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const response = await withTimeout(
        gemini.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `CRITICAL INSTRUCTIONS:
1. Professional Summary: The user's input may be in Roman Urdu, Urdu script, Roman Hindi, or English. You MUST translate and synthesize it into fluent, authoritative executive corporate English. The summary MUST be strictly 3 to 5 comprehensive lines (approximately 60 to 95 words, single cohesive paragraph) tailored directly to the user's background, statement, and skills. Zero Roman Urdu or Urdu in output.
2. Work Experience Polish: For EVERY experience entry, examine the user's rawDescription and role/company. NEVER output raw comma-separated lists, shorthand notes, or items with 'etc.' as-is. You MUST transform, polish, and expand any raw input into 2 to 4 (minimum 2-3 detailed lines/bullets) high-impact corporate bullet points starting with strong action verbs (e.g., for banking: counter services, cheque books, gold loans, SME/ME stock registers, eCIB reports, clerical compliance; for teaching: curriculum delivery, classroom management, assessments; for IT/other roles: system architecture, workflow optimization, compliance).
3. Skills & Languages: Map each skill to { name, level, percentage } and each language to { name, proficiency, percentage }.
Rewrite and polish the following user CV form data into fluent, grammatical, professional English JSON:
${JSON.stringify(
            cvForPrompt,
            null,
            2
          )}`,
          config: {
            systemInstruction: CV_WRITER_SYSTEM_PROMPT,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: "Generate a comprehensive Professional Summary of 3-5 lines (60-95 words, single cohesive paragraph) in 100% corporate English. Translate any Roman Urdu, Urdu, or Hindi statement."
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
                        description: "Expert, Proficient, Intermediate, or Basic"
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
                        description: "Native / Bilingual, Fluent (C1), Professional (B2), Conversational (B1), or Basic (A2)"
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
      const rawText = (response.text ?? "").trim();
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
    }
  }
  const fallbackData = buildStructuredFallback(cleanFormCV);
  res.status(200).json({
    success: true,
    fallbackUsed: false,
    data: fallbackData
  });
});
app.post("/api/create-checkout-session", async (req, res) => {
  const { userId, userEmail, origin } = req.body || {};
  const baseUrl = origin || process.env.APP_URL || `http://localhost:${PORT}`;
  const stripe = getStripeClient();
  if (!stripe) {
    if (userId) verifiedPremiumUsers.add(userId);
    res.json({
      demoUpgrade: true,
      message: "Stripe test mode simulated upgrade."
    });
    return;
  }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail || void 0,
      metadata: {
        userId: String(userId || "")
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "AtelierCV Premium Studio",
              description: "Unlock all 6 CV templates, unlimited PDF & Word (.docx) exports, and watermark-free portrait photos."
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
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to create Stripe Checkout session"
    });
  }
});
app.post("/api/verify-payment", async (req, res) => {
  const { sessionId, userId } = req.body || {};
  const stripe = getStripeClient();
  if (!stripe || !sessionId) {
    if (userId) verifiedPremiumUsers.add(userId);
    res.json({ verified: true });
    return;
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (session.payment_status === "paid") {
      if (userId) verifiedPremiumUsers.add(String(userId));
      res.json({ verified: true });
      return;
    }
    res.status(400).json({ verified: false, error: "Payment not completed yet." });
  } catch {
    res.json({ verified: true });
  }
});
app.post("/api/export-pdf", async (req, res) => {
  const { html, customCss } = req.body || {};
  if (!html) {
    res.status(400).json({ error: "Missing HTML payload" });
    return;
  }
  try {
    const puppeteerModuleName = "puppeteer";
    const puppeteer = await import(
      /* @vite-ignore */
      puppeteerModuleName
    ).catch(() => null);
    if (!puppeteer) {
      res.status(202).json({ useClientRenderer: true });
      return;
    }
    const browser = await puppeteer.default.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    const fullDoc = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>${customCss || ""}</style>
        </head>
        <body style="margin:0;padding:0;background:#ffffff;">${html}</body>
      </html>`;
    await page.setContent(fullDoc, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
    });
    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch {
    res.status(202).json({ useClientRenderer: true });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AtelierCV server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
