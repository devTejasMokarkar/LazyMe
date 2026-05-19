// ============================================
// DOCUMENT CHUNKING SYSTEM
// ============================================

export interface TextChunk {
  id: string;
  text: string;
  index: number;
  totalChunks: number;
  metadata?: ChunkMetadata;
}

export interface ChunkMetadata {
  sourcePages?: string;
  sectionType?: string;
  wordCount?: number;
}

// Configuration
const CHUNK_CONFIG = {
  maxChunkSize: 3000,      // Characters per chunk
  minChunkSize: 500,      // Minimum chunk size
  overlap: 200,           // Overlap between chunks
  maxChunks: 10           // Maximum chunks to create
};

// Split text into chunks based on sections
export function chunkText(text: string, maxChunks: number = CHUNK_CONFIG.maxChunks): TextChunk[] {
  if (!text || text.length < CHUNK_CONFIG.minChunkSize) {
    return [{
      id: generateChunkId(0),
      text: text,
      index: 0,
      totalChunks: 1,
      metadata: { wordCount: countWords(text) }
    }];
  }
  
  // Try to split by sections first
  const sections = splitIntoSections(text);
  
  if (sections.length > 1) {
    return createSectionChunks(sections, maxChunks);
  }
  
  // Fall back to size-based chunking
  return createSizeChunks(text, maxChunks);
}

// Split text into logical sections
function splitIntoSections(text: string): string[] {
  const sectionHeaders = [
    /^(?:EXPERIENCE|WORK\s+HISTORY|PROFESSIONAL\s+EXPERIENCE|EMPLOYMENT)/gim,
    /^(?:EDUCATION|ACADEMIC|QUALIFICATION)/gim,
    /^(?:SKILLS|TECHNICAL\s+SKILLS|CORE\s+COMPETENCIES|EXPERTISE)/gim,
    /^(?:PROJECTS|PROJECT)/gim,
    /^(?:SUMMARY|PROFILE|OBJECTIVE)/gim,
    /^(?:CERTIFICATIONS|CERTIFICATE)/gim,
    /^(?:AWARDS|ACHIEVEMENTS)/gim,
    /^(?:CONTACT|INFO)/gim,
  ];
  
  const sections: string[] = [];
  let currentSection = "";
  let lastHeader = "";
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Check if this line is a section header
    const isHeader = sectionHeaders.some(regex => {
      regex.lastIndex = 0;
      return regex.test(line);
    });
    
    if (isHeader) {
      // Save previous section
      if (currentSection.trim()) {
        sections.push(currentSection.trim());
      }
      currentSection = line;
      lastHeader = line.toLowerCase();
    } else {
      currentSection += '\n' + line;
    }
  }
  
  // Add last section
  if (currentSection.trim()) {
    sections.push(currentSection.trim());
  }
  
  // If no sections found, return original text
  if (sections.length <= 1) {
    return [text];
  }
  
  return sections;
}

// Create chunks from sections
function createSectionChunks(sections: string[], maxChunks: number): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  for (let i = 0; i < sections.length && chunks.length < maxChunks; i++) {
    const section = sections[i];
    
    // If section is too long, split it further
    if (section.length > CHUNK_CONFIG.maxChunkSize) {
      const subChunks = createSizeChunks(section, Math.ceil(section.length / CHUNK_CONFIG.maxChunkSize));
      chunks.push(...subChunks.map(c => ({
        ...c,
        index: chunks.length + c.index,
        metadata: { ...c.metadata, sectionType: detectSectionType(sections[i]) }
      })));
    } else {
      chunks.push({
        id: generateChunkId(i),
        text: section,
        index: chunks.length,
        totalChunks: -1, // Will be set later
        metadata: {
          sectionType: detectSectionType(section),
          wordCount: countWords(section)
        }
      });
    }
  }
  
  // Set total chunks
  const totalChunks = chunks.length;
  chunks.forEach(c => c.totalChunks = totalChunks);
  
  return chunks;
}

// Create size-based chunks
function createSizeChunks(text: string, maxChunks: number): TextChunk[] {
  const chunks: TextChunk[] = [];
  const chunkSize = Math.ceil(text.length / maxChunks);
  
  for (let i = 0; i < maxChunks && i * chunkSize < text.length; i++) {
    let chunkText = text.slice(i * chunkSize, (i + 1) * chunkSize);
    
    // Add overlap
    if (i > 0 && chunkSize > CHUNK_CONFIG.overlap) {
      const overlapText = text.slice((i * chunkSize) - CHUNK_CONFIG.overlap, i * chunkSize);
      chunkText = overlapText + chunkText;
    }
    
    // Try to end at a sentence boundary
    if (i < maxChunks - 1) {
      const lastPeriod = chunkText.lastIndexOf('.');
      const lastNewline = chunkText.lastIndexOf('\n');
      
      if (lastPeriod > chunkText.length * 0.8) {
        chunkText = chunkText.slice(0, lastPeriod + 1);
      } else if (lastNewline > chunkText.length * 0.8) {
        chunkText = chunkText.slice(0, lastNewline);
      }
    }
    
    chunks.push({
      id: generateChunkId(i),
      text: chunkText.trim(),
      index: i,
      totalChunks: maxChunks,
      metadata: { wordCount: countWords(chunkText) }
    });
  }
  
  return chunks;
}

// Detect section type from content
function detectSectionType(section: string): string {
  const lower = section.toLowerCase();
  
  if (lower.includes('experience') || lower.includes('work') || lower.includes('employment')) {
    return 'experience';
  }
  if (lower.includes('education') || lower.includes('academic') || lower.includes('qualification')) {
    return 'education';
  }
  if (lower.includes('skill') || lower.includes('technolog') || lower.includes('tool')) {
    return 'skills';
  }
  if (lower.includes('project')) {
    return 'projects';
  }
  if (lower.includes('summary') || lower.includes('profile') || lower.includes('objective')) {
    return 'summary';
  }
  if (lower.includes('certification') || lower.includes('certificate')) {
    return 'certifications';
  }
  if (lower.includes('award') || lower.includes('achievement')) {
    return 'awards';
  }
  return 'other';
}

// Count words in text
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// Generate chunk ID
function generateChunkId(index: number): string {
  return `chunk_${Date.now()}_${index}`;
}

// Merge chunks back for full context
export function mergeChunks(chunks: TextChunk[]): string {
  return chunks.map(c => c.text).join('\n\n---\n\n');
}