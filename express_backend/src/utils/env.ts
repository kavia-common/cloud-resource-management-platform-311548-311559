import dotenv from 'dotenv';

dotenv.config();

function readBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function readInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface DbConfigResolved {
  mode: 'url' | 'parts';
  connectionString: string;
  portHint?: number;
  isDefaulted: boolean;
}

// PUBLIC_INTERFACE
export function resolveDbConfig(): DbConfigResolved {
  /** Resolve PostgreSQL connection configuration from environment variables. */

  const nodeEnv = process.env.NODE_ENV || 'development';

  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRESQL_URL ||
    '';

  if (url) {
    return { mode: 'url', connectionString: url, isDefaulted: false };
  }

  // Development-friendly defaults. In production, require DATABASE_URL.
  if (nodeEnv !== 'development') {
    required('DATABASE_URL', undefined);
  }

  const host = process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost';
  const port = readInt(process.env.POSTGRES_PORT || process.env.PGPORT, 5001);
  const db = process.env.POSTGRES_DB || process.env.PGDATABASE || 'myapp';
  const user = process.env.POSTGRES_USER || process.env.PGUSER || 'appuser';
  const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || 'dbuser123';

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(password);

  return {
    mode: 'parts',
    connectionString: `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${db}`,
    portHint: port,
    isDefaulted: true
  };
}

const nodeEnv = process.env.NODE_ENV || 'development';

// Never ship a hard-coded JWT secret in non-dev environments.
const jwtAccessSecret =
  process.env.JWT_ACCESS_SECRET ||
  (nodeEnv === 'development' ? 'dev_access_secret_change_me' : required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET));

// PUBLIC_INTERFACE
export const env = {
  /** Resolved runtime environment configuration for the API server. */

  nodeEnv,
  host: process.env.HOST || '0.0.0.0',
  port: readInt(process.env.PORT, 3001),
  trustProxy: readBool(process.env.TRUST_PROXY, true),

  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  allowedHeaders: (process.env.ALLOWED_HEADERS || 'Content-Type,Authorization')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  allowedMethods: (process.env.ALLOWED_METHODS || 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  corsMaxAge: readInt(process.env.CORS_MAX_AGE, 3600),

  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  rateLimitWindowMs: readInt(process.env.RATE_LIMIT_WINDOW_S, 60) * 1000,
  rateLimitMax: readInt(process.env.RATE_LIMIT_MAX, 100),

  jwtAccessSecret,
  accessTokenTtlSeconds: readInt(process.env.ACCESS_TOKEN_TTL_S, 900),

  refreshTokenTtlDays: readInt(process.env.REFRESH_TOKEN_TTL_DAYS, 30),

  db: resolveDbConfig()
};
