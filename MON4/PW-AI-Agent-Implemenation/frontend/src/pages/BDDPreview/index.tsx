import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipeline } from '../../context/PipelineContext';

export default function BDDPreviewPage() {
  const navigate = useNavigate();
  const {
    testCases, features, bddLoading, bddError,
    codeLoading, generatedFiles,
    triggerBddGeneration,
  } = usePipeline();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Collect all scenarios across features for the test case list
  const allScenarios = features.flatMap((f: any) =>
    (f.scenarios || []).map((s: any) => ({
      featureName: f.featureName || f.name,
      scenarioName: s.name,
      tags: s.tags || [],
    }))
  );

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📝 BDD Feature Preview</h1>

      {/* Loading state */}
      {bddLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-3"></div>
          <p className="text-sm text-yellow-700">⏳ Generating BDD features with AI... This may take 15-30 seconds.</p>
          <p className="text-xs text-yellow-600 mt-1">Code generation will follow automatically.</p>
        </div>
      )}

      {/* Code generation in background indicator */}
      {!bddLoading && codeLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-center text-sm text-blue-700">
          ⚡ Code generation in progress in background...
        </div>
      )}

      {/* Error */}
      {bddError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          ❌ {bddError}
          <button onClick={() => triggerBddGeneration()} className="ml-3 underline text-red-600 hover:text-red-800">
            Retry
          </button>
        </div>
      )}

      {/* No data */}
      {testCases.length === 0 && !bddLoading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">No test cases loaded. Upload a CSV first.</p>
          <button onClick={() => navigate('/upload')} className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark">
            📤 Go to Upload
          </button>
        </div>
      )}

      {/* Test case list from uploaded CSV */}
      {testCases.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">📋 Uploaded Test Cases ({testCases.length})</h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {testCases.map((tc: any) => (
                  <tr key={tc.testCaseId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{tc.testCaseId}</td>
                    <td className="px-4 py-3 font-medium">{tc.title}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{tc.module}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        tc.priority === 'high' ? 'bg-red-100 text-red-700'
                          : tc.priority === 'medium' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>{tc.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tc.tags || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generated BDD features */}
      {features.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              ✅ Generated {features.length} BDD Feature{features.length > 1 ? 's' : ''}
              {allScenarios.length > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({allScenarios.length} scenario{allScenarios.length > 1 ? 's' : ''})
                </span>
              )}
            </h2>
            <button
              onClick={() => navigate('/code')}
              disabled={generatedFiles.length === 0 && !codeLoading}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {codeLoading ? '⏳ Generating Code...' : generatedFiles.length > 0 ? '💻 View Generated Code →' : '⏳ Waiting...'}
            </button>
          </div>

          {features.map((f: any, i: number) => (
            <div key={i} className="bg-white rounded-lg shadow mb-4 overflow-hidden">
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full bg-gray-50 px-4 py-3 border-b flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <h3 className="font-semibold text-sm">{f.featureName || f.name || `Feature ${i + 1}`}</h3>
                <div className="flex items-center gap-2">
                  {(f.tags || []).map((tag: string) => (
                    <span key={tag} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">{tag}</span>
                  ))}
                  <span className="text-gray-400 text-xs">{expandedIdx === i ? '▼' : '▶'}</span>
                </div>
              </button>
              {(expandedIdx === i || expandedIdx === null) && (
                <pre className="p-4 text-xs overflow-x-auto bg-gray-900 text-green-400 whitespace-pre-wrap max-h-[400px]">
                  <code>{f.content || f.gherkin || JSON.stringify(f, null, 2)}</code>
                </pre>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
