export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    tech: string[];
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function formatResumePreview(data: ResumeData): string {
  const sections: string[] = [];
  sections.push(`**${data.name || 'Your Name'}**`);
  sections.push(`${data.title || 'Your Title'}`);
  if (data.email || data.phone || data.location) {
    sections.push([data.email, data.phone, data.location].filter(Boolean).join(' | '));
  }
  sections.push('');
  if (data.summary) {
    sections.push(`*${data.summary}*`);
    sections.push('');
  }
  if (data.skills?.length) {
    sections.push(`**Skills:** ${data.skills.join(', ')}`);
    sections.push('');
  }
  if (data.experience?.length) {
    sections.push('**Experience:**');
    data.experience.forEach((exp) => {
      sections.push(`  • ${exp.role} @ ${exp.company} (${exp.duration})`);
      exp.bullets?.forEach((b) => sections.push(`    - ${b}`));
    });
    sections.push('');
  }
  if (data.education?.length) {
    sections.push('**Education:**');
    data.education.forEach((edu) => {
      sections.push(`  • ${edu.degree} — ${edu.school} (${edu.year})`);
    });
    sections.push('');
  }
  if (data.projects?.length) {
    sections.push('**Projects:**');
    data.projects.forEach((p) => {
      sections.push(`  • ${p.name}: ${p.description} [${p.tech?.join(', ')}]`);
    });
  }
  return sections.join('\n');
}
