import { useState, useCallback } from 'react';

interface UseFileUploadOptions<T> {
  onSuccess?: (result: T) => void | Promise<void>;
  onError?: (error: Error) => void;
  clearFileOnSuccess?: boolean;
}

export function useFileUpload<T>(
  uploadFn: (file: File, clearFn: () => void) => Promise<T>,
  options: UseFileUploadOptions<T> = {}
) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File | null, clearFn: () => void) => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const result = await uploadFn(file, clearFn);
      if (options.clearFileOnSuccess) {
        clearFn();
      }
      await options.onSuccess?.(result);
      return result;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Upload failed';
      setError(errorMessage);
      options.onError?.(e instanceof Error ? e : new Error(errorMessage));
      throw e;
    } finally {
      setUploading(false);
    }
  }, [uploadFn, options]);

  return { upload, uploading, error } as const;
}

export default useFileUpload;
