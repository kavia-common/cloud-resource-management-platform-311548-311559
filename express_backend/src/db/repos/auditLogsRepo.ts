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
