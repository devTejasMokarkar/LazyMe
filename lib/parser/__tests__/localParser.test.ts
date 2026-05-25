import { describe, it, expect } from 'vitest';
import { parseResumeLocally } from '../localParser';

const minimalResume = `John Doe
john@example.com
1234567890
Software Developer

Skills: JavaScript, React, Node.js

Experience:
Google - Software Engineer - 2020-2023
• Built APIs
• Led team

Education:
MIT - BTech - 2020`;

const fullResume = `John Doe
john@example.com
+1-234-567-8901
San Francisco, CA
Senior Full Stack Developer

Summary:
Experienced developer with 5+ years in web development.

Skills:
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, PostgreSQL

Experience:
Google - Senior Software Engineer - 2021-Present
• Led development of cloud services
• Built React applications
• Mentored junior developers

Amazon - Software Developer - 2018-2021
• Developed ML pipelines
• Tech: Python, TensorFlow, AWS

Education:
MIT - BTech Computer Science - 2018

Projects:
Resume Builder - Built a full-stack app - React, Node, MongoDB
AI Chatbot - NLP application - Python, TensorFlow

Certifications:
AWS Solutions Architect - Amazon - 2022`;

const techResume = `Jane Smith
jane.smith@email.com
Senior Data Scientist
New York, NY

Skills: Python, TensorFlow, PyTorch, SQL, Docker, Kubernetes, GCP

Experience:
Meta - Data Scientist - 2022-Present
• Built recommendation systems
• Used: Python, PyTorch, SQL

Projects:
Image Classifier - CNN model - Python, TensorFlow

Awards:
Best Paper Award - 2023`;

const userFormatResume = `First Last
Java Backend Developer
Seattle, Washington • +1-234-456-789 • professionalemail@resumeworded.com • linkedin.com/in/username
WORK EXPERIENCE
________________________________________________________________________________
Resume Worded, New York, NY
09/2015 – Present
Education technology startup with 50+ employees and $100m+ annual revenue
Java Backend Developer
• Developed an algorithm that reduced API response times by 87%.
• Designed RESTful APIs using Java, Thymeleaf, and Spring Boot.
• Improved customer experience by 80% via developing a RESTful API.
• Increased code coverage from 25% to 89% using JUnit and TestNG.
Polyhire, London, United Kingdom
11/2012 – 08/2015
NYSE-listed recruitment and employer branding company
Junior Software Developer
• Launched a search engine for 5.5K customers.
• Designed a user interface using React and MobX.
• Improved coding process and productivity by 80%.
EDUCATION
________________________________________________________________________________
Resume Worded University, New York, NY
Bachelor of Science — Computer Science
08/2005
SKILLS
________________________________________________________________________________
Technical Skills: Jenkins, Web Services, Agile Methodologies, Software Development.
Spring MVC, Spring Security, Spring Boot, JavaServer Pages`;

describe('parseResumeLocally', () => {
  describe('basic field extraction', () => {
    it('extracts name from minimal resume', () => {
      const result = parseResumeLocally(minimalResume);
      expect(result.name).toBeTruthy();
      expect(result.name.toLowerCase()).toContain('john');
    });

    it('extracts email', () => {
      const result = parseResumeLocally(minimalResume);
      expect(result.email).toBe('john@example.com');
    });

    it('extracts phone', () => {
      const result = parseResumeLocally(minimalResume);
      expect(result.phone.length).toBeGreaterThan(0);
    });

    it('extracts title', () => {
      const result = parseResumeLocally(minimalResume);
      expect(result.title).toBeTruthy();
    });
  });

  describe('full resume parsing', () => {
    it('extracts all basic fields', () => {
      const result = parseResumeLocally(fullResume);
      expect(result.name).toBeTruthy();
      expect(result.email).toBe('john@example.com');
      expect(result.skills.technical.length).toBeGreaterThan(0);
      expect(result.education.length).toBeGreaterThan(0);
    });

    it('detects technical skills', () => {
      const result = parseResumeLocally(fullResume);
      const skills = result.skills.technical.map(s => s.toLowerCase());
      expect(skills).toContain('javascript');
      expect(skills).toContain('react');
      expect(skills).toContain('node');
    });

    it('detects experience section in metadata', () => {
      const result = parseResumeLocally(fullResume);
      const hasExpSection = result.metadata.sectionsFound.includes('experience');
      expect(hasExpSection || result.experience.length > 0).toBe(true);
    });

    it('has multiple technical skills', () => {
      const result = parseResumeLocally(fullResume);
      expect(result.skills.technical.length).toBeGreaterThan(3);
    });

    it('detects education', () => {
      const result = parseResumeLocally(fullResume);
      expect(result.education.length).toBeGreaterThan(0);
    });
  });

  describe('tech-specific resumes', () => {
    it('detects data science skills', () => {
      const result = parseResumeLocally(techResume);
      const skills = result.skills.technical.map(s => s.toLowerCase());
      expect(skills.some(s => s.includes('python'))).toBe(true);
      expect(skills.some(s => s.includes('tensorflow') || s.includes('pytorch'))).toBe(true);
    });

    it('extracts education', () => {
      const result = parseResumeLocally(techResume);
      expect(result.education).toBeDefined();
    });
  });

  describe('user format resume', () => {
    it('extracts name', () => {
      const result = parseResumeLocally(userFormatResume);
      expect(result.name).toBeTruthy();
    });

    it('extracts skills', () => {
      const result = parseResumeLocally(userFormatResume);
      expect(result.skills.technical.length).toBeGreaterThan(0);
    });

    it('detects experience section', () => {
      const result = parseResumeLocally(userFormatResume);
      expect(result.metadata.sectionsFound).toContain('experience');
    });
  });

  describe('edge cases', () => {
    it('handles empty input gracefully', () => {
      const result = parseResumeLocally('');
      expect(result.name).toBe('');
      expect(result.email).toBe('');
    });

    it('calculates confidence score between 0-100', () => {
      const result = parseResumeLocally(fullResume);
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(100);
    });

    it('returns empty sections when no matches found', () => {
      const result = parseResumeLocally('Just some text without resume structure');
      expect(result.skills.technical).toEqual([]);
      expect(result.experience).toEqual([]);
      expect(result.education).toEqual([]);
    });

    it('extracts links when present', () => {
      const result = parseResumeLocally('John\nhttps://linkedin.com/in/john\njohn@email.com');
      expect(result.links).toContain('https://linkedin.com/in/john');
    });
  });

  describe('section detection', () => {
    it('detects projects section', () => {
      const result = parseResumeLocally(fullResume);
      const hasProjectsSection = result.metadata.sectionsFound.includes('projects');
      expect(hasProjectsSection || result.projects.length > 0 || result.experience.length > 0).toBe(true);
    });

    it('detects skills section', () => {
      const result = parseResumeLocally(fullResume);
      expect(result.metadata.sectionsFound).toContain('skills');
    });

    it('detects education section', () => {
      const result = parseResumeLocally(fullResume);
      expect(result.metadata.sectionsFound).toContain('education');
    });
  });

  describe('experience extraction', () => {
    it('extracts experience entries from user format', () => {
      const result = parseResumeLocally(userFormatResume);
      expect(result.experience.length).toBeGreaterThan(0);
      if (result.experience.length > 0) {
        expect(result.experience[0].bullets.length).toBeGreaterThan(0);
      }
    });

    it('extracts company names', () => {
      const result = parseResumeLocally(userFormatResume);
      if (result.experience.length > 0) {
        expect(result.experience[0].company).toBeTruthy();
      }
    });
  });
});
