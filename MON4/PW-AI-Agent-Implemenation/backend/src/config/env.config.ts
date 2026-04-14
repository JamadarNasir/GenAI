import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const envConfig = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // AI Provider
  aiProvider: process.env.AI_PROVIDER || 'openai', // openai | azure | local

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',

  // Azure OpenAI
  azureOpenaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  azureOpenaiKey: process.env.AZURE_OPENAI_KEY || '',
  azureOpenaiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',

  // Local LLM (Ollama)
  localLlmUrl: process.env.LOCAL_LLM_URL || 'http://localhost:11434',
  localLlmModel: process.env.LOCAL_LLM_MODEL || 'llama3',

  // Test Execution
  baseUrl: process.env.BASE_URL || 'https://example.com',
  defaultBrowser: process.env.DEFAULT_BROWSER || 'chromium',
  headless: process.env.HEADLESS !== 'false',
  parallelWorkers: parseInt(process.env.PARALLEL_WORKERS || '2', 10),

  // MCP (Model Context Protocol)
  mcpPlaywrightEnabled: process.env.MCP_PLAYWRIGHT_ENABLED === 'true',
  useRealMcp: process.env.USE_REAL_MCP === 'true',

  // Paths
  automationDir: path.resolve(__dirname, '../../../automation'),
  aiDir: path.resolve(__dirname, '../../../ai'),
};

export default envConfig;
