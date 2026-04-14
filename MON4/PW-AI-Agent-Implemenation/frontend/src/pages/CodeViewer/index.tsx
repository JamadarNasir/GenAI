import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipeline } from '../../context/PipelineContext';

export default function CodeViewerPage() {
  const navigate = useNavigate();
  const {
    features, generatedFiles, codeLoading, codeError,
    triggerCodeGeneration,
  } = usePipeline();
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Auto-select first file when generatedFiles arrive
  useEffect(() => {
    if (generatedFiles.length > 0 && !selectedFile) {
      setSelectedFile(generatedFiles[0]);
    }
  }, [generatedFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  const filesByType = (type: string) => generatedFiles.filter((f: any) => f.type === type);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">💻 Generated Code Viewer</h1>

      {/* Still loading in background */}
      {codeLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-3"></div>
          <p className="text-sm text-yellow-700">⏳ Generating Playwright code from features... This may take a moment.</p>
        </div>
      )}

      {/* Error */}
      {codeError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          ❌ {codeError}
          <button onClick={() => triggerCodeGeneration()} className="ml-3 underline text-red-600 hover:text-red-800">
            Retry
          </button>
        </div>
      )}

      {/* No data */}
      {features.length === 0 && !codeLoading && generatedFiles.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">No features loaded. Upload a CSV and generate BDD first.</p>
          <button onClick={() => navigate('/upload')} className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark">
            📤 Go to Upload
          </button>
        </div>
      )}

      {/* Generated files */}
      {generatedFiles.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              ✅ Generated {generatedFiles.length} file{generatedFiles.length > 1 ? 's' : ''}
            </h2>
            <button
              onClick={() => navigate('/execution')}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              ▶ Select & Run Tests →
            </button>
          </div>

          <div className="flex gap-4">
            {/* File tree */}
            <div className="w-64 bg-white rounded-lg shadow p-3 shrink-0 max-h-[700px] overflow-y-auto">
              <h3 className="text-sm font-semibold mb-3 text-gray-600">📁 File Tree</h3>
              {['feature', 'step-definition', 'page-object', 'hook', 'support'].map((type) => {
                const items = filesByType(type);
                if (items.length === 0) return null;
                return (
                  <div key={type} className="mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{type}</p>
                    {items.map((f: any) => (
                      <button
                        key={f.fileName}
                        onClick={() => setSelectedFile(f)}
                        className={`block w-full text-left text-xs px-2 py-1.5 rounded ${
                          selectedFile?.fileName === f.fileName
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {f.fileName}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Code preview */}
            <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
              {selectedFile ? (
                <>
                  <div className="bg-gray-50 px-4 py-2 border-b text-sm font-medium text-gray-600">
                    {selectedFile.filePath}
                  </div>
                  <pre className="p-4 text-xs overflow-auto bg-gray-900 text-green-400 max-h-[600px] whitespace-pre-wrap">
                    <code>{selectedFile.content}</code>
                  </pre>
                </>
              ) : (
                <div className="p-8 text-center text-gray-400">Select a file to preview</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
