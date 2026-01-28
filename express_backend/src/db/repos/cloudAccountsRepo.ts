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
export async function getCloudAccountById(params: { orgId: string; id: string }): Promise<DbCloudAccountRow | null> {
  /** Get a single cloud account by id within an org (tenant-isolated). */
  const { rows } = await getPool().query<DbCloudAccountRow>(
    `SELECT id, org_id, provider, name, external_id, status, metadata, created_at, updated_at
     FROM public.cloud_accounts
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [params.orgId, params.id]
  );
  return rows[0] || null;
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

// PUBLIC_INTERFACE
export async function updateCloudAccount(params: {
  orgId: string;
  id: string;
  name?: string;
  status?: 'active' | 'disabled' | 'error';
  metadata?: Record<string, unknown>;
}): Promise<DbCloudAccountRow | null> {
  /** Update a cloud account within an org. Returns null if not found (tenant-isolated). */
  const { rows } = await getPool().query<DbCloudAccountRow>(
    `UPDATE public.cloud_accounts
     SET name = COALESCE($3, name),
         status = COALESCE($4, status),
         metadata = COALESCE($5::jsonb, metadata)
     WHERE org_id = $1 AND id = $2
     RETURNING id, org_id, provider, name, external_id, status, metadata, created_at, updated_at`,
    [
      params.orgId,
      params.id,
      params.name ?? null,
      params.status ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null
    ]
  );

  return rows[0] || null;
}

// PUBLIC_INTERFACE
export async function deleteCloudAccount(params: { orgId: string; id: string }): Promise<boolean> {
  /** Delete a cloud account within an org. Returns true if deleted. */
  const { rowCount } = await getPool().query(
    `DELETE FROM public.cloud_accounts
     WHERE org_id = $1 AND id = $2`,
    [params.orgId, params.id]
  );
  return (rowCount ?? 0) > 0;
}
