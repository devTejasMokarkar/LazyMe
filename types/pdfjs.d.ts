declare module "pdfjs-dist/build/pdf.mjs" {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNum: number): Promise<PDFPageProxy>;
  }
  
  export interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }
  
  export interface TextContent {
    items: TextItem[];
  }
  
  export interface TextItem {
    str: string;
  }
  
  export interface GlobalWorkerOptionsType {
    workerSrc: string;
  }
  
  export const GlobalWorkerOptions: GlobalWorkerOptionsType;
  export function getDocument(options: { data: Uint8Array }): { promise: Promise<PDFDocumentProxy> };
}
