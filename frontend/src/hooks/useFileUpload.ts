import { useCallback, useState } from 'react';

export interface UseFileUploadOptions<T> {
  onSuccess?: (result: T) => void | Promise<void>;
  onError?: (error: Error) => void;
  clearFileOnSuccess?: boolean;
}

export function useFileUpload<T = unknown>(
  uploadFn: (file: File) => Promise<T>,
  options?: UseFileUploadOptions<T>
) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File | null, clearFileFn?: () => void) => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      const result = await uploadFn(file);
      
      if (options?.clearFileOnSuccess && clearFileFn) {
        clearFileFn();
        // Also clear the actual file input
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
          (input as HTMLInputElement).value = '';
        });
      }
      
      if (options?.onSuccess) {
        await options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error(err);
      
      if (options?.onError && err instanceof Error) {
        options.onError(err);
      }
      
      throw err;
    } finally {
      setUploading(false);
    }
  }, [uploadFn, options]);

  const clearError = useCallback(() => setError(null), []);

  return { upload, uploading, error, clearError } as const;
}

export default useFileUpload;
