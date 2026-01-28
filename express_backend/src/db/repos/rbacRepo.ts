import { getPool } from '../pool';

// PUBLIC_INTERFACE
export async function getPermissionsForUserOrg(userId: string, orgId: string): Promise<string[]> {
  /** Resolve distinct permission keys for a user in a given org via roles. */
  const { rows } = await getPool().query<{ key: string }>(
    `SELECT DISTINCT p.key
     FROM public.user_roles ur
     JOIN public.role_permissions rp
       ON rp.role_id = ur.role_id AND rp.org_id = ur.org_id
     JOIN public.permissions p
       ON p.id = rp.permission_id
     WHERE ur.user_id = $1 AND ur.org_id = $2
     ORDER BY p.key ASC`,
    [userId, orgId]
  );

  return rows.map((r) => r.key);
}
