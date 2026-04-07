const knownSkillVocabulary = [
  "react",
  "next.js",
  "nextjs",
  "node.js",
  "nodejs",
  "typescript",
  "javascript",
  "html",
  "css",
  "tailwind",
  "bootstrap",
  "angular",
  "figma",
  "mongodb",
  "postgresql",
  "sql",
  "supabase",
  "prisma",
  "express",
  "rest api",
  "graphql",
  "customer service",
  "customer support",
  "call center",
  "bpo",
  "crm",
  "salesforce",
  "zendesk",
  "hubspot",
  "excel",
  "google sheets",
  "boolean search",
  "linkedin",
  "recruiting",
  "recruitment",
  "talent acquisition",
  "sourcing",
  "screening",
  "interviewing",
  "mass hiring",
  "communication",
  "negotiation",
  "presentation",
  "reporting",
  "sem",
  "seo",
  "ui",
  "ux"
];

const monthMap: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

const sectionAliases: Record<string, string[]> = {
  summary: ["summary", "professional summary", "profile", "about me", "objective"],
  experience: ["experience", "work experience", "employment history", "professional experience", "work history"],
  education: ["education", "academic background", "qualifications"],
  skills: ["skills", "technical skills", "core skills", "competencies", "expertise"],
  certifications: ["certifications", "licenses"],
  projects: ["projects", "project experience"]
};

type SectionKey = "summary" | "experience" | "education" | "skills" | "certifications" | "projects";
type ResumeSections = Partial<Record<SectionKey, string[]>>;
type Interval = { start: Date; end: Date };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeWhitespace(value: string) {
  return value.replace(/[\t\u00A0]+/g, " ").replace(/\r/g, "").trim();
}

function cleanLine(value: string) {
  return normalizeWhitespace(value.replace(/[|\u2022\u00B7]/g, " ").replace(/\s{2,}/g, " "));
}

function lineLooksLikeHeading(value: string) {
  const normalized = value.toLowerCase().replace(/[:\-]+$/g, "").trim();
  return Object.values(sectionAliases).some((aliases) => aliases.includes(normalized));
}

function extractSections(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const sections: ResumeSections = {};
  let current: SectionKey | null = null;

  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[:\-]+$/g, "").trim();
    const foundSection = Object.entries(sectionAliases).find(([, aliases]) => aliases.includes(normalized));

    if (foundSection) {
      current = foundSection[0] as SectionKey;
      sections[current] = sections[current] ?? [];
      continue;
    }

    if (current) {
      sections[current] = [...(sections[current] ?? []), line];
    }
  }

  return { lines, sections };
}

function joinSection(sections: ResumeSections, key: SectionKey, limit = 1800) {
  return (sections[key] ?? []).join("\n").trim().slice(0, limit);
}

function extractName(lines: string[]) {
  const fallback = { firstName: "Candidate", lastName: "Profile" };
  const nameLine = lines.find((line) => {
    if (lineLooksLikeHeading(line)) return false;
    if (/@/.test(line) || /linkedin|github|http|www\./i.test(line)) return false;
    if (/\d{3,}/.test(line)) return false;
    const words = line.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 4 && /^[A-Za-z][A-Za-z'`.-]*(?:\s+[A-Za-z][A-Za-z'`.-]*)+$/.test(line);
  });

  if (!nameLine) return fallback;

  const parts = nameLine.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || fallback.firstName,
    lastName: parts.slice(1).join(" ") || fallback.lastName
  };
}

function extractContact(text: string) {
  return {
    email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "",
    phone: text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || "",
    linkedInUrl: text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] || text.match(/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] || ""
  };
}

function normalizeSkillToken(value: string) {
  return value
    .replace(/^[-\u2022*]+/, "")
    .replace(/[()]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractSkillsFromSection(skillsSection: string[]) {
  const tokens = skillsSection
    .flatMap((line) => line.split(/[;,/|]|\s{2,}/))
    .map(normalizeSkillToken)
    .filter((token) => token.length >= 2 && token.length <= 40);

  return tokens.map((token) => titleCase(token));
}

function extractSkillKeywords(text: string) {
  const normalized = text.toLowerCase();
  return knownSkillVocabulary
    .filter((skill) => new RegExp(`(^|[^a-z])${escapeRegExp(skill.toLowerCase())}([^a-z]|$)`, "i").test(normalized))
    .map((skill) => titleCase(skill.replace("nextjs", "next.js").replace("nodejs", "node.js")));
}

function uniqueSkills(values: string[]) {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    results.push(value.replace(/Next Js/i, "Next.js").replace(/Node Js/i, "Node.js"));
  }

  return results.slice(0, 24);
}

function inferEducation(lines: string[]) {
  const educationKeywords = /(bachelor|master|mba|phd|degree|diploma|faculty|university|college|institute|school)/i;
  return lines.filter((line) => educationKeywords.test(line));
}

function parseMonthYear(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (/present|current|now/i.test(trimmed)) {
    return new Date();
  }

  const slashMatch = trimmed.match(/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return new Date(Number(slashMatch[2]), Number(slashMatch[1]) - 1, 1);
  }

  const monthYearMatch = trimmed.match(/([A-Za-z]{3,9})\s+(\d{4})/);
  if (monthYearMatch) {
    const month = monthMap[monthYearMatch[1].toLowerCase()];
    if (month !== undefined) {
      return new Date(Number(monthYearMatch[2]), month, 1);
    }
  }

  const yearMatch = trimmed.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return new Date(Number(yearMatch[0]), 0, 1);
  }

  return null;
}

function extractExperienceIntervals(text: string) {
  const intervals: Interval[] = [];
  const pattern = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*(?:-|\u2013|\u2014|to)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current|now)/gi;

  for (const match of text.matchAll(pattern)) {
    const start = parseMonthYear(match[1]);
    const end = parseMonthYear(match[2]);
    if (!start || !end || end < start) continue;
    intervals.push({ start, end });
  }

  return intervals;
}

function mergeIntervals(intervals: Interval[]) {
  const sorted = [...intervals].sort((left, right) => left.start.getTime() - right.start.getTime());
  const merged: Interval[] = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start.getTime() > previous.end.getTime()) {
      merged.push({ ...interval });
      continue;
    }

    if (interval.end.getTime() > previous.end.getTime()) {
      previous.end = interval.end;
    }
  }

  return merged;
}

function calculateYearsExperience(text: string) {
  const intervals = mergeIntervals(extractExperienceIntervals(text));
  if (intervals.length) {
    const totalMonths = intervals.reduce((sum, interval) => {
      const startMonth = interval.start.getFullYear() * 12 + interval.start.getMonth();
      const endMonth = interval.end.getFullYear() * 12 + interval.end.getMonth();
      return sum + Math.max(0, endMonth - startMonth + 1);
    }, 0);

    return Math.max(0, Math.round(totalMonths / 12));
  }

  const explicit = text.match(/(\d{1,2})\+?\s+years?/i);
  return explicit ? Number(explicit[1]) : undefined;
}

export function parseResumeText(text: string) {
  const normalizedText = normalizeWhitespace(text);
  const { lines, sections } = extractSections(text);
  const name = extractName(lines);
  const contact = extractContact(text);

  const experienceSummary = joinSection(sections, "experience") || lines.filter((line) => /\b(19|20)\d{2}\b/.test(line)).slice(0, 12).join("\n").slice(0, 1800);
  const educationLines = sections.education?.length ? sections.education : inferEducation(lines);
  const educationSummary = educationLines.join("\n").trim().slice(0, 1800);
  const skills = uniqueSkills([
    ...extractSkillsFromSection(sections.skills ?? []),
    ...extractSkillKeywords(normalizedText)
  ]);
  const yearsExperience = calculateYearsExperience(experienceSummary || normalizedText);

  return {
    firstName: name.firstName,
    lastName: name.lastName,
    email: contact.email,
    phone: contact.phone,
    linkedInUrl: contact.linkedInUrl,
    skills,
    yearsExperience,
    experienceSummary,
    educationSummary,
    parsedProfile: {
      sourceTextPreview: normalizedText.slice(0, 2000),
      detectedSections: {
        experience: Boolean(experienceSummary),
        education: Boolean(educationSummary),
        skills: skills.length > 0
      },
      inferredExperienceYears: yearsExperience ?? null,
      extractedSkillCount: skills.length
    }
  };
}
