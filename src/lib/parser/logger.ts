// ============================================
// PARSER LOGGING UTILITY
// ============================================

export interface ParseLogEntry {
  timestamp: string;
  fileName: string;
  fileType: string;
  parseMethod: string;
  success: boolean;
  processingTime: number;
  extractedFields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    title: boolean;
    skills: number;
    experience: number;
    education: number;
  };
  error?: string;
  warning?: string;
}

class ParserLogger {
  private logs: ParseLogEntry[] = [];
  private readonly maxLogs = 100;

  log(entry: Omit<ParseLogEntry, 'timestamp'>): void {
    const fullEntry: ParseLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(fullEntry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Also log to console
    const status = entry.success ? '✓' : '✗';
    console.log(`${status} [Parser] ${entry.fileName} (${entry.parseMethod}) - ${entry.processingTime}ms`);
  }

  getStats(): {
    total: number;
    success: number;
    failed: number;
    avgProcessingTime: number;
    byMethod: Record<string, number>;
    byFileType: Record<string, number>;
  } {
    const total = this.logs.length;
    const success = this.logs.filter(l => l.success).length;
    const failed = total - success;
    
    const times = this.logs.map(l => l.processingTime);
    const avgTime = times.length > 0 
      ? times.reduce((a, b) => a + b, 0) / times.length 
      : 0;

    const byMethod: Record<string, number> = {};
    const byFileType: Record<string, number> = {};

    for (const log of this.logs) {
      byMethod[log.parseMethod] = (byMethod[log.parseMethod] || 0) + 1;
      byFileType[log.fileType] = (byFileType[log.fileType] || 0) + 1;
    }

    return { total, success, failed, avgProcessingTime: Math.round(avgTime), byMethod, byFileType };
  }

  getRecentLogs(count: number = 10): ParseLogEntry[] {
    return this.logs.slice(-count);
  }

  getLogs(): ParseLogEntry[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }
}

export const parserLogger = new ParserLogger();

// Helper function to create log entry from parse result
export function createLogEntry(
  fileName: string,
  fileType: string,
  parseMethod: string,
  startTime: number,
  result: any,
  error?: string
): Omit<ParseLogEntry, 'timestamp'> {
  const processingTime = Date.now() - startTime;
  
  return {
    fileName,
    fileType,
    parseMethod,
    success: !error && !!result?.name,
    processingTime,
    extractedFields: {
      name: !!result?.name,
      email: !!result?.email,
      phone: !!result?.phone,
      title: !!result?.title,
      skills: result?.skills?.technical?.length || 0,
      experience: result?.experience?.length || 0,
      education: result?.education?.length || 0
    },
    error,
    warning: result?.warning
  };
}