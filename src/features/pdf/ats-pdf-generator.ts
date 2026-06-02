import type { ATSResumeData, PDFConfig } from './types';
import { SHRINK_STEPS, mmToPx } from './types';

const BULLET = '&#8226;';

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
      font-family: 'Inter', 'Calibri', 'Arial', Helvetica, sans-serif;
      font-size: ${config.fontSize}pt;
      line-height: ${config.leading}pt;
      color: #222222;
      background: white;
      width: 210mm;
      padding: ${config.marginTop}mm ${mmToPx(14)}px ${config.marginBottom}mm ${mmToPx(14)}px;
    }
    .page {
      width: 100%;
      max-width: 182mm;
      margin: 0 auto;
    }
    .name {
      font-size: 20pt;
      font-weight: 700;
      color: #111111;
      line-height: 24pt;
      margin-bottom: 1pt;
    }
    .title {
      font-size: 10pt;
      color: #444444;
      font-weight: 500;
      line-height: 14pt;
      margin-bottom: 4pt;
    }
    .contact {
      font-size: 8pt;
      color: #666666;
      line-height: 11pt;
      margin-bottom: 10pt;
    }
    .section-title {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2pt;
      color: #333333;
      border-bottom: 0.5pt solid #cccccc;
      padding-bottom: 3pt;
      margin-top: ${config.secSpace}pt;
      margin-bottom: 6pt;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 2pt;
    }
    .exp-company {
      font-size: 10pt;
      font-weight: 700;
      color: #111111;
      line-height: 13pt;
    }
    .exp-dates {
      font-size: 8pt;
      color: #666666;
      white-space: nowrap;
      margin-left: 8pt;
    }
    .exp-title {
      font-size: 9pt;
      font-weight: 600;
      color: #333333;
      line-height: 12pt;
      margin-top: 1pt;
    }
    .exp-desc {
      font-size: 8pt;
      font-style: italic;
      color: #777777;
      line-height: 11pt;
      margin-top: 0.5pt;
    }
    .bullet {
      font-size: ${config.fontSize}pt;
      line-height: ${config.leading}pt;
      color: #333333;
      padding-left: 12pt;
      text-indent: -9pt;
      margin-top: 1pt;
    }
    .edu-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 3pt;
    }
    .edu-institution {
      font-size: 9pt;
      font-weight: 600;
      color: #111111;
    }
    .edu-degree {
      font-size: 8.5pt;
      color: #555555;
      margin-left: 3pt;
    }
    .edu-date {
      font-size: 8pt;
      color: #666666;
      white-space: nowrap;
      margin-left: 8pt;
    }
    .skill-category {
      display: flex;
      margin-bottom: 2pt;
    }
    .skill-label {
      font-size: 8.5pt;
      font-weight: 600;
      color: #333333;
      min-width: 105pt;
      flex-shrink: 0;
    }
    .skill-value {
      font-size: 8.5pt;
      color: #444444;
      line-height: 12pt;
    }
  `;
}

function generateBodyHTML(data: ATSResumeData): string {
  const { name, contact, skills, experience, education } = data;
  const parts: string[] = [];

  // Header
  parts.push(`<div class="name">${escapeHtml(name)}</div>`);
  if (data.summary) {
    parts.push(`<div class="title">${escapeHtml(data.summary)}</div>`);
  }

  const contactParts: string[] = [];
  if (contact.location) contactParts.push(escapeHtml(contact.location));
  if (contact.phone) contactParts.push(escapeHtml(contact.phone));
  if (contact.email) contactParts.push(escapeHtml(contact.email));
  parts.push(`<div class="contact">${contactParts.join('  |  ')}</div>`);

  // WORK EXPERIENCE
  if (experience.length > 0) {
    parts.push(`<div class="section-title">Work Experience</div>`);
    for (const exp of experience) {
      parts.push(`<div class="exp-header">`);
      parts.push(`<span class="exp-company">${escapeHtml(exp.company)}</span>`);
      const dateRange = exp.start && exp.end
        ? `${escapeHtml(exp.start)} – ${escapeHtml(exp.end)}`
        : '';
      parts.push(`<span class="exp-dates">${dateRange}</span>`);
      parts.push(`</div>`);
      if (exp.role) {
        parts.push(`<div class="exp-title">${escapeHtml(exp.role)}</div>`);
      }
      for (const section of exp.sections) {
        for (const bullet of section.bullets) {
          parts.push(`<div class="bullet">${BULLET}  ${escapeHtml(bullet)}</div>`);
        }
      }
    }
  }

  // EDUCATION
  if (education.length > 0) {
    parts.push(`<div class="section-title">Education</div>`);
    for (const ed of education) {
      parts.push(`<div class="edu-item">`);
      parts.push(`<div>`);
      parts.push(`<span class="edu-institution">${escapeHtml(ed.school)}</span>`);
      parts.push(`<span class="edu-degree">— ${escapeHtml(ed.degree)}</span>`);
      parts.push(`</div>`);
      parts.push(`<span class="edu-date">${escapeHtml(ed.years)}</span>`);
      parts.push(`</div>`);
    }
  }

  // SKILLS
  if (skills.length > 0) {
    parts.push(`<div class="section-title">Skills</div>`);
    for (const skill of skills) {
      parts.push(`<div class="skill-category">`);
      parts.push(`<span class="skill-label">${escapeHtml(skill.label)}:</span>`);
      parts.push(`<span class="skill-value">${escapeHtml(skill.value)}</span>`);
      parts.push(`</div>`);
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
