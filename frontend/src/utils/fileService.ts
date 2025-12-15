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

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  });
};
