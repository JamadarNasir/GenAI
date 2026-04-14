import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../../hooks/useUpload';
import { usePipeline } from '../../context/PipelineContext';

export default function UploadPage() {
  const { upload, loading, error, testCases: freshTestCases } = useUpload();
  const {
    testCases: savedTestCases, features, generatedFiles,
    setTestCases: setPipelineTCs, triggerBddGeneration, resetPipeline,
  } = usePipeline();
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  // Show freshly-uploaded test cases first, otherwise the persisted ones
  const displayCases = freshTestCases.length > 0 ? freshTestCases : savedTestCases;

  const handleFile = useCallback(
    async (file: File) => {
      try {
        resetPipeline();
        const data = await upload(file);
        if (data?.testCases?.length) {
          setPipelineTCs(data.testCases);
          navigate('/bdd');
          triggerBddGeneration(data.testCases);
        }
      } catch {
        // error handled by useUpload hook
      }
    },
    [upload, navigate, setPipelineTCs, triggerBddGeneration, resetPipeline]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) handleFile(file);
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📤 Upload Test Cases (CSV)</h1>

      {/* Previous session banner */}
      {savedTestCases.length > 0 && freshTestCases.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">
              📋 Previous session: {savedTestCases.length} test case{savedTestCases.length > 1 ? 's' : ''} loaded
              {features.length > 0 && <span className="ml-2">• {features.length} BDD feature{features.length > 1 ? 's' : ''}</span>}
              {generatedFiles.length > 0 && <span className="ml-2">• {generatedFiles.length} code file{generatedFiles.length > 1 ? 's' : ''}</span>}
            </p>
            <p className="text-xs text-blue-600 mt-1">Upload a new CSV to replace, or continue where you left off.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate('/bdd')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              Continue →
            </button>
            <button onClick={resetPipeline} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs hover:bg-gray-300">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 bg-white'
        }`}
      >
        <p className="text-lg text-gray-500 mb-3">
          {loading ? '⏳ Uploading & generating...' : 'Drag & drop your CSV file here'}
        </p>
        <p className="text-sm text-gray-400 mb-4">or</p>
        <label className="inline-block cursor-pointer bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors">
          Browse Files
          <input type="file" accept=".csv" className="hidden" onChange={handleFileSelect} disabled={loading} />
        </label>
        <p className="text-xs text-gray-400 mt-4">
          Required columns: <code className="bg-gray-100 px-1 rounded">testCaseId, title, module, steps, expectedResult, priority</code>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          ❌ {error}
        </div>
      )}

      {/* Results table */}
      {displayCases.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">
            ✅ {freshTestCases.length > 0 ? 'Parsed' : 'Previously Loaded'} {displayCases.length} Test Cases
          </h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Steps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayCases.map((tc: any) => (
                  <tr key={tc.testCaseId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{tc.testCaseId}</td>
                    <td className="px-4 py-3">{tc.title}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                        {tc.module}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          tc.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : tc.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {tc.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {tc.steps?.length || 0} steps
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
