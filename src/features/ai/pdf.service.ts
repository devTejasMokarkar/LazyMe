// Client-side only PDF export utilities
// Client-side only PDF export utilities
export const downloadPDF = async (elementId: string, filename: string = "resume.pdf") => {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(elementId);
  if (!element) return;

  // Create a hidden iframe for perfectly isolated printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframe.contentDocument || iframeWindow?.document;
  if (!iframeWindow || !iframeDocument) return;

  // Gather all CSS links and style tags from the parent document
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  // Inject the resume into the iframe with dedicated print CSS
  const printContent = `
    <!DOCTYPE html>
    <html class="${document.documentElement.className}">
      <head>
        <title>${filename.replace('.pdf', '')}</title>
        ${styleTags}
        <style>
          @media print {
            @page { margin: 0; size: auto; }
            body { 
              margin: 0; 
              padding: 0; 
              background: white; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            #${elementId} { 
              transform: none !important; 
              box-shadow: none !important; 
              margin: 0 !important; 
              width: 100% !important;
              max-width: 100% !important;
            }
          }
        </style>
      </head>
      <body class="${document.body.className}">
        ${element.outerHTML}
      </body>
    </html>
  `;

  iframeDocument.open();
  iframeDocument.write(printContent);
  iframeDocument.close();

  // Wait for styles to load, then print and cleanup
  iframeWindow.focus();
  setTimeout(() => {
    iframeWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
};

export const downloadPDFFromContent = async (content: string, filename: string = "resume.pdf") => {
  // Dynamic import to avoid SSR issues
  if (typeof window === 'undefined') {
    return;
  }

  const html2pdf = (await import('html2pdf.js')).default;
  
  try {
    const opt = {
      margin: 0.5,
      filename: filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in" as const, format: "letter" as const, orientation: "portrait" as const },
      pagebreak: { mode: ["css", "legacy"], avoid: ["li", "h1", "h2", ".avoid-break"] }
    };

    await html2pdf().set(opt).from(content).save();
  } catch (error) {
    throw error;
  }
};
