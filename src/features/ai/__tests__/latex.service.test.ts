import { describe, it, expect, beforeAll } from "vitest";
import { resumeToLatex, latexToHtml } from "@/features/ai/latex.service";
import type { ResumeData } from "@/components/resume/templates/index";

const sampleResume: ResumeData = {
  name: "SOHEB SHEIKH",
  title: "Software Developer",
  email: "sohebsheikh02@gmail.com",
  phone: "+91 8669395614",
  location: "Wakad, Pune, India",
  summary: "Dedicated software developer with experience in full-stack development.",
  skills: ["Java", "Python", "React", "Docker", "AWS"],
  experience: [
    {
      company: "Pinnacle Teleservices Pvt. Ltd",
      role: "Jr. Software Developer",
      duration: "Dec 2024 - Present",
      bullets: [
        "Built secure microservices SMS gateway using Spring Boot REST APIs.",
        "Implemented JWT authentication and Redis session management.",
      ],
    },
  ],
  education: [
    { school: "Kavikulguru Institute of Technology and Science (RTMNU)", degree: "B.Tech in Computer Science and Engineering", year: "2024" },
    { school: "Maharashtra State Board", degree: "Higher Secondary Certificate (H.S.C)", year: "2018" },
  ],
  sectionHeaders: {
    summary: "Professional Summary",
    skills: "Core Competencies",
    experience: "Professional Experience",
    education: "Education",
  },
};

let modernLatex: string;

beforeAll(() => {
  modernLatex = resumeToLatex(sampleResume, "modern");
});

describe("resumeToLatex", () => {
  it("produces a valid LaTeX document wrapper", () => {
    expect(modernLatex).toContain("\\documentclass[11pt,a4paper]{article}");
    expect(modernLatex).toContain("\\begin{document}");
    expect(modernLatex).toContain("\\end{document}");
  });

  it("includes the name and title", () => {
    expect(modernLatex).toContain("SOHEB SHEIKH");
    expect(modernLatex).toContain("Software Developer");
  });

  it("includes contact info", () => {
    expect(modernLatex).toContain("sohebsheikh02@gmail.com");
    expect(modernLatex).toContain("+91 8669395614");
  });

  it("renders section headers from sectionHeaders config", () => {
    expect(modernLatex).toContain("\\section*{Professional Summary}");
    expect(modernLatex).toContain("\\section*{Core Competencies}");
    expect(modernLatex).toContain("\\section*{Professional Experience}");
    expect(modernLatex).toContain("\\section*{Education}");
  });

  it("renders experience entries with role, company, duration, bullets", () => {
    expect(modernLatex).toContain("\\textbf{Jr. Software Developer}");
    expect(modernLatex).toContain("\\hfill Dec 2024 - Present");
    expect(modernLatex).toContain("\\textit{Pinnacle Teleservices Pvt. Ltd}");
    expect(modernLatex).toContain("microservices SMS gateway");
    expect(modernLatex).toContain("JWT authentication");
  });

  it("renders education entries with degree, year, school", () => {
    expect(modernLatex).toContain("B.Tech in Computer Science and Engineering");
    expect(modernLatex).toContain("2024");
    expect(modernLatex).toContain("Kavikulguru Institute");
    expect(modernLatex).toContain("Higher Secondary Certificate (H.S.C)");
  });

  it("renders skills as inline textbullet items", () => {
    expect(modernLatex).toContain("Java");
    expect(modernLatex).toContain("Python");
    expect(modernLatex).toContain("React");
    expect(modernLatex).toContain("Docker");
  });

  it("escapes special LaTeX characters", () => {
    const withSpecial: ResumeData = {
      ...sampleResume,
      summary: "100% satisfaction & cost < $50",
      skills: ["C++", "C#"],
    };
    const result = resumeToLatex(withSpecial, "modern");
    expect(result).toContain("100\\% satisfaction \\&");
    expect(result).not.toContain("100%");
  });

  it("handles empty resume gracefully", () => {
    const empty: ResumeData = {
      name: "", title: "", email: "", phone: "", location: "", summary: "", skills: [],
      experience: [], education: [],
    };
    const result = resumeToLatex(empty, "modern");
    expect(result).toContain("\\begin{document}");
    expect(result).toContain("\\end{document}");
  });

  it("produces different output for different templates", () => {
    const classic = resumeToLatex(sampleResume, "classic");
    const modern = resumeToLatex(sampleResume, "modern");
    const minimalist = resumeToLatex(sampleResume, "minimalist");
    expect(classic).not.toBe(modern);
    expect(minimalist).not.toBe(modern);
  });

  it("uses custom section headers when provided", () => {
    const custom: ResumeData = {
      ...sampleResume,
      sectionHeaders: { summary: "My Summary", skills: "Tech Stack", experience: "Work History", education: "Learning" },
    };
    const result = resumeToLatex(custom, "modern");
    expect(result).toContain("\\section*{My Summary}");
    expect(result).toContain("\\section*{Tech Stack}");
    expect(result).toContain("\\section*{Work History}");
    expect(result).toContain("\\section*{Learning}");
  });

  it("escapes dangerous characters in section headers", () => {
    const custom: ResumeData = {
      ...sampleResume,
      sectionHeaders: { summary: "Skills & Tools", skills: "Core {Competencies}", experience: "Professional Experience", education: "Education" },
    };
    const result = resumeToLatex(custom, "modern");
    expect(result).toContain("\\&");
    expect(result).toContain("\\{Competencies\\}");
  });
});

describe("latexToHtml", () => {
  it("strips document preamble and wrapper", () => {
    const html = latexToHtml(modernLatex);
    expect(html).not.toContain("\\documentclass");
    expect(html).not.toContain("\\end{document}");
    expect(html).not.toContain("\\usepackage");
  });

  it("converts bold and italic", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain("<strong>");
    expect(html).toContain("</strong>");
    expect(html).toContain("<em>");
    expect(html).toContain("</em>");
  });

  it("converts section headers to h2", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain('class="section-header"');
    expect(html).toContain("Professional Summary");
  });

  it("converts itemize environments to ul/li", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain('<ul class="resume-list">');
    expect(html).toContain("<li>");
    expect(html).toContain("</li>");
  });

  it("converts textbullet to skill bullet spans", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain('class="skill-bullet"');
    expect(html).toContain("Java");
    expect(html).toContain("Python");
  });

  it("converts line breaks", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain("<br/>");
  });

  it("converts hfill to proper spans", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain('class="hfill-line"');
    expect(html).toContain('class="hfill-right"');
    expect(html).toContain('class="hfill-left"');
  });

  it("converts center environment", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain('class="text-center"');
    expect(html).toContain("SOHEB SHEIKH");
  });

  it("converts escape sequences back to readable characters", () => {
    const withEscaped: ResumeData = { ...sampleResume, summary: "100\\% satisfaction \\& cost" };
    const latex = resumeToLatex(withEscaped, "modern");
    const html = latexToHtml(latex);
    expect(html).toContain("%");
    expect(html).toContain("&");
  });

  it("does not contain raw LaTeX commands", () => {
    const html = latexToHtml(modernLatex);
    expect(html).not.toContain("\\textbf");
    expect(html).not.toContain("\\textit");
    expect(html).not.toContain("\\section");
    expect(html).not.toContain("\\itemize");
    expect(html).not.toContain("\\hfill");
  });

  it("handles single-braced commands like \\\\[4pt] correctly", () => {
    const html = latexToHtml(modernLatex);
    // \\[4pt] should be converted to a spacer div or <br/>, not left as raw text
    expect(html).not.toContain("[4pt]");
  });

  it("handles empty latex string", () => {
    expect(latexToHtml("")).toBe("");
  });

  it("handles latex with only document wrapper and no content", () => {
    const html = latexToHtml("\\documentclass[a4paper]{article}\\begin{document}\\end{document}");
    expect(html).toBe("");
  });

  it("does not produce unclosed span tags", () => {
    const html = latexToHtml(modernLatex);
    const openCount = (html.match(/<span/g) || []).length;
    const closeCount = (html.match(/<\/span>/g) || []).length;
    expect(openCount).toBe(closeCount);
  });

  it("preserves name, title, and contact info in output", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain("SOHEB SHEIKH");
    expect(html).toContain("sohebsheikh02@gmail.com");
  });

  it("handles multiple education entries with spacing", () => {
    const html = latexToHtml(modernLatex);
    expect(html).toContain("B.Tech");
    expect(html).toContain("Higher Secondary Certificate");
    expect(html).not.toContain("20182018"); // no duplicated years
  });
});
