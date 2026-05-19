// ============================================
// SIMPLE RESUME PARSER - v2
// ============================================

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  links: string[];
  summary: string;
  skills: { technical: string[]; soft: string[]; tools: string[]; languages: string[] };
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  awards: string[];
  interests: string[];
  metadata: { parsedWith: string; confidence: number; sectionsFound: string[] };
}

export interface ExperienceEntry {
  company: string;
  role: string;
  location?: string;
  duration: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
  techStack?: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field?: string;
  graduationDate?: string;
  gpa?: string;
  highlights?: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  techStack: string[];
  links?: string[];
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  date?: string;
}

// ============================================
// MAIN PARSE FUNCTION
// ============================================

export function parseResumeLocally(text: string): ParsedResume {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lowerText = text.toLowerCase();
  
  // Extract basic fields
  const name = extractName(lines);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const title = extractTitle(text);
  const location = extractLocation(text);
  const links = extractLinks(text);
  
  // Find section positions
  const sections = findSectionPositions(lines);
  
  // Extract from sections
  const skills = extractSkills(lines, sections.skills);
  const experience = extractExperienceEntries(lines, sections.experience);
  const education = extractEducationEntries(lines, sections.education);
  const projects = extractProjectEntries(lines, sections.projects);
  
  // Calculate confidence
  let score = 0;
  if (name) score += 20;
  if (email) score += 15;
  if (phone) score += 10;
  if (title) score += 15;
  score += Math.min(20, skills.technical.length * 2);
  score += Math.min(10, experience.length * 3);
  score += Math.min(10, education.length * 3);
  
  return {
    name, email, phone, location, title, links, summary: "",
    skills,
    experience,
    education,
    projects,
    certifications: [],
    awards: [],
    interests: [],
    metadata: {
      parsedWith: 'simple-parser-v2',
      confidence: score,
      sectionsFound: Object.keys(sections)
    }
  };
}

// ============================================
// SECTION DETECTION
// ============================================

interface SectionPositions {
  experience?: { start: number; end: number };
  education?: { start: number; end: number };
  skills?: { start: number; end: number };
  projects?: { start: number; end: number };
  [key: string]: { start: number; end: number } | undefined;
}

function findSectionPositions(lines: string[]): SectionPositions {
  const sections: SectionPositions = {};
  
  const sectionPatterns: [RegExp, string][] = [
    [/(experience|work\s+history|professional\s+experience|employment)/i, 'experience'],
    [/(education|academic|qualification)/i, 'education'],
    [/(skills|technical\s+skills|technologies)/i, 'skills'],
    [/(projects?|portfolio)/i, 'projects'],
  ];
  
  for (const [pattern, name] of sectionPatterns) {
    // Only match section headers (short lines, all caps, or followed by separators)
    const idx = lines.findIndex(l => {
      const isShort = l.length < 30;
      const isAllCaps = l === l.toUpperCase() && l.length > 3;
      const hasSeparator = l.match(/^[=_-]+$/);
      return (isShort || isAllCaps || hasSeparator) && pattern.test(l);
    });
    
    if (idx !== -1) {
      // Find end of this section
      let end = lines.length;
      for (let i = idx + 1; i < lines.length; i++) {
        const line = lines[i];
        // Stop at next section header
        const isNextSection = sectionPatterns.some(([p]) => {
          const isShort = line.length < 30;
          const isAllCaps = line === line.toUpperCase() && line.length > 3;
          return (isShort || isAllCaps) && p.test(line);
        });
        if (isNextSection) {
          end = i;
          break;
        }
      }
      sections[name] = { start: idx, end };
    }
  }
  
  return sections;
}

// ============================================
// FIELD EXTRACTION
// ============================================

function extractName(lines: string[]): string {
  // First non-empty, non-section line that's likely a name
  for (const line of lines.slice(0, 8)) {
    if (line.length > 1 && line.length < 50 && 
        /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(line) &&
        !line.includes('@') && !line.includes('http')) {
      return line;
    }
  }
  return "";
}

function extractEmail(text: string): string {
  const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match?.[1] || "";
}

function extractPhone(text: string): string {
  // Match various phone formats: +1-234-456-7890, (234) 456-7890, 234-456-7890, etc.
  const match = text.match(/\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{0,4}/);
  if (match) {
    const phone = match[0].replace(/\s+/g, ' ').trim();
    // Ensure we have at least 7 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 7) return phone;
  }
  return "";
}

function extractTitle(text: string): string {
  const patterns = [
    /((?:senior|junior|lead|principal|full[\s-]?stack|front[\s-]?end|back[\s-]?end)\s*(?:developer|engineer|designer))/i,
    /(?:software|web|mobile|data|cloud|backend)\s*(?:developer|engineer)/i,
    /(.*developer.*)/i,
    /(.*engineer.*)/i,
    /(.*programmer.*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }
  return "";
}

function extractLocation(text: string): string {
  const match = text.match(/(?:India|USA|UK|Canada|Australia|Germany|France|Japan|Singapore|New York|San Francisco|Seattle|London|Chicago|Bangalore|Mumbai|Delhi|Chennai|Hyderabad)/i);
  return match?.[0] || "";
}

function extractLinks(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
  return Array.from(new Set(urls)).slice(0, 5);
}

// ============================================
// SKILLS EXTRACTION
// ============================================

function extractSkills(lines: string[], section?: { start: number; end: number }) {
  const technical: string[] = [];
  const text = lines.join('\n');
  
  // Comprehensive list of tech terms to search for
  const techTerms = [
    'Java', 'Python', 'JavaScript', 'TypeScript', 'C\\+\\+', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
    'React', 'Angular', 'Vue', 'Node', 'Express', 'Next.js', 'NextJS',
    'Spring', 'Spring Boot', 'Spring Security', 'Spring MVC', 'Django', 'Flask', 'Rails', 'Laravel',
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Amazon Web Services',
    'Docker', 'Kubernetes', 'K8s', 'Jenkins', 'Git', 'GitHub', 'GitLab', 'CI/CD', 'DevOps',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka', 'DynamoDB', 'Firebase',
    'HTML', 'CSS', 'SASS', 'Tailwind', 'Bootstrap', 'Material UI',
    'REST', 'RESTful', 'GraphQL', 'gRPC', 'WebSocket',
    'Machine Learning', 'ML', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'NLP', 'Computer Vision',
    'Agile', 'Scrum', 'JIRA', 'TDD', 'OOP',
    'Linux', 'Bash', 'Shell', 'Unix', 'Windows Server',
    'JUnit', 'TestNG', 'Selenium', 'Jest', 'Mocha', 'Cypress',
    'Jenkins', 'Maven', 'Gradle', 'npm', 'yarn', 'pnpm'
  ];
  
  for (const term of techTerms) {
    try {
      // Try word boundary first
      if (new RegExp(`\\b${term}\\b`, 'i').test(text) && !technical.includes(term)) {
        technical.push(term);
      }
    } catch (e) {
      // If regex fails (e.g., special chars), try simple includes
      if (text.toLowerCase().includes(term.toLowerCase()) && !technical.includes(term)) {
        technical.push(term);
      }
    }
  }
  
  return { technical, soft: [], tools: [], languages: [] };
}

// ============================================
// EXPERIENCE EXTRACTION
// ============================================

function extractExperienceEntries(lines: string[], section?: { start: number; end: number }) {
  const experiences: ExperienceEntry[] = [];
  
  if (!section) return experiences;
  
  const expLines = lines.slice(section.start + 1, section.end);
  let entry: ExperienceEntry | null = null;
  
  for (const line of expLines) {
    // Skip separators and empty
    if (line.match(/^_+$/) || !line.trim()) continue;
    
    // Skip section headers
    if (/^(experience|education|skills|projects)/i.test(line)) continue;
    
    // Check for company with location - very flexible pattern
    // Any line that starts with Capitalized words and has comma followed by location-like text
    const hasComma = line.includes(',');
    const hasLetters = /[A-Za-z]/.test(line);
    const hasNumbersOnly = /^\d+$/.test(line.replace(/,/g, ''));
    const looksLikeCompany = hasComma && hasLetters && !hasNumbersOnly && line.length > 5 && line.length < 80;
    
    if (looksLikeCompany) {
      const parts = line.split(',');
      const company = parts[0].trim();
      const location = parts.slice(1).join(',').trim();
      
      // Save previous
      if (entry && entry.bullets.length > 0) {
        experiences.push(entry);
      }
      
      entry = {
        company: company,
        role: "",
        location: location,
        duration: "",
        bullets: [],
        techStack: []
      };
    }
    // Check for date line
    else if (entry && (line.match(/\d{4}\s*[-–]\s*(present|current|\d{4})/i) || line.match(/\d{2}\/\d{4}\s*[-–]\s*(present|current|\d{2}\/\d{4})/i))) {
      entry.duration = line;
      const dates = parseDateRange(line);
      entry.startDate = dates.start;
      entry.endDate = dates.end;
    }
    // Check for role/title
    else if (entry && !entry.role && (line.includes('Developer') || line.includes('Engineer') || line.includes('Manager') || line.includes('Programmer') || line.includes('Analyst'))) {
      entry.role = line;
    }
    // Check for bullet points
    else if (entry && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
      const bullet = line.replace(/^[•\-\*\s]+/, '').trim();
      if (bullet.length > 5) {
        entry.bullets.push(bullet);
      }
    }
  }
  
  // Don't forget last entry
  if (entry && entry.bullets.length > 0) {
    experiences.push(entry);
  }
  
  return experiences.slice(0, 7);
}

function parseDateRange(dateStr: string): { start?: string; end?: string } {
  const yearMatch = dateStr.match(/(20\d{2}|19\d{2})/g);
  if (yearMatch) {
    return {
      start: yearMatch[0],
      end: dateStr.toLowerCase().includes('present') ? 'Present' : yearMatch[1] || yearMatch[0]
    };
  }
  return {};
}

// ============================================
// EDUCATION EXTRACTION
// ============================================

function extractEducationEntries(lines: string[], section?: { start: number; end: number }) {
  const education: EducationEntry[] = [];
  
  if (!section) return education;
  
  const eduLines = lines.slice(section.start + 1, section.end);
  
  for (const line of eduLines) {
    if (line.match(/bachelor|master|phd|b\.?sc|m\.?sc|b\.?tech|m\.?tech|be|me|mca|bca|degree/i)) {
      const yearMatch = line.match(/(20\d{2}|19\d{2})/);
      education.push({
        institution: line.replace(/[-|,].*/, '').trim(),
        degree: line,
        graduationDate: yearMatch?.[0]
      });
    }
  }
  
  return education.slice(0, 4);
}

// ============================================
// PROJECTS EXTRACTION
// ============================================

function extractProjectEntries(lines: string[], section?: { start: number; end: number }) {
  const projects: ProjectEntry[] = [];
  
  if (!section) return projects;
  
  const projLines = lines.slice(section.start + 1, section.end);
  let current: ProjectEntry | null = null;
  
  for (const line of projLines) {
    if (line.startsWith('•') || line.startsWith('-')) {
      const text = line.replace(/^[•\-\s]+/, '').trim();
      if (!current) {
        current = { name: text.slice(0, 50), description: "", techStack: [] };
      } else {
        current.description += " " + text;
      }
    } else if (current && line.length > 3 && line.length < 60) {
      current.name = line.slice(0, 50);
    }
    
    if (current && current.description.length > 20) {
      projects.push(current);
      current = null;
    }
  }
  
  if (current) projects.push(current);
  
  return projects.slice(0, 5);
}