import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL || null,
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  pipelineMode: process.env.REDIS_URL ? (process.env.PIPELINE_MODE ?? 'queue') : 'inline',
};

export const isAiEnabled = () => Boolean(env.geminiApiKey);
