import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExecution } from '../../hooks/useExecution';
import { useWebSocket } from '../../hooks/useWebSocket';
import { usePipeline } from '../../context/PipelineContext';

interface ScenarioItem {
  featureName: string;
  scenarioName: string;
  tags: string[];
  key: string; // unique ID for checkbox
}

export default function ExecutionPage() {
  const navigate = useNavigate();
  const { startRun, stop, loading, runId, error } = useExecution();
  const { logs, connected, clearLogs } = useWebSocket();
  const { features, generatedFiles, selectedScenarios, setSelectedScenarios } = usePipeline();
  const [browser, setBrowser] = useState('chromium');
  const [headless, setHeadless] = useState(true);
  const [executionDone, setExecutionDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Build scenario list from pipeline features
  const allScenarios: ScenarioItem[] = features.flatMap((f: any, fi: number) =>
    (f.scenarios || []).map((s: any, si: number) => ({
      featureName: f.featureName || f.name || `Feature ${fi + 1}`,
      scenarioName: s.name || `Scenario ${si + 1}`,
      tags: s.tags || [],
      key: `${fi}-${si}`,
    }))
  );

  // Select all by default on first load
  useEffect(() => {
    if (allScenarios.length > 0 && selectedScenarios.length === 0) {
      setSelectedScenarios(allScenarios.map(s => s.key));
    }
  }, [allScenarios.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  // Detect execution completion from logs
  useEffect(() => {
    if (logs.length > 0) {
      const lastFew = logs.slice(-5);
      const done = lastFew.some(l =>
        l.message.includes('Test run completed') ||
        l.message.includes('all tests passed') ||
        l.message.includes('Results:')
      );
      if (done && !executionDone) {
        setExecutionDone(true);
      }
    }
  }, [logs, executionDone]);

  const toggleScenario = (key: string) => {
    setSelectedScenarios(
      selectedScenarios.includes(key)
        ? selectedScenarios.filter(k => k !== key)
        : [...selectedScenarios, key]
    );
  };

  const toggleAll = () => {
    if (selectedScenarios.length === allScenarios.length) {
      setSelectedScenarios([]);
    } else {
      setSelectedScenarios(allScenarios.map(s => s.key));
    }
  };

  const handleRun = () => {
    clearLogs();
    setExecutionDone(false);

    // If all scenarios are selected, run everything (no tag filter).
    // If a subset is selected, collect their unique tags and use OR filtering.
    const allSelected = selectedScenarios.length === allScenarios.length;
    let tags: string[] = [];
    if (!allSelected) {
      const selectedItems = allScenarios.filter(s => selectedScenarios.includes(s.key));
      tags = selectedItems
        .flatMap(s => s.tags)
        .filter((t, i, arr) => arr.indexOf(t) === i); // unique tags
    }

    startRun({ browser, headless, tags });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">▶️ Test Execution</h1>

      {/* No code generated yet */}
      {generatedFiles.length === 0 && features.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">No test code generated yet. Upload a CSV first.</p>
          <button onClick={() => navigate('/upload')} className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark">
            📤 Go to Upload
          </button>
        </div>
      )}

      {/* Scenario selection */}
      {allScenarios.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              📋 Select Test Cases to Execute ({selectedScenarios.length}/{allScenarios.length})
            </h2>
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {selectedScenarios.length === allScenarios.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {allScenarios.map((s) => (
              <label
                key={s.key}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedScenarios.includes(s.key)}
                  onChange={() => toggleScenario(s.key)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.scenarioName}</p>
                  <p className="text-xs text-gray-500">{s.featureName}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {s.tags.map(tag => (
                    <span key={tag} className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">{tag}</span>
                  ))}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Browser</label>
          <select
            value={browser}
            onChange={(e) => setBrowser(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="chromium">Chromium</option>
            <option value="firefox">Firefox</option>
            <option value="webkit">WebKit</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={headless}
            onChange={(e) => setHeadless(e.target.checked)}
            className="rounded"
          />
          Headless
        </label>
        <button
          onClick={handleRun}
          disabled={loading || selectedScenarios.length === 0}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? '⏳ Running...' : `▶️ Run ${selectedScenarios.length} Test${selectedScenarios.length !== 1 ? 's' : ''}`}
        </button>
        <button
          onClick={stop}
          disabled={!loading}
          className="bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          ⏹ Stop
        </button>
        {executionDone && (
          <button
            onClick={() => navigate('/reports')}
            className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark animate-pulse"
          >
            📊 View Report →
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          ❌ {error}
        </div>
      )}

      {runId && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
          🔄 Run ID: <code className="font-mono">{runId}</code>
        </div>
      )}

      {/* Live logs */}
      <div className="bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">
            📡 Live Logs {connected ? '🟢' : '🔴'}
          </h3>
          <button onClick={clearLogs} className="text-xs text-gray-400 hover:text-white">
            Clear
          </button>
        </div>
        <div className="p-4 h-96 overflow-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-gray-500">Waiting for logs...</p>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`py-0.5 ${
                  log.level === 'error'
                    ? 'text-red-400'
                    : log.level === 'warn'
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}
              >
                <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>{' '}
                {log.message}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
