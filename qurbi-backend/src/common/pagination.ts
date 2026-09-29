// Shared by every admin list endpoint (orders, users, farm-verifications,
// livestock, species-requests, breed-requests) so they all page the same
// way: same param names, same default/max page size, same response envelope.
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageQuery {
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ResolvedPage {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function resolvePage(query: PageQuery): ResolvedPage {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit =
    query.limit && query.limit > 0
      ? Math.min(query.limit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

// Controllers receive page/limit as query strings; this is the one place
// "" / non-numeric / absent all collapse to undefined (→ resolvePage's
// defaults), rather than each controller re-deriving that.
export function toPageInt(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
