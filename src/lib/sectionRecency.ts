/**
 * Select sections by the blueprint's fixed reading of recency: the newest
 * persisted `updated_at` value in each section. Sections without a timestamp
 * retain their declared default order behind timestamped sections.
 */
export function selectVisibleSections<T>(
  pool: T[],
  updatedAtOf: (item: T) => string | null | undefined,
  limit = 4,
): T[] {
  return pool
    .map((item, index) => {
      const value = updatedAtOf(item);
      const parsed = value ? Date.parse(value) : Number.NaN;
      return {
        item,
        index,
        timestamp: Number.isFinite(parsed) ? parsed : null,
      };
    })
    .sort((a, b) => {
      if (a.timestamp !== null && b.timestamp !== null) {
        return b.timestamp - a.timestamp || a.index - b.index;
      }
      if (a.timestamp !== null) return -1;
      if (b.timestamp !== null) return 1;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map(({ item }) => item);
}
