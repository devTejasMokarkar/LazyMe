import { ResumeData } from "@/components/resume/templates/index";

export function resumeToLatex(data: ResumeData, template: 'classic' | 'modern' | 'minimalist' | 'resumeworded' = 'modern'): string {
  const esc = (str: string | null | undefined = "") =>
    (str || "")
      .replace(/\\/g, "\\\\")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/\$/g, "\\$")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");

  const headers = {
    summary: data.sectionHeaders?.summary || "Professional Summary",
    skills: data.sectionHeaders?.skills || "Core Competencies",
    experience: data.sectionHeaders?.experience || "Professional Experience",
    education: data.sectionHeaders?.education || "Education",
  };

  const expLatex = data.experience
    .map(
      (exp) =>
        `\\textbf{${esc(exp.role)}} \\hfill ${esc(exp.duration)}\\\\\n\\textit{${esc(exp.company)}}\n\\begin{itemize}[leftmargin=0.15in, labelsep=0.05in]\n${(exp.bullets || []).map((b) => `  \\item ${esc(b)}`).join("\n")}\n\\end{itemize}`
    )
    .join("\n\n");

  const eduLatex = data.education
    .map(
      (edu) =>
        `\\textbf{${esc(edu.degree)}} \\hfill ${esc(edu.year)}\\\\\n\\textit{${esc(edu.school)}}`
    )
    .join("\n\n");

  const skillsLatex =
    data.skills.length > 0
      ? `\\section*{${esc(headers.skills)}}\n${data.skills.map((s) => `\\textbullet{} ${esc(s)}`).join("  ")}`
      : "";

  const contactLine = [data.email, data.phone, data.location].filter(Boolean).join(" $\\mid$ ");

  if (template === 'classic') {
    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\hypersetup{colorlinks=true,linkcolor=black,urlcolor=black}
\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\pagenumbering{gobble}
\\setlist[itemize]{leftmargin=*, itemsep=2pt, topsep=4pt}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
\\begin{document}
\\begin{center}
    {\\Huge \\textbf{${esc(data.name).toUpperCase()}}} \\\\[4pt]
    {\\large \\textit{${esc(data.title)}}} \\\\[4pt]
    \\small ${contactLine}
\\end{center}
\\section*{${esc(headers.summary)}}
${esc(data.summary)}
${skillsLatex}
\\section*{${esc(headers.experience)}}
${expLatex}
\\section*{${esc(headers.education)}}
${eduLatex}
\\end{document}`;
  }

  if (template === 'minimalist') {
    return `\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.9in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\hypersetup{colorlinks=true,linkcolor=black,urlcolor=black}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0em}{}[\\vspace{-2pt}]
\\titlespacing{\\section}{0pt}{12pt}{4pt}
\\pagenumbering{gobble}
\\setlist[itemize]{leftmargin=0.15in, itemsep=1pt, topsep=2pt, label={--}}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}
\\renewcommand{\\familydefault}{\\sfdefault}
\\begin{document}
\\begin{flushright}
    {\\huge \\textbf{${esc(data.name)}}} \\\\[2pt]
    ${esc(data.title)} \\\\[2pt]
    \\small ${contactLine}
\\end{flushright}
\\vspace{8pt}
\\section*{${esc(headers.summary)}}
${esc(data.summary)}
${skillsLatex}
\\section*{${esc(headers.experience)}}
${expLatex}
\\section*{${esc(headers.education)}}
${eduLatex}
\\end{document}`;
  }

  // Default: modern
  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\hypersetup{colorlinks=true,linkcolor=black,urlcolor=black}
\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\pagenumbering{gobble}
\\setlist[itemize]{leftmargin=*, itemsep=2pt, topsep=4pt}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
\\begin{document}
\\begin{center}
    {\\Huge \\textbf{${esc(data.name).toUpperCase()}}} \\\\[4pt]
    ${esc(data.title)} \\\\[2pt]
    \\small ${contactLine}
\\end{center}
\\section*{${esc(headers.summary)}}
${esc(data.summary)}
${skillsLatex}
\\section*{${esc(headers.experience)}}
${expLatex}
\\section*{${esc(headers.education)}}
${eduLatex}
\\end{document}`;
}

export function latexToHtml(latex: string): string {
  // Strip document wrapper
  let html = latex
    .replace(/\\documentclass[\s\S]*?\\begin\{document\}/, "")
    .replace(/\\end\{document\}/, "");

  // Center / flush-right blocks
  html = html.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    '<div class="text-center">$1</div>'
  );
  html = html.replace(
    /\\begin\{flushright\}([\s\S]*?)\\end\{flushright\}/g,
    '<div class="text-right">$1</div>'
  );

  // Section headings — page-break-aware
  html = html.replace(
    /\\section\*\{(.*?)\}/g,
    '<div class="page-break-avoid"><h2 class="section-header">$1</h2></div>'
  );

  // Bold / italic
  html = html.replace(/\\textbf\{(.*?)\}/g, "<strong>$1</strong>");
  html = html.replace(/\\textit\{(.*?)\}/g, "<em>$1</em>");

  // Itemize lists
  html = html.replace(
    /\\begin\{itemize\}(\[.*?\])?([\s\S]*?)\\end\{itemize\}/g,
    '<ul class="resume-list">$2</ul>'
  );
  html = html.replace(/\\item\s+([\s\S]*?)(?=\\item|<\/ul>|$)/g, "<li>$1</li>");

  // Inline bullets (for skills section without itemize)
  html = html.replace(/\\textbullet\{\}\s*/g, '<span class="skill-bullet"> • </span>');

  // Line breaks: \\[6pt] → spacer, \\ → <br/>
  html = html.replace(/\\\\\[(\d+)pt\]/g, '<div class="entry-gap" style="height:$1pt"></div>');
  html = html.replace(/\\\\/g, "<br/>");

  // Horizontal fill — wrap in a span
  html = html.replace(/\\hfill\s*/g, '</span><span class="hfill">');

  // Spacing commands
  html = html.replace(/\\quad/g, " ");
  html = html.replace(/\\qquad/g, "  ");
  html = html.replace(/\\vspace\{.*?\}/g, "");
  html = html.replace(/\\small/g, "");
  html = html.replace(/\\Huge/g, "");
  html = html.replace(/\\Large/g, "");
  html = html.replace(/\\huge/g, "");
  html = html.replace(/\\normalsize/g, "");
  html = html.replace(/\\centering/g, "");
  html = html.replace(/\\color\{.*?\}/g, "");
  html = html.replace(/\\titlerule/g, "");
  html = html.replace(/\\href\{.*?\}\{(.*?)\}/g, "$1");

  // Escape sequences → HTML entities
  html = html.replace(/\\\$/g, "&#36;");
  html = html.replace(/\\&/g, "&amp;");
  html = html.replace(/\\%/g, "%");
  html = html.replace(/\\#/g, "#");
  html = html.replace(/\\_/g, "_");
  html = html.replace(/\\\{/g, "{");
  html = html.replace(/\\\}/g, "}");

  // Remove any remaining \commands (but not escaped chars)
  html = html.replace(/\\[a-zA-Z@]+\*?(\{[^}]*\})?/g, "");

  // Remove stray braces
  html = html.replace(/\{|\}/g, "");

  // Remove empty spans from hfill
  html = html.replace(/<span class="hfill"><\/span>/g, "");
  // Close any unclosed hfill spans
  html = html.replace(/<span class="hfill">([\s\S]*?)(?=<br|<strong|<em|<ul|<li|<div|$)/g,
    '<span class="hfill">$1</span>');

  // Clean up whitespace
  html = html.replace(/\s+/g, " ").trim();

  // Re-format centered text blocks
  html = html.replace(
    /<div class="text-center"> (.*?) <br\/>/g,
    '<div class="text-center">$1</div>'
  );
  html = html.replace(
    /<div class="text-right"> (.*?) <br\/>/g,
    '<div class="text-right">$1</div>'
  );

  return html;
}
