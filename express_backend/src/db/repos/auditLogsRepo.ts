import { getPool } from '../pool';

export interface DbAuditLogRow {
  id: string;
  org_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

// PUBLIC_INTERFACE
export async function listAuditLogs(params: {
  orgId: string;
  limit: number;
  offset: number;
}): Promise<DbAuditLogRow[]> {
  /** List audit logs for an org. */
  const { rows } = await getPool().query<DbAuditLogRow>(
    `SELECT id, org_id, actor_user_id, action, entity_type, entity_id, ip_address::text AS ip_address,
            user_agent, metadata, created_at
     FROM public.audit_logs
     WHERE org_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [params.orgId, params.limit, params.offset]
  );

  return rows;
}

// PUBLIC_INTERFACE
export async function createAuditLog(params: {
  orgId: string;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; createdAt: string }> {
  /** Create an audit log entry (org-scoped, append-only). */
  const { rows } = await getPool().query<{ id: string; created_at: string }>(
    `INSERT INTO public.audit_logs (org_id, actor_user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id, created_at`,
    [
      params.orgId,
      params.actorUserId ?? null,
      params.action,
      params.entityType ?? null,
      params.entityId ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
      JSON.stringify(params.metadata ?? {})
    ]
  );

  return { id: rows[0].id, createdAt: rows[0].created_at };
}
