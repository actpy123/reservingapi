import { useCallback, useState } from 'react';

/**
 * useFileHandler - handles file selection and validation
 */
export function useFileHandler(allowedExtensions?: string[]) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file extension if restrictions provided
    if (allowedExtensions && allowedExtensions.length > 0) {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const isValidExtension = allowedExtensions.some(ext => 
        ext.toLowerCase().replace('.', '') === fileExtension
      );

      if (!isValidExtension) {
        setError(`Please select a valid file. Allowed: ${allowedExtensions.join(', ')}`);
        setSelectedFile(null);
        event.target.value = ''; // Clear input
        return;
      }
    }

    setSelectedFile(file);
  }, [allowedExtensions]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return { 
    selectedFile, 
    error, 
    handleFileChange, 
    clearFile,
    hasFile: !!selectedFile 
  } as const;
}

export default useFileHandler;
