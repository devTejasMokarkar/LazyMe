const EXTRACT_PATTERNS: Record<string, RegExp> = {
  title_match: /PROFESSIONAL SUMMARY[\s\S]{0,400}/i,
  summary: /PROFESSIONAL SUMMARY[\s\S]*?(?=\n[A-Z ]{4,}\n|\n[A-Z]{3,}|$)/i,
  experience_keywords: /PROFESSIONAL EXPERIENCE[\s\S]*?(?=\nEDUCATION|\nPROJECTS|\n[A-Z]{3,}|$)/i,
  skills_keywords: /TECHNICAL SKILLS[\s\S]*?(?=\nPROFESSIONAL EXPERIENCE|\nPROFESSIONAL|\nEXPERIENCE|\n[A-Z]{3,}|$)/i,
};

export function extractWeakSections(resumeText: string, weakSections: string[]): string {
  const sectionNames = weakSections.filter((s) => EXTRACT_PATTERNS[s]);
  if (sectionNames.length === 0) return "";

  return sectionNames
    .map((s) => {
      const match = resumeText.match(EXTRACT_PATTERNS[s]);
      return match ? `[SECTION: ${s}]\n${match[0].trim()}` : "";
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

export function extractSectionBodyBefore(
  resumeText: string,
  weakSections: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const s of weakSections) {
    const pattern = EXTRACT_PATTERNS[s];
    if (!pattern) continue;
    const match = resumeText.match(pattern);
    if (match) {
      result[s] = match[0].trim();
    }
  }
  return result;
}

const MERGE_PATTERNS: Record<string, RegExp> = {
  summary: /(PROFESSIONAL SUMMARY\s*\n)([\s\S]*?)(\n\s*\n[A-Z]|$)/i,
  experience_keywords: /(PROFESSIONAL EXPERIENCE\s*\n)([\s\S]*?)(\n\s*\n[A-Z]|$)/i,
  skills_keywords: /(TECHNICAL SKILLS\s*\n)([\s\S]*?)(\n\s*\n[A-Z]|$)/i,
};

export function mergeImprovedSections(
  originalResumeText: string,
  improvedText: string
): string {
  let result = originalResumeText;
  const sectionRegex = /\[SECTION:\s*(\w+)\]([\s\S]*?)(?=\[SECTION:|\s*$)/g;
  let match;

  while ((match = sectionRegex.exec(improvedText)) !== null) {
    const sectionName = match[1].trim();
    const newContent = match[2].trim();
    const pattern = MERGE_PATTERNS[sectionName];

    if (pattern && newContent) {
      result = result.replace(pattern, `$1${newContent}$3`);
    }
  }

  return result;
}
