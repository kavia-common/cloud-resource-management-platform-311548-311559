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
