import { z } from './zod';

// Keyset (cursor) pagination: stable under concurrent inserts and O(limit) per page, unlike OFFSET.
// The cursor is the id of the last row of the previous page.
export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});
export type PageQuery = z.infer<typeof pageQuery>;

// Prisma args for one page. Fetches one extra row to know whether there is a next page.
export function pageArgs({ limit, cursor }: PageQuery) {
  return {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export function toPage<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
}
