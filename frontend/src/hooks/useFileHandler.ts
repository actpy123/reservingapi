import { useCallback, useState } from 'react';

export function useFileHandler(allowedExtensions?: string[]) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (allowedExtensions?.length) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        setError(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
        setSelectedFile(null);
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
