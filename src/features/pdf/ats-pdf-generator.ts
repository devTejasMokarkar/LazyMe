import type { ATSResumeData, PDFConfig } from './types';
import { SHRINK_STEPS, mmToPx } from './types';
import { calculateTotalExperience, calcDurationYearsMonths, formatDateRange } from './resume-transformer';

const ACTION_VERBS = [
  'Architected', 'Engineered', 'Deployed', 'Reduced', 'Improved', 'Built', 'Designed',
  'Developed', 'Implemented', 'Optimized', 'Led', 'Delivered', 'Launched', 'Integrated',
  'Automated', 'Scaled', 'Mentored', 'Established', 'Streamlined', 'Accelerated',
];

const BULLET = '&#8226;';

function ensureActionVerb(bullet: string): string {
  const trimmed = bullet.trim();
  const firstWord = trimmed.split(/\s+/)[0];
  if (ACTION_VERBS.some(v => v.toLowerCase() === firstWord.toLowerCase())) return trimmed;
  if (['A', 'An', 'The', 'This', 'Our', 'We', 'It'].includes(firstWord)) return trimmed;
  return `Built ${trimmed.charAt(0).toLowerCase() + trimmed.slice(1)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateSectionCSS(config: PDFConfig): string {
  return `
    @page { margin: 0; size: A4 portrait; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: ${config.fontSize}pt;
      line-height: ${config.leading}pt;
      color: #222222;
      background: white;
      width: 210mm;
      padding: ${config.marginTop}mm ${mmToPx(12)}px ${config.marginBottom}mm ${mmToPx(12)}px;
    }
    .page {
      width: 100%;
      max-width: 186mm;
      margin: 0 auto;
    }
    .name {
      font-size: 18pt;
      font-weight: bold;
      color: #111111;
      text-align: center;
      line-height: 22pt;
      margin-bottom: 2pt;
    }
    .contact {
      font-size: 8pt;
      color: #666666;
      text-align: center;
      line-height: 11pt;
      margin-bottom: 3pt;
    }
    .rule {
      border: none;
      border-top: 0.5pt solid #bbbbbb;
      margin: 4pt 0;
    }
    .section-title {
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #111111;
      letter-spacing: 0.5pt;
      margin-top: ${config.secSpace}pt;
      margin-bottom: 2pt;
    }
    .summary-text {
      font-size: ${config.fontSize}pt;
      line-height: ${config.leading}pt;
      color: #222222;
      text-align: justify;
    }
    .skills-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${config.fontSize}pt;
      line-height: ${config.leading}pt;
    }
    .skills-table td {
      padding: 1pt 0;
      vertical-align: top;
    }
    .skills-label {
      width: 28mm;
      font-weight: bold;
      color: #222222;
      padding-right: 4pt;
    }
    .skills-value {
      color: #222222;
    }
    .exp-header {
      margin-top: 3pt;
    }
    .exp-role {
      font-size: 8.5pt;
      font-weight: bold;
      color: #111111;
      line-height: 12pt;
    }
    .exp-company {
      font-size: ${Math.max(config.fontSize - 0.2, 7.5)}pt;
      color: #666666;
      line-height: ${config.leading - 0.5}pt;
    }
    .exp-dates {
      font-size: 7.8pt;
      color: #666666;
      line-height: 10pt;
      margin-bottom: 1pt;
    }
    .sub-section {
      font-weight: bold;
      font-size: ${config.fontSize}pt;
      color: #222222;
      margin-top: 2pt;
      margin-bottom: 1pt;
    }
    .bullet {
      font-size: ${config.fontSize}pt;
      line-height: ${config.leading}pt;
      color: #222222;
      padding-left: 9pt;
      text-indent: -7pt;
      margin-bottom: 1pt;
    }
    .achievement-bullet {
      font-size: ${config.fontSize}pt;
      line-height: ${config.leading}pt;
      color: #222222;
      padding-left: 9pt;
      text-indent: -7pt;
      margin-bottom: 1pt;
    }
    .education-item {
      font-size: ${config.fontSize}pt;
      line-height: ${config.leading}pt;
      color: #222222;
    }
  `;
}

function generateBodyHTML(data: ATSResumeData): string {
  const { name, contact, summary, skills, experience, ai_projects, education, achievements } = data;
  const parts: string[] = [];

  parts.push(`<div class="name">${escapeHtml(name)}</div>`);

  const contactParts: string[] = [];
  if (contact.location) contactParts.push(escapeHtml(contact.location));
  if (contact.phone) contactParts.push(escapeHtml(contact.phone));
  if (contact.email) contactParts.push(escapeHtml(contact.email));
  parts.push(`<div class="contact">${contactParts.join(' | ')}</div>`);

  parts.push(`<hr class="rule" />`);

  parts.push(`<div class="section-title">Professional Summary</div>`);
  parts.push(`<div class="summary-text">${escapeHtml(summary)}</div>`);

  if (skills.length > 0) {
    parts.push(`<div class="section-title">Technical Skills</div>`);
    let tableRows = '';
    for (const skill of skills) {
      tableRows += `<tr><td class="skills-label">${escapeHtml(skill.label)}</td><td class="skills-value">${escapeHtml(skill.value)}</td></tr>`;
    }
    parts.push(`<table class="skills-table"><colgroup><col style="width:28mm" /><col /></colgroup><tbody>${tableRows}</tbody></table>`);
  }

  if (experience.length > 0) {
    parts.push(`<div class="section-title">Professional Experience</div>`);
    for (const exp of experience) {
      const dateRange = formatDateRange(exp.start, exp.end);
      const duration = calcDurationYearsMonths(exp.start, exp.end);
      parts.push(`<div class="exp-role">${escapeHtml(exp.role)} — ${escapeHtml(exp.company)}${exp.location ? `, ${escapeHtml(exp.location)}` : ''}</div>`);
      parts.push(`<div class="exp-dates">${escapeHtml(dateRange)}${duration ? ` · ${duration}` : ''}${exp.stack ? ` · ${escapeHtml(exp.stack)}` : ''}</div>`);

      for (const section of exp.sections) {
        if (section.bullets.length === 0) continue;
        if (section.title && section.title !== exp.role) {
          parts.push(`<div class="sub-section">${escapeHtml(section.title)}</div>`);
        }
        for (const bullet of section.bullets) {
          parts.push(`<div class="bullet">${BULLET}  ${escapeHtml(ensureActionVerb(bullet))}</div>`);
        }
      }
    }
  }

  if (ai_projects && ai_projects.length > 0) {
    parts.push(`<div class="section-title">AI / ML Projects</div>`);
    for (const proj of ai_projects) {
      parts.push(`<div class="sub-section">${escapeHtml(proj.title)}</div>`);
      for (const bullet of proj.bullets) {
        parts.push(`<div class="bullet">${BULLET}  ${escapeHtml(ensureActionVerb(bullet))}</div>`);
      }
    }
  }

  if (education.length > 0) {
    parts.push(`<div class="section-title">Education</div>`);
    for (const ed of education) {
      parts.push(`<div class="education-item">${escapeHtml(ed.degree)} — ${escapeHtml(ed.school)}${ed.years ? ` (${escapeHtml(ed.years)})` : ''}</div>`);
    }
  }

  if (achievements.length > 0) {
    parts.push(`<div class="section-title">Key Achievements</div>`);
    for (const ach of achievements.slice(0, 4)) {
      parts.push(`<div class="achievement-bullet">${BULLET}  ${escapeHtml(ensureActionVerb(ach))}</div>`);
    }
  }

  return parts.join('\n');
}

function generateFullHTML(data: ATSResumeData, config: PDFConfig): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>${generateSectionCSS(config)}</style></head>
<body>
  <div class="page">
    ${generateBodyHTML(data)}
  </div>
</body>
</html>`;
}

function measureContentHeight(html: string): Promise<number> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) { resolve(Infinity); return; }
        doc.open();
        doc.write(html);
        doc.close();

        requestAnimationFrame(() => {
          const body = doc.body;
          const height = body?.scrollHeight || Infinity;
          document.body.removeChild(iframe);
          resolve(height);
        });
      } catch {
        document.body.removeChild(iframe);
        resolve(Infinity);
      }
    };

    iframe.src = 'about:blank';
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
      resolve(Infinity);
    }, 5000);
  });
}

function getAvailableHeight(config: PDFConfig): number {
  const A4_HEIGHT_PX = mmToPx(297);
  const marginTotal = mmToPx(config.marginTop) + mmToPx(config.marginBottom);
  return A4_HEIGHT_PX - marginTotal;
}

function getPageCount(contentHeight: number, config: PDFConfig): number {
  const available = getAvailableHeight(config);
  if (available <= 0) return Infinity;
  return Math.ceil(contentHeight / available);
}

export async function generateATSPDF(
  data: ATSResumeData,
  onProgress?: (step: number, fontSize: number) => void
): Promise<{ html: string; config: PDFConfig; pageCount: number }> {
  let finalConfig = SHRINK_STEPS[0];
  let html = '';
  let pageCount = 1;

  for (let i = 0; i < SHRINK_STEPS.length; i++) {
    const config = SHRINK_STEPS[i];
    html = generateFullHTML(data, config);
    onProgress?.(i, config.fontSize);

    const contentHeight = await measureContentHeight(html);
    pageCount = getPageCount(contentHeight, config);

    if (pageCount <= 1) {
      finalConfig = config;
      return { html, config: finalConfig, pageCount };
    }
  }

  html = generateFullHTML(data, SHRINK_STEPS[SHRINK_STEPS.length - 1]);
  return {
    html,
    config: SHRINK_STEPS[SHRINK_STEPS.length - 1],
    pageCount: Math.ceil(
      (await measureContentHeight(html)) /
        getAvailableHeight(SHRINK_STEPS[SHRINK_STEPS.length - 1])
    ),
  };
}

export async function downloadATSPDF(
  html: string,
  filename: string = 'resume-ats.pdf',
): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  const element = document.createElement('div');
  element.innerHTML = html;
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '0';
  document.body.appendChild(element);

  try {
    const opt = {
      margin: 0,
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        width: mmToPx(210),
        height: mmToPx(297),
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const,
      },
      pagebreak: { mode: 'avoid-all' as const },
    };

    await html2pdf().set(opt).from(element).save();
  } finally {
    document.body.removeChild(element);
  }
}



export { generateBodyHTML, generateSectionCSS, generateFullHTML, getAvailableHeight };
