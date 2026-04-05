function extractSkills(text: string) {
  const knownSkills = [
    "recruiting",
    "sourcing",
    "salesforce",
    "excel",
    "english",
    "crm",
    "customer support",
    "interviewing",
    "screening",
    "linkedin",
    "boolean search",
    "google sheets",
    "zendesk"
  ];

  const normalized = text.toLowerCase();
  return knownSkills.filter((skill) => normalized.includes(skill)).map((skill) =>
    skill
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function parseYearsExperience(text: string) {
  const match = text.match(/(\d+)\+?\s+years?/i);
  return match ? Number(match[1]) : undefined;
}

function extractSection(text: string, heading: string, nextHeadings: string[]) {
  const pattern = new RegExp(`${heading}[\s\S]*?\n([\s\S]*?)(?:\n(?:${nextHeadings.join("|")})\b|$)`, "i");
  const match = text.match(pattern);
  return match?.[1]?.trim() || "";
}

export function parseResumeText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const nameLine = lines[0] || "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0] || "";
  const linkedInUrl = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] || "";
  const skills = extractSkills(text);
  const yearsExperience = parseYearsExperience(text);
  const experienceSummary = extractSection(text, "experience", ["education", "skills", "projects", "certifications"]).slice(0, 1800);
  const educationSummary = extractSection(text, "education", ["experience", "skills", "projects", "certifications"]).slice(0, 1800);

  const nameParts = nameLine.split(" ").filter(Boolean);

  return {
    firstName: nameParts[0] || "Candidate",
    lastName: nameParts.slice(1).join(" ") || "Profile",
    email,
    phone,
    linkedInUrl,
    skills,
    yearsExperience,
    experienceSummary,
    educationSummary,
    parsedProfile: {
      sourceTextPreview: text.slice(0, 2000),
      detectedSections: {
        experience: Boolean(experienceSummary),
        education: Boolean(educationSummary),
        skills: skills.length > 0
      }
    }
  };
}