export interface ATSContact {
  location: string;
  phone: string;
  email: string;
}

export interface ATSExperienceSection {
  title: string;
  bullets: string[];
}

export interface ATSExperience {
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  stack: string;
  sections: ATSExperienceSection[];
}

export interface ATSProject {
  title: string;
  bullets: string[];
}

export interface ATSEducation {
  degree: string;
  school: string;
  years: string;
}

export interface ATSSkill {
  label: string;
  value: string;
}

export interface ATSResumeData {
  name: string;
  contact: ATSContact;
  summary: string;
  skills: ATSSkill[];
  experience: ATSExperience[];
  ai_projects?: ATSProject[];
  education: ATSEducation[];
  achievements: string[];
}

export interface PDFConfig {
  fontSize: number;
  leading: number;
  secSpace: number;
  marginTop: number;
  marginBottom: number;
}

export const SHRINK_STEPS: PDFConfig[] = [
  { fontSize: 8.0, leading: 11.5, secSpace: 5,  marginTop: 10, marginBottom: 8 },
  { fontSize: 7.8, leading: 11.2, secSpace: 4,  marginTop: 9,  marginBottom: 7 },
  { fontSize: 7.6, leading: 11.0, secSpace: 4,  marginTop: 8,  marginBottom: 6 },
  { fontSize: 7.5, leading: 10.8, secSpace: 3,  marginTop: 8,  marginBottom: 6 },
];

export const MM_TO_PX = 3.7795275591;

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
