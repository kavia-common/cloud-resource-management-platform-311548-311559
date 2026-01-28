import { getPool } from '../pool';

export interface DbRefreshTokenRow {
  id: string;
  org_id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  replaced_by_token_id: string | null;
}

// PUBLIC_INTERFACE
export async function createRefreshToken(params: {
  orgId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ id: string; expiresAt: string }> {
  /** Insert a new refresh token record (hashed). */
  const { rows } = await getPool().query<{ id: string; expires_at: string }>(
    `INSERT INTO public.refresh_tokens (org_id, user_id, token_hash, expires_at, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
     RETURNING id, expires_at`,
    [
      params.orgId,
      params.userId,
      params.tokenHash,
      params.expiresAt.toISOString(),
      params.ipAddress ?? null,
      params.userAgent ?? null
    ]
  );

  return { id: rows[0].id, expiresAt: rows[0].expires_at };
}

// PUBLIC_INTERFACE
export async function findActiveRefreshTokenByHash(tokenHash: string): Promise<DbRefreshTokenRow | null> {
  /** Find a refresh token by hash if not revoked and not expired. */
  const { rows } = await getPool().query<DbRefreshTokenRow>(
    `SELECT id, org_id, user_id, token_hash, created_at, expires_at, revoked_at, replaced_by_token_id
     FROM public.refresh_tokens
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0] || null;
}

// PUBLIC_INTERFACE
export async function revokeRefreshToken(params: { tokenId: string }): Promise<void> {
  /** Revoke a refresh token by id. */
  await getPool().query(`UPDATE public.refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [
    params.tokenId
  ]);
}

// PUBLIC_INTERFACE
export async function rotateRefreshToken(params: {
  oldTokenId: string;
  newTokenId: string;
}): Promise<void> {
  /** Mark an old refresh token revoked and link it to the new token id. */
  await getPool().query(
    `UPDATE public.refresh_tokens
     SET revoked_at = now(), replaced_by_token_id = $2
     WHERE id = $1 AND revoked_at IS NULL`,
    [params.oldTokenId, params.newTokenId]
  );
}
