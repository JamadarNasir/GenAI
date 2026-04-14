import morgan from 'morgan';

/**
 * HTTP request logger middleware using morgan.
 * Uses 'dev' format in development, 'combined' in production.
 */
export const loggerMiddleware = morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
);
