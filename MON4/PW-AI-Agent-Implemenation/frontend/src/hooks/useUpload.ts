import { useState, useCallback } from 'react';
import { uploadCsv } from '../services/csvService';

export function useUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<any[]>([]);

  const upload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const data = await uploadCsv(file);
      setTestCases(data.testCases || []);
      return data;
    } catch (err: any) {
      // Backend returns { errors: string[] } for validation failures
      const errData = err.response?.data;
      const msg =
        (Array.isArray(errData?.errors) ? errData.errors.join(' | ') : null) ||
        errData?.error ||
        err.message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { upload, loading, error, testCases, setTestCases };
}
