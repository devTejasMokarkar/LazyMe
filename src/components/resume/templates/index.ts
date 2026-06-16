export type TemplateType = 'classic' | 'modern' | 'minimalist' | 'resumeworded';

export interface ResumeData {
  name: string;
  title: string;
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    bullets: string[];
    companyDescription?: string;
  }>;
  skills: string[];
  email: string;
  phone: string;
  location?: string;
  summary: string;
  education: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
  projects?: Array<{
    name: string;
    date?: string;
    bullets: string[];
  }>;
  sectionHeaders?: Record<string, string>;
}

export interface ResumeWordedData {
  name: string;
  title: string;
  contact: {
    location: string;
    phone: string;
    email: string;
    linkedin: string;
  };
  experience: Array<{
    company: string;
    dates: string;
    title: string;
    companyDescription?: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    graduationDate: string;
  }>;
  skills: {
    technicalSkills: string[];
    frameworks: string[];
    databases: string[];
    cloudDevOps: string[];
    industryKnowledge: string[];
  };
}

export interface TemplateProps {
  data: ResumeData;
  color: string;
  theme: 'light' | 'dark';
}

export interface ResumeWordedTemplateProps {
  data: ResumeWordedData;
}

export const TEMPLATES: Record<TemplateType, { name: string; description: string }> = {
  classic: { name: 'Classic', description: 'Traditional serif layout' },
  modern: { name: 'Modern', description: 'Clean contemporary design' },
  minimalist: { name: 'Minimalist', description: 'Ultra-clean sparse layout' },
  resumeworded: { name: 'Resume Worded', description: 'ATS-optimized single-column layout' },
};
