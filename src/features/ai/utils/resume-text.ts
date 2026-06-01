import type { ResumeData } from "../prompts/resume.prompts";

export function resumeToPlainText(resume: Partial<ResumeData>): string {
  const lines: string[] = [];

  if (resume.name) lines.push(`Name: ${resume.name}`);
  if (resume.title) lines.push(`Title: ${resume.title}`);
  if (resume.email) lines.push(`Email: ${resume.email}`);
  if (resume.phone) lines.push(`Phone: ${resume.phone}`);
  if (resume.location) lines.push(`Location: ${resume.location}`);

  lines.push("");

  if (resume.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(resume.summary);
    lines.push("");
  }

  if (resume.skills && resume.skills.length > 0) {
    lines.push("TECHNICAL SKILLS");
    lines.push(resume.skills.join(", "));
    lines.push("");
  }

  if (resume.experience && resume.experience.length > 0) {
    lines.push("PROFESSIONAL EXPERIENCE");
    lines.push("");
    for (const exp of resume.experience) {
      lines.push(`${exp.role} at ${exp.company} | ${exp.duration}`);
      for (const bullet of exp.bullets) {
        lines.push(`  • ${bullet}`);
      }
      lines.push("");
    }
  }

  if (resume.education && resume.education.length > 0) {
    lines.push("EDUCATION");
    lines.push("");
    for (const edu of resume.education) {
      lines.push(`${edu.degree} - ${edu.school} (${edu.year})`);
    }
    lines.push("");
  }

  if (resume.projects && resume.projects.length > 0) {
    lines.push("PROJECTS");
    for (const proj of resume.projects) {
      lines.push(`${proj.name}: ${proj.description}`);
      if (proj.tech?.length) lines.push(`  Tech: ${proj.tech.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function parsePlainTextToResume(text: string, fallback: Partial<ResumeData>): Partial<ResumeData> {
  const result: Partial<ResumeData> = { ...fallback };
  const sections = text.split(/\n(?=[A-Z ]{4,}\n)/);

  for (const section of sections) {
    const lines = section.split("\n").map((l) => l.trim());

    if (section.startsWith("PROFESSIONAL SUMMARY")) {
      const body = lines.slice(1).filter(Boolean).join("\n");
      if (body) result.summary = body;
    } else if (section.startsWith("TECHNICAL SKILLS")) {
      const body = lines.slice(1).filter(Boolean).join(" ");
      const skills = body.split(/[,;•]\s*/).map((s) => s.replace(/^label:\s*/i, "").trim()).filter(Boolean);
      if (skills.length > 0) result.skills = skills;
    } else if (section.startsWith("PROFESSIONAL EXPERIENCE")) {
      const expLines = section.split("\n");
      const entries: ResumeData["experience"] = [];
      let current: any = null;

      for (const line of expLines) {
        const t = line.trim();
        if (!t || t === "PROFESSIONAL EXPERIENCE") continue;

        const headerMatch = t.match(/^(.+?)\s+at\s+(.+?)\s*\|\s*(.+)/);
        if (headerMatch) {
          if (current) entries.push(current);
          current = { role: headerMatch[1].trim(), company: headerMatch[2].trim(), duration: headerMatch[3].trim(), bullets: [] };
        } else if (current && t.startsWith("•")) {
          current.bullets.push(t.replace(/^•\s*/, ""));
        }
      }
      if (current) entries.push(current);
      if (entries.length > 0) result.experience = entries;
    } else if (section.startsWith("EDUCATION")) {
      const body = lines.slice(1).filter(Boolean);
      const eduEntries: ResumeData["education"] = [];
      for (const line of body) {
        const m = line.match(/^(.+?)\s*-\s*(.+?)\s*\((.+?)\)\s*$/);
        if (m) eduEntries.push({ degree: m[1].trim(), school: m[2].trim(), year: m[3].trim() });
      }
      if (eduEntries.length > 0) result.education = eduEntries;
    }
  }

  // Update header fields from first few lines
  const headerLines = text.split("\n").slice(0, 8);
  for (const line of headerLines) {
    if (line.startsWith("Title:")) result.title = line.replace("Title:", "").trim();
    else if (line.startsWith("Name:")) result.name = line.replace("Name:", "").trim();
    else if (line.startsWith("Email:")) result.email = line.replace("Email:", "").trim();
  }

  return result;
}
