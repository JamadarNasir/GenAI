import express from 'express';
import path from 'path';

// Middleware
import { corsMiddleware } from './middleware/cors.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error-handler.middleware';

// Routes
import uploadRoutes from './routes/upload.routes';
import bddRoutes from './routes/bdd.routes';
import codeRoutes from './routes/code.routes';
import runRoutes from './routes/run.routes';
import healRoutes from './routes/heal.routes';
import reportRoutes from './routes/report.routes';
import mcpRoutes from './routes/mcp.routes';

const app = express();

// ─── Global Middleware ───────────────────────────────────────
app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/upload', uploadRoutes);
app.use('/api/generate-bdd', bddRoutes);
app.use('/api/generate-code', codeRoutes);
app.use('/api/run', runRoutes);
app.use('/api/heal', healRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/mcp', mcpRoutes);

// ─── Serve Allure Report (static) ───────────────────────────
app.use(
  '/report',
  express.static(path.resolve(__dirname, '../../automation/allure-report'))
);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ─── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

export default app;
