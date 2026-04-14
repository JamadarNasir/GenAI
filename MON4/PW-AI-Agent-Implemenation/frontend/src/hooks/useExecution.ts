import { useState, useCallback } from 'react';
import { runTests, stopTests } from '../services/executionService';

export function useExecution() {
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRun = useCallback(async (config: { browser?: string; tags?: string[]; headless?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await runTests(config);
      setRunId(data.runId);
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await stopTests();
      setRunId(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return { startRun, stop, loading, runId, error };
}
