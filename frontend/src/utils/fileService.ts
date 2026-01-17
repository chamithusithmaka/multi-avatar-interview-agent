/**
 * File Reading Service
 * Supports: TXT, PDF files
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set up PDF.js worker - use the legacy build for better compatibility
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Extracts text content from a PDF file
 * @param file - PDF File object
 * @returns Promise with extracted text
 */
const extractPdfText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText.trim();
};

/**
 * Reads file content as text
 * @param file - File object to read
 * @returns Promise with file content as string
 */
export const readFileContent = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  
  // Handle PDF files
  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    try {
      const pdfText = await extractPdfText(file);
      if (pdfText.trim()) {
        return pdfText;
      } else {
        return `[PDF file "${file.name}" contains no extractable text - it may be a scanned document]`;
      }
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return `[Error reading PDF: ${file.name}]`;
    }
  }
  
  // Handle text files
  if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  
  // Handle other text-based files (markdown, json, etc.)
  if (
    fileName.endsWith('.md') ||
    fileName.endsWith('.json') ||
    fileName.endsWith('.csv') ||
    file.type.startsWith('text/')
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  
  // For unsupported files, return a message
  return `[Unsupported file type: ${file.name}. Please use PDF or TXT files.]`;
};
