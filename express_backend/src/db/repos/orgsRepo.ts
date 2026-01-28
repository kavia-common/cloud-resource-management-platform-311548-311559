import { getPool } from '../pool';

export interface DbOrgRow {
  id: string;
  name: string;
  slug: string;
}

// PUBLIC_INTERFACE
export async function listOrgsForUser(userId: string): Promise<DbOrgRow[]> {
  /** List organizations for a user via active memberships. */
  const { rows } = await getPool().query<DbOrgRow>(
    `SELECT o.id, o.name, o.slug
     FROM public.organizations o
     JOIN public.org_memberships om ON om.org_id = o.id
     WHERE om.user_id = $1 AND om.status = 'active'
     ORDER BY o.created_at ASC`,
    [userId]
  );
  return rows;
}

// PUBLIC_INTERFACE
export async function getOrgForUserBySlug(userId: string, slug: string): Promise<DbOrgRow | null> {
  /** Get an org by slug, only if user is an active member. */
  const { rows } = await getPool().query<DbOrgRow>(
    `SELECT o.id, o.name, o.slug
     FROM public.organizations o
     JOIN public.org_memberships om ON om.org_id = o.id
     WHERE om.user_id = $1 AND om.status = 'active' AND o.slug = $2
     LIMIT 1`,
    [userId, slug]
  );
  return rows[0] || null;
}

// PUBLIC_INTERFACE
export async function getOrgForUserById(userId: string, orgId: string): Promise<DbOrgRow | null> {
  /** Get an org by id, only if user is an active member. */
  const { rows } = await getPool().query<DbOrgRow>(
    `SELECT o.id, o.name, o.slug
     FROM public.organizations o
     JOIN public.org_memberships om ON om.org_id = o.id
     WHERE om.user_id = $1 AND om.status = 'active' AND o.id = $2
     LIMIT 1`,
    [userId, orgId]
  );
  return rows[0] || null;
}
