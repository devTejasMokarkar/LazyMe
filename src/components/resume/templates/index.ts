export type TemplateType = 'classic' | 'modern' | 'minimalist';

export interface ResumeData {
  name: string;
  title: string;
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    bullets: string[];
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
}

export interface TemplateProps {
  data: ResumeData;
  color: string;
  theme: 'light' | 'dark';
}

export const TEMPLATES: Record<TemplateType, { name: string; description: string }> = {
  classic: { name: 'Classic', description: 'Traditional serif layout' },
  modern: { name: 'Modern', description: 'Clean contemporary design' },
  minimalist: { name: 'Minimalist', description: 'Ultra-clean sparse layout' },
};
