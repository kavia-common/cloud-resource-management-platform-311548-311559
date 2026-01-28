import { getPool } from '../pool';

export interface DbUserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
}

// PUBLIC_INTERFACE
export async function getUserByEmail(email: string): Promise<DbUserRow | null> {
  /** Load a user row by email (CITEXT in DB ensures case-insensitive uniqueness). */
  const { rows } = await getPool().query<DbUserRow>(
    `SELECT id, email, password_hash, full_name, is_active, is_super_admin, created_at, updated_at
     FROM public.users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

// PUBLIC_INTERFACE
export async function getUserById(id: string): Promise<DbUserRow | null> {
  /** Load a user row by ID. */
  const { rows } = await getPool().query<DbUserRow>(
    `SELECT id, email, password_hash, full_name, is_active, is_super_admin, created_at, updated_at
     FROM public.users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// PUBLIC_INTERFACE
export async function createUser(params: {
  email: string;
  passwordHash: string;
  fullName?: string;
}): Promise<Pick<DbUserRow, 'id' | 'email' | 'full_name' | 'is_active' | 'is_super_admin'>> {
  /** Create a new user. Throws on duplicate emails (unique constraint). */
  const { rows } = await getPool().query(
    `INSERT INTO public.users (email, password_hash, full_name, is_active, is_super_admin)
     VALUES ($1, $2, $3, TRUE, FALSE)
     RETURNING id, email, full_name, is_active, is_super_admin`,
    [params.email, params.passwordHash, params.fullName ?? null]
  );

  return rows[0];
}
