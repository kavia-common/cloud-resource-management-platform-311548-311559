import { getPool } from '../pool';

export interface DbCloudAccountRow {
  id: string;
  org_id: string;
  provider: 'aws' | 'azure' | 'gcp';
  name: string;
  external_id: string;
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

// PUBLIC_INTERFACE
export async function listCloudAccounts(orgId: string): Promise<DbCloudAccountRow[]> {
  /** List cloud accounts within an org. */
  const { rows } = await getPool().query<DbCloudAccountRow>(
    `SELECT id, org_id, provider, name, external_id, status, metadata, created_at, updated_at
     FROM public.cloud_accounts
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [orgId]
  );
  return rows;
}

// PUBLIC_INTERFACE
export async function createCloudAccount(params: {
  orgId: string;
  provider: 'aws' | 'azure' | 'gcp';
  name: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}): Promise<DbCloudAccountRow> {
  /** Create a cloud account within an org. */
  const { rows } = await getPool().query<DbCloudAccountRow>(
    `INSERT INTO public.cloud_accounts (org_id, provider, name, external_id, status, metadata)
     VALUES ($1, $2, $3, $4, 'active', $5::jsonb)
     RETURNING id, org_id, provider, name, external_id, status, metadata, created_at, updated_at`,
    [params.orgId, params.provider, params.name, params.externalId, JSON.stringify(params.metadata ?? {})]
  );
  return rows[0];
}
