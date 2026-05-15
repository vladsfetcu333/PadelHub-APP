import dotenv from 'dotenv';

// Use override:true so .env values take precedence over any pre-existing
// (possibly empty) values in process.env. On Windows in particular, some
// shells pre-populate variables as empty strings which would otherwise
// prevent dotenv from setting them.
dotenv.config({ override: true });

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

/** Parse CORS_ORIGIN. Accepts a single origin or a comma-separated list
 *  (useful when the frontend has both a production and preview domain on
 *  Vercel, e.g. "https://padel.vercel.app,https://padel-git-main.vercel.app").
 *  Returns either a string (single) or string[] (multi) — both accepted by
 *  the `cors` middleware. */
function parseCorsOrigin(raw: string | undefined): string | string[] {
  const value = raw ?? 'http://localhost:5173';
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : parts[0]!;
}

export const env = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  corsOrigin: parseCorsOrigin(process.env['CORS_ORIGIN']),
  isDev: (process.env['NODE_ENV'] ?? 'development') === 'development',
  /** Anthropic API key for the chatbot. Optional — chatbot endpoints
   *  return a 400 with a clear message if not configured. */
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
};
