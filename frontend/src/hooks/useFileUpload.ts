import { useState, useCallback } from "react";

interface UseFileUploadOptions<T> {
  onSuccess?: (result: T) => void | Promise<void>;
  onError?: (error: Error) => void;
  clearFileOnSuccess?: boolean;
}

export function useFileUpload<T>(
  uploadFn: (file: File, sessionId: string, clearFn: () => void) => Promise<T>,
  options: UseFileUploadOptions<T> = {},
) {
  const { onSuccess, onError, clearFileOnSuccess } = options;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File | null, sessionId: string, clearFn: () => void) => {
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        const result = await uploadFn(file, sessionId, clearFn);

        if (clearFileOnSuccess) {
          clearFn();
        }

        if (onSuccess) {
          await onSuccess(result);
        }

        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Upload failed");
        setError(err.message);

        if (onError) {
          onError(err);
        }

        throw err;
      } finally {
        setUploading(false);
      }
    },
    [uploadFn, onSuccess, onError, clearFileOnSuccess],
  );

  return { upload, uploading, error } as const;
}

export default useFileUpload;
