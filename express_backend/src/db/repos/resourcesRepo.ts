import { getPool } from '../pool';

export interface DbResourceRow {
  id: string;
  org_id: string;
  cloud_account_id: string;
  provider: 'aws' | 'azure' | 'gcp';
  resource_type: string;
  provider_resource_id: string;
  region: string | null;
  name: string | null;
  tags: any;
  metadata: any;
  discovered_at: string;
  created_at: string;
  updated_at: string;
}

// PUBLIC_INTERFACE
export async function listResources(params: {
  orgId: string;
  provider?: 'aws' | 'azure' | 'gcp';
  cloudAccountId?: string;
  resourceType?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<DbResourceRow[]> {
  /** List resources within an org with optional filters. */

  const where: string[] = ['org_id = $1'];
  const values: any[] = [params.orgId];
  let i = 2;

  if (params.provider) {
    where.push(`provider = $${i++}`);
    values.push(params.provider);
  }
  if (params.cloudAccountId) {
    where.push(`cloud_account_id = $${i++}`);
    values.push(params.cloudAccountId);
  }
  if (params.resourceType) {
    where.push(`resource_type = $${i++}`);
    values.push(params.resourceType);
  }
  if (params.q) {
    where.push(`(name ILIKE $${i} OR provider_resource_id ILIKE $${i})`);
    values.push(`%${params.q}%`);
    i++;
  }

  values.push(params.limit);
  values.push(params.offset);

  const { rows } = await getPool().query<DbResourceRow>(
    `SELECT id, org_id, cloud_account_id, provider, resource_type, provider_resource_id,
            region, name, tags, metadata, discovered_at, created_at, updated_at
     FROM public.resources
     WHERE ${where.join(' AND ')}
     ORDER BY discovered_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    values
  );

  return rows;
}

// PUBLIC_INTERFACE
export async function getResourceById(params: { orgId: string; id: string }): Promise<DbResourceRow | null> {
  /** Get a resource by id within an org (tenant-isolated). */
  const { rows } = await getPool().query<DbResourceRow>(
    `SELECT id, org_id, cloud_account_id, provider, resource_type, provider_resource_id,
            region, name, tags, metadata, discovered_at, created_at, updated_at
     FROM public.resources
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [params.orgId, params.id]
  );
  return rows[0] || null;
}
