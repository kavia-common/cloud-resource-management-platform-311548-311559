import { getPool } from '../pool';

// PUBLIC_INTERFACE
export async function getDailyCosts(params: {
  orgId: string;
  startDate?: string;
  endDate?: string;
}): Promise<Array<{ cost_date: string; amount: string; currency: string }>> {
  /** Return daily summed costs for an org within an optional date range. */
  const values: any[] = [params.orgId];
  const where: string[] = ['org_id = $1'];

  if (params.startDate) {
    values.push(params.startDate);
    where.push(`cost_date >= $${values.length}`);
  }
  if (params.endDate) {
    values.push(params.endDate);
    where.push(`cost_date <= $${values.length}`);
  }

  const { rows } = await getPool().query<{ cost_date: string; amount: string; currency: string }>(
    `SELECT cost_date::text, SUM(amount)::text AS amount, MAX(currency) AS currency
     FROM public.costs
     WHERE ${where.join(' AND ')}
     GROUP BY cost_date
     ORDER BY cost_date ASC`,
    values
  );

  return rows;
}

// PUBLIC_INTERFACE
export async function getCostSummary(params: {
  orgId: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ amount: string; currency: string }> {
  /** Return total costs for an org within an optional date range. */
  const values: any[] = [params.orgId];
  const where: string[] = ['org_id = $1'];

  if (params.startDate) {
    values.push(params.startDate);
    where.push(`cost_date >= $${values.length}`);
  }
  if (params.endDate) {
    values.push(params.endDate);
    where.push(`cost_date <= $${values.length}`);
  }

  const { rows } = await getPool().query<{ amount: string; currency: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS amount, COALESCE(MAX(currency), 'USD') AS currency
     FROM public.costs
     WHERE ${where.join(' AND ')}`,
    values
  );

  return rows[0];
}
