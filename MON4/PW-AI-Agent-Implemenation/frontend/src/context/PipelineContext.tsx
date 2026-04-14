/**
 * PipelineContext — shared state across the entire test automation pipeline.
 *
 * Holds: testCases → features → generated files → execution results
 * So every page can access the pipeline state without React Router state.
 *
 * All data-carrying state is persisted to localStorage so it survives
 * page refreshes and re-visits.
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { generateBdd } from '../services/bddService';
import { generateCode } from '../services/codeService';

// ─── localStorage helpers ────────────────────────────────────
const STORAGE_KEY = 'ai_test_pipeline';

interface PersistedData {
  testCases: any[];
  features: any[];
  generatedFiles: any[];
  selectedScenarios: string[];
}

function loadPersistedData(): PersistedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        testCases: Array.isArray(parsed.testCases) ? parsed.testCases : [],
        features: Array.isArray(parsed.features) ? parsed.features : [],
        generatedFiles: Array.isArray(parsed.generatedFiles) ? parsed.generatedFiles : [],
        selectedScenarios: Array.isArray(parsed.selectedScenarios) ? parsed.selectedScenarios : [],
      };
    }
  } catch { /* ignore corrupt data */ }
  return { testCases: [], features: [], generatedFiles: [], selectedScenarios: [] };
}

function persistData(data: PersistedData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

// ─── Types ───────────────────────────────────────────────────
export interface PipelineState {
  /* Step 1: Upload */
  testCases: any[];
  /* Step 2: BDD */
  features: any[];
  bddLoading: boolean;
  bddError: string | null;
  /* Step 3: Code Gen */
  generatedFiles: any[];
  codeLoading: boolean;
  codeError: string | null;
  /* Step 4: Execution */
  selectedScenarios: string[]; // scenario tags/names selected for execution
}

interface PipelineActions {
  setTestCases: (tc: any[]) => void;
  triggerBddGeneration: (tc?: any[]) => Promise<void>;
  triggerCodeGeneration: (feats?: any[]) => Promise<void>;
  setSelectedScenarios: (s: string[]) => void;
  resetPipeline: () => void;
}

const PipelineContext = createContext<(PipelineState & PipelineActions) | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  // Rehydrate from localStorage on first render
  const initial = loadPersistedData();

  const [testCases, setTestCases] = useState<any[]>(initial.testCases);
  const [features, setFeatures] = useState<any[]>(initial.features);
  const [bddLoading, setBddLoading] = useState(false);
  const [bddError, setBddError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<any[]>(initial.generatedFiles);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(initial.selectedScenarios);

  // Persist data-carrying state whenever it changes
  useEffect(() => {
    persistData({ testCases, features, generatedFiles, selectedScenarios });
  }, [testCases, features, generatedFiles, selectedScenarios]);

  const triggerBddGeneration = useCallback(async (tc?: any[]) => {
    const cases = tc || testCases;
    if (!cases.length) return;
    setBddLoading(true);
    setBddError(null);
    setFeatures([]);
    setGeneratedFiles([]);
    try {
      const data = await generateBdd(cases);
      const feats = data.features || [];
      setFeatures(feats);
      // Auto-trigger code generation after BDD succeeds
      if (feats.length > 0) {
        setCodeLoading(true);
        setCodeError(null);
        try {
          const codeData = await generateCode(feats);
          setGeneratedFiles(codeData.files || []);
        } catch (err: any) {
          const errData = err.response?.data;
          setCodeError(
            (Array.isArray(errData?.errors) ? errData.errors.join(' | ') : null) ||
              errData?.error || err.message
          );
        } finally {
          setCodeLoading(false);
        }
      }
    } catch (err: any) {
      const errData = err.response?.data;
      setBddError(
        (Array.isArray(errData?.errors) ? errData.errors.join(' | ') : null) ||
          errData?.error || err.message
      );
    } finally {
      setBddLoading(false);
    }
  }, [testCases]);

  const triggerCodeGeneration = useCallback(async (feats?: any[]) => {
    const f = feats || features;
    if (!f.length) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const data = await generateCode(f);
      setGeneratedFiles(data.files || []);
    } catch (err: any) {
      const errData = err.response?.data;
      setCodeError(
        (Array.isArray(errData?.errors) ? errData.errors.join(' | ') : null) ||
          errData?.error || err.message
      );
    } finally {
      setCodeLoading(false);
    }
  }, [features]);

  const resetPipeline = useCallback(() => {
    setTestCases([]);
    setFeatures([]);
    setGeneratedFiles([]);
    setBddError(null);
    setCodeError(null);
    setSelectedScenarios([]);
    // Clear persisted data too
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <PipelineContext.Provider value={{
      testCases, features, bddLoading, bddError,
      generatedFiles, codeLoading, codeError,
      selectedScenarios,
      setTestCases, triggerBddGeneration, triggerCodeGeneration,
      setSelectedScenarios, resetPipeline,
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('usePipeline must be used within PipelineProvider');
  return ctx;
}
