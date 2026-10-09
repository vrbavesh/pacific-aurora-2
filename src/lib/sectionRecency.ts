/**
 * Tracks which world sections were accessed most recently so the home screen
 * can show at most 4 sections, "the most recently accessed ones", as the
 * specification requires. Access is recorded when an entity inside a section is
 * opened; unseen sections keep the default order (characters, places, items,
 * then custom sections by position). Falls back gracefully when storage is
 * unavailable.
 */

const ACCESS_PREFIX = "pacific_aurora_section_access_";

type SectionAccess = Record<string, number>;

function readAccess(worldId: string): SectionAccess {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ACCESS_PREFIX + worldId);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SectionAccess) : {};
  } catch {
    return {};
  }
}

export function touchSection(worldId: string, sectionKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const access = readAccess(worldId);
    access[sectionKey] = Date.now();
    window.localStorage.setItem(ACCESS_PREFIX + worldId, JSON.stringify(access));
  } catch {
    /* storage unavailable: the default order keeps working */
  }
}

export function selectVisibleSections<T>(
  worldId: string,
  pool: T[],
  keyOf: (item: T) => string,
  limit = 4,
): T[] {
  if (pool.length <= limit) return pool;
  const access = readAccess(worldId);
  const scored = pool.map((item, index) => {
    const stamp = access[keyOf(item)];
    return { item, score: typeof stamp === "number" && stamp > 0 ? stamp : -index - 1 };
  });
  const visibleKeys = new Set(
    [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => keyOf(entry.item)),
  );
  return pool.filter((item) => visibleKeys.has(keyOf(item)));
}
