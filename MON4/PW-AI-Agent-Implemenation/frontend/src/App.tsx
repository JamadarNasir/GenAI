import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import UploadPage from './pages/Upload';
import BDDPreviewPage from './pages/BDDPreview';
import CodeViewerPage from './pages/CodeViewer';
import ExecutionPage from './pages/Execution';
import ReportsPage from './pages/Reports';
import { PipelineProvider } from './context/PipelineContext';

export default function App() {
  return (
    <BrowserRouter>
      <PipelineProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/bdd" element={<BDDPreviewPage />} />
            <Route path="/code" element={<CodeViewerPage />} />
            <Route path="/execution" element={<ExecutionPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Routes>
      </PipelineProvider>
    </BrowserRouter>
  );
}
