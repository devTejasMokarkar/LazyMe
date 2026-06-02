import type { ATSResumeData, ATSExperience, ATSContact, ATSSkill, ATSProject } from './types';

interface AppExperience {
  company: string;
  role: string;
  duration?: string;
  start?: string;
  end?: string;
  bullets: string[];
  sections?: Array<{ title: string; bullets: string[] }>;
  stack?: string;
  location?: string;
}

interface AppEducation {
  school: string;
  degree: string;
  year: string;
}

function parseDuration(startStr: string, endStr?: string): { start: string; end: string; } {
  const parsePartial = (s: string): string => {
    s = s.trim();
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const lower = s.toLowerCase().replace(/\./g, '');
    const monthMatch = lower.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/);
    const yearMatch = s.match(/\b(\d{4})\b/);
    if (monthMatch && yearMatch) return `${yearMatch[1]}-${months[monthMatch[1]]}`;
    if (yearMatch) return yearMatch[1];
    return s;
  };

  return { start: parsePartial(startStr), end: endStr ? parsePartial(endStr) : '' };
}

function parseDurationString(duration: string): { start: string; end: string } {
  const separators = [' – ', ' - ', '–', '—', ' to '];
  for (const sep of separators) {
    if (duration.includes(sep)) {
      const parts = duration.split(sep);
      if (parts.length >= 2) {
        return parseDuration(parts[0].trim(), parts[1].trim());
      }
    }
  }
  return parseDuration(duration);
}

function formatDateRange(start: string, end: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const fmt = (d: string): string => {
    const m = d.match(/^(\d{4})(?:-(\d{2}))?$/);
    if (!m) return d;
    const y = m[1];
    const moIndex = m[2] ? parseInt(m[2], 10) - 1 : -1;
    const mo = moIndex >= 0 && moIndex < 12 ? months[moIndex] : '';
    return mo ? `${mo} ${y}` : y;
  };

  const endDisplay = end.toLowerCase().includes('present') || end === '' ? 'Present' : fmt(end);
  return `${fmt(start)} – ${endDisplay}`;
}

function calcDurationYearsMonths(start: string, end: string): string {
  const s = parseDate(start);
  const now = new Date();
  const isPresent = !end || end.toLowerCase().includes('present');
  const e = isPresent
    ? { y: now.getFullYear(), m: now.getMonth() }
    : parseDate(end);
  if (!s || !e) return '';
  const totalMonths = (e.y - s.y) * 12 + (e.m - s.m);
  const years = Math.floor(Math.max(0, totalMonths) / 12);
  const months = Math.max(0, totalMonths) % 12;
  if (years > 0 && months > 0) return `${years} yr ${months} mo`;
  if (years > 0) return `${years} yr`;
  if (months > 0) return `${months} mo`;
  return '<1 yr';
}

function inferSkillLabel(skill: string): string {
  const lower = skill.toLowerCase();
  const labelMap: Record<string, string> = {
    'python': 'Technical Skills',
    'javascript': 'Technical Skills',
    'typescript': 'Technical Skills',
    'java': 'Technical Skills',
    'c\\+\\+': 'Technical Skills',
    'rust': 'Technical Skills',
    'go': 'Technical Skills',
    'swift': 'Technical Skills',
    'kotlin': 'Technical Skills',
    'react': 'Frameworks',
    'next\\.?js': 'Frameworks',
    'vue': 'Frameworks',
    'angular': 'Frameworks',
    'node': 'Frameworks',
    'express': 'Frameworks',
    'django': 'Frameworks',
    'spring': 'Frameworks',
    'flask': 'Frameworks',
    'tensorflow': 'Frameworks',
    'pytorch': 'Frameworks',
    'transformers': 'Frameworks',
    'llm': 'Frameworks',
    'rag': 'Frameworks',
    'langchain': 'Frameworks',
    'docker': 'Cloud & DevOps',
    'kubernetes': 'Cloud & DevOps',
    'aws': 'Cloud & DevOps',
    'gcp': 'Cloud & DevOps',
    'azure': 'Cloud & DevOps',
    'terraform': 'Cloud & DevOps',
    'ci/cd': 'Cloud & DevOps',
    'jenkins': 'Cloud & DevOps',
    'postgresql': 'Databases',
    'mongodb': 'Databases',
    'redis': 'Databases',
    'mysql': 'Databases',
    'sqlite': 'Databases',
    'elasticsearch': 'Databases',
    'agile': 'Industry Knowledge',
    'scrum': 'Industry Knowledge',
    'leadership': 'Industry Knowledge',
    'communication': 'Industry Knowledge',
    'project management': 'Industry Knowledge',
    'git': 'Tools',
  };
  for (const [pattern, label] of Object.entries(labelMap)) {
    if (new RegExp(pattern, 'i').test(lower)) return label;
  }
  return 'Other';
}

function groupSkillsByLabel(skills: string[]): ATSSkill[] {
  const grouped: Record<string, string[]> = {};
  const priority = ['Technical Skills', 'Frameworks', 'Databases', 'Cloud & DevOps', 'Industry Knowledge', 'Tools', 'Other'];

  for (const skill of skills) {
    const label = inferSkillLabel(skill);
    if (!grouped[label]) grouped[label] = [];
    if (!grouped[label].includes(skill)) grouped[label].push(skill);
  }

  return priority
    .filter(l => grouped[l])
    .map(label => ({ label, value: grouped[label].join(', ') }));
}

export function transformResumeData(data: {
  userName: string;
  userRole?: string;
  email: string;
  phone: string;
  location?: string;
  linkedin?: string;
  summary: string;
  skills: string[];
  categorizedSkills?: {
    technicalSkills: string[];
    frameworks: string[];
    databases: string[];
    cloudDevOps: string[];
    industryKnowledge: string[];
  };
  experience: AppExperience[];
  education: AppEducation[];
  aiProjects?: AppExperience[];
  achievements?: string[];
}): ATSResumeData {
  const contact: ATSContact = {
    location: data.location || '',
    phone: data.phone || '',
    email: data.email || '',
    linkedin: data.linkedin || '',
  };

  const experience: ATSExperience[] = data.experience.map((exp) => {
    let start = exp.start || '';
    let end = exp.end || '';

    if (!start && exp.duration) {
      const parsed = parseDurationString(exp.duration);
      start = parsed.start;
      end = parsed.end;
    }

    const sections = exp.sections && exp.sections.length > 0
      ? exp.sections
      : [{ title: exp.role || 'Responsibilities', bullets: exp.bullets }];

    return {
      role: exp.role,
      company: exp.company,
      location: exp.location || '',
      start,
      end,
      stack: exp.stack || '',
      sections,
    };
  });

  const ai_projects: ATSProject[] = (data.aiProjects || []).map((p) => ({
    title: p.role || p.company || '',
    bullets: p.bullets || [],
  }));

  const skills = data.categorizedSkills
    ? [
        ...(data.categorizedSkills.technicalSkills.length > 0 ? [{ label: 'Technical Skills', value: data.categorizedSkills.technicalSkills.join(', ') }] : []),
        ...(data.categorizedSkills.frameworks.length > 0 ? [{ label: 'Frameworks', value: data.categorizedSkills.frameworks.join(', ') }] : []),
        ...(data.categorizedSkills.databases.length > 0 ? [{ label: 'Databases', value: data.categorizedSkills.databases.join(', ') }] : []),
        ...(data.categorizedSkills.cloudDevOps.length > 0 ? [{ label: 'Cloud & DevOps', value: data.categorizedSkills.cloudDevOps.join(', ') }] : []),
        ...(data.categorizedSkills.industryKnowledge.length > 0 ? [{ label: 'Industry Knowledge', value: data.categorizedSkills.industryKnowledge.join(', ') }] : []),
      ]
    : groupSkillsByLabel(data.skills);

  const achievements = data.achievements || [];

  const ed = data.education.map((e) => ({
    degree: e.degree,
    school: e.school,
    years: e.year,
  }));

  return {
    name: data.userName,
    contact,
    summary: data.summary,
    skills,
    experience,
    ai_projects: ai_projects.length > 0 ? ai_projects : undefined,
    education: ed,
    achievements,
  };
}

export function calculateTotalExperience(experience: ATSExperience[]): string {
  const now = new Date();
  let totalMonths = 0;

  for (const exp of experience) {
    const s = parseDate(exp.start);
    const isPresent = !exp.end || exp.end.toLowerCase().includes('present');
    const e = isPresent
      ? { y: now.getFullYear(), m: now.getMonth() }
      : parseDate(exp.end);
    if (s && e) {
      totalMonths += (e.y - s.y) * 12 + (e.m - s.m);
    }
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return `${years}.${Math.round(months / 6) * 5}`;
}

function parseDate(d: string): { y: number; m: number } | null {
  const m = d.match(/^(\d{4})(?:-(\d{2}))?$/);
  if (!m) return null;
  return { y: parseInt(m[1]), m: m[2] ? parseInt(m[2]) - 1 : 0 };
}

export { calcDurationYearsMonths, formatDateRange, parseDurationString };
