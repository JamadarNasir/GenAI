import cors from 'cors';

/**
 * CORS middleware configured for React dev server.
 */
export const corsMiddleware = cors({
  origin: [
    'http://localhost:5173',   // Vite default dev port
    'http://localhost:3000',   // Create React App default
    'http://127.0.0.1:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
