import { getPool } from '../pool';

export interface DbRecommendationRow {
  id: string;
  org_id: string;
  resource_id: string;
  recommendation_type: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  potential_savings: string;
  currency: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

// PUBLIC_INTERFACE
export async function listRecommendations(params: {
  orgId: string;
  status?: string;
  limit: number;
  offset: number;
}): Promise<DbRecommendationRow[]> {
  /** List recommendations within an org. */
  const values: any[] = [params.orgId];
  const where: string[] = ['org_id = $1'];

  if (params.status) {
    values.push(params.status);
    where.push(`status = $${values.length}`);
  }

  values.push(params.limit);
  values.push(params.offset);

  const { rows } = await getPool().query<DbRecommendationRow>(
    `SELECT id, org_id, resource_id, recommendation_type, severity, title, description, status,
            potential_savings::text AS potential_savings, currency, metadata, created_at, updated_at
     FROM public.recommendations
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return rows;
}

// PUBLIC_INTERFACE
export async function getRecommendationById(params: { orgId: string; id: string }): Promise<DbRecommendationRow | null> {
  /** Get a recommendation by id within an org (tenant-isolated). */
  const { rows } = await getPool().query<DbRecommendationRow>(
    `SELECT id, org_id, resource_id, recommendation_type, severity, title, description, status,
            potential_savings::text AS potential_savings, currency, metadata, created_at, updated_at
     FROM public.recommendations
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [params.orgId, params.id]
  );

  return rows[0] || null;
}

// PUBLIC_INTERFACE
export async function updateRecommendationStatus(params: {
  orgId: string;
  id: string;
  status: 'open' | 'snoozed' | 'applied' | 'dismissed';
}): Promise<DbRecommendationRow | null> {
  /** Update a recommendation status within an org (tenant-isolated). */
  const { rows } = await getPool().query<DbRecommendationRow>(
    `UPDATE public.recommendations
     SET status = $3
     WHERE org_id = $1 AND id = $2
     RETURNING id, org_id, resource_id, recommendation_type, severity, title, description, status,
               potential_savings::text AS potential_savings, currency, metadata, created_at, updated_at`,
    [params.orgId, params.id, params.status]
  );

  return rows[0] || null;
}
