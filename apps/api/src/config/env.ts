import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
  isDev: (process.env['NODE_ENV'] ?? 'development') === 'development',
  /** Anthropic API key for the chatbot. Optional — chatbot endpoints
   *  return a 400 with a clear message if not configured. */
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
};
