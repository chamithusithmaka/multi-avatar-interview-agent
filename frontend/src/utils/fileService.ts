/**
 * File Reading Service
 */

/**
 * Reads file content as text
 * @param file - File object to read
 * @returns Promise with file content as string
 */
export const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    // Only read text files - PDFs and DOCs need special parsing
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      // For non-text files, just return the filename as a placeholder
      // In a real app, you'd use a PDF parser library
      resolve(`[Attached file: ${file.name}]`);
    }
  });
};
