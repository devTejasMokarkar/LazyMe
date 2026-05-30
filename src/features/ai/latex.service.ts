import { ResumeData } from "@/features/ai/prompts/resume.prompts";

export function resumeToLatex(data: ResumeData): string {
  const escapeLatex = (str: string | null | undefined = "") =>
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

  const expLatex = data.experience
    .map(
      (exp) => `\\textbf{${escapeLatex(exp.role)}} \\hfill ${escapeLatex(exp.duration)}\\\\
\\textit{${escapeLatex(exp.company)}}
\\begin{itemize}[leftmargin=0.15in, labelsep=0.05in]
${exp.bullets.map((b) => `  \\item ${escapeLatex(b)}`).join("\n")}
\\end{itemize}`
    )
    .join("\n\n");

  const eduLatex = data.education
    .map(
      (edu) => `\\textbf{${escapeLatex(edu.degree)}} \\hfill ${escapeLatex(edu.year)}\\\\
\\textit{${escapeLatex(edu.school)}}`
    )
    .join("\n\n");

  const skillsLatex = data.skills.length > 0 
    ? `\\section*{Core Competencies}
\\begin{itemize}[leftmargin=0.15in, labelsep=0.05in]
  \\item ${data.skills.map(escapeLatex).join(" \\textbullet{} ")}
\\end{itemize}`
    : "";

  const projLatex = data.projects && data.projects.length > 0
    ? `\\section*{Projects}
${data.projects
  .map(
    (p) => `\\textbf{${escapeLatex(p.name)}} \\\\
${escapeLatex(p.description)}`
  )
  .join("\n\n")}`
    : "";

  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{hyperref}

% Configure hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=black,
    urlcolor=black,
}

% Section formatting
\\titleformat{\\section}
  {\\large\\bfseries\\uppercase}
  {}{0em}{}[\\titlerule]

% Remove page numbers
\\pagenumbering{gobble}

% Custom list formatting
\\setlist[itemize]{leftmargin=*, itemsep=2pt, topsep=4pt}

% Reduce spacing
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

\\begin{center}
    {\\Huge \\textbf{${escapeLatex(data.name).toUpperCase()}}} \\\\[4pt]
    ${escapeLatex(data.title)} \\\\[2pt]
    \\small ${escapeLatex(data.email)} \\quad | \\quad ${escapeLatex(data.phone)}
\\end{center}

\\section*{Professional Summary}
${escapeLatex(data.summary)}

${skillsLatex}

\\section*{Professional Experience}
${expLatex}

\\section*{Education}
${eduLatex}

${projLatex}

\\end{document}`;
}

export function latexToHtml(latex: string): string {
  // Robust HTML conversion for preview
  let html = latex
    .replace(/\\documentclass[\s\S]*?\\begin\{document\}/, "")
    .replace(/\\end\{document\}/, "")
    .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '<div class="text-center">$1</div>')
    .replace(/\\textbf\{(.*?)\}/g, "<strong>$1</strong>")
    .replace(/\\textit\{(.*?)\}/g, "<em>$1</em>")
    .replace(/\\section\*\{(.*?)\}/g, '<h2 class="text-xl font-bold mt-6 mb-2 border-b border-gray-300 pb-1">$1</h2>')
    .replace(/\\begin\{itemize\}(\[.*?\])?([\s\S]*?)\\end\{itemize\}/g, '<ul class="list-disc pl-5 space-y-1">$2</ul>')
    .replace(/\\item\s+(.*)/g, "<li>$1</li>")
    .replace(/\\\\/g, "<br/>")
    .replace(/\\\[.*?\]/g, "") 
    .replace(/\\hfill/g, '<span class="float-right">')
    .replace(/\\quad/g, " ")
    .replace(/\\\|/g, " | ")
    .replace(/\\Huge/g, "")
    .replace(/\\Large/g, "")
    .replace(/\\small/g, "")
    .replace(/\\color\{.*?\}/g, "")
    .replace(/\\href\{.*?\}\{(.*?)\}/g, '<a href="#" class="text-blue-600 underline">$1</a>')
    .replace(/\\begin\{.*\}/g, "")
    .replace(/\\end\{.*\}/g, "")
    .replace(/\[\d+pt\]/g, "")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\\$/g, "$")
    .replace(/\\#/g, "#")
    .replace(/\\_/g, "_")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\[a-zA-Z]+\*?(\{.*?\})?/g, "")
    .replace(/\{|\}/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Additional cleanup for name in center
  html = html.replace(/<div class="text-center"> (.*?) <br\/>/g, '<div class="text-center"><h1>$1</h1>');

  return html;
}
