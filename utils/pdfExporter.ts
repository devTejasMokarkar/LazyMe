// Client-side only PDF export utilities
export const downloadPDF = async (elementId: string, filename: string = "resume.pdf") => {
  // Dynamic import to avoid SSR issues
  if (typeof window === 'undefined') {
    return;
  }

  const html2pdf = (await import('html2pdf.js')).default;
  const element = document.getElementById(elementId);
  
  if (!element) {
    return;
  }

  try {
    const opt = {
      margin: 0.5,
      filename: filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in" as const, format: "letter" as const, orientation: "portrait" as const }
    };

    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    throw error;
  }
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
      jsPDF: { unit: "in" as const, format: "letter" as const, orientation: "portrait" as const }
    };

    await html2pdf().set(opt).from(content).save();
  } catch (error) {
    throw error;
  }
};
