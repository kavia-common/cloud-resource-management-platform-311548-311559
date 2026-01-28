import crypto from 'crypto';

// PUBLIC_INTERFACE
export function generateRefreshToken(): string {
  /** Generate a cryptographically-secure refresh token (opaque). */
  return crypto.randomBytes(64).toString('base64url');
}

// PUBLIC_INTERFACE
export function hashRefreshToken(token: string): string {
  /** Hash a refresh token for storage (never store refresh tokens in plaintext). */
  return crypto.createHash('sha256').update(token).digest('hex');
}
