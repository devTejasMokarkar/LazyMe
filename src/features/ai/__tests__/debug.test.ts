import { describe, it, expect } from "vitest";
import { latexToHtml, resumeToLatex } from "@/features/ai/latex.service";
import type { ResumeData } from "@/components/resume/templates/index";

const sampleResume: ResumeData = {
  name: "SOHEB SHEIKH",
  title: "Software Developer",
  email: "sohebsheikh02@gmail.com",
  phone: "+91 8669395614",
  location: "Wakad, Pune, India",
  summary: "Dedicated software developer with experience in full-stack development.",
  skills: ["Java", "Python", "React"],
  experience: [{
    company: "Pinnacle Teleservices Pvt. Ltd",
    role: "Jr. Software Developer",
    duration: "Dec 2024 - Present",
    bullets: ["Built a secure microservices SMS gateway.", "Implemented JWT authentication."],
  }],
  education: [{ school: "KITS (RTMNU)", degree: "B.Tech CSE", year: "2024" }],
};

describe("debug html output", () => {
  it("shows full html", () => {
    const latex = resumeToLatex(sampleResume, "modern");
    const html = latexToHtml(latex);
    console.log("=== HTML OUTPUT ===");
    console.log(html);
    console.log("=== END ===");
    expect(html.length).toBeGreaterThan(0);
  });
});
