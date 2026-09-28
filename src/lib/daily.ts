const DAY_MS = 24 * 60 * 60 * 1000;

/** New puzzles unlock at this hour (UTC) every day. */
export const RESET_HOUR_UTC = 8;

/** Puzzle #1 went live at this instant. */
const EPOCH = Date.UTC(2026, 8, 28, RESET_HOUR_UTC);

/**
 * `?day=N` in the URL previews another day's puzzle without touching stats.
 * Handy for testing.
 */
export function previewDay(): number | null {
  const raw = new URLSearchParams(location.search).get("day");
  const n = raw === null ? NaN : parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function todaysPuzzleNumber(now = Date.now()): number {
  return Math.max(1, Math.floor((now - EPOCH) / DAY_MS) + 1);
}

export function msUntilNextPuzzle(now = Date.now()): number {
  return EPOCH + todaysPuzzleNumber(now) * DAY_MS - now;
}

/**
 * The calendar date a puzzle belongs to, e.g. "Monday, 28 September 2026" (in the viewer's
 * language). A puzzle runs from 08:00 UTC to 08:00 UTC the next day, so it takes the UTC date
 * of its start.
 */
export function puzzleDate(puzzleNumber: number): string {
  return new Date(EPOCH + (puzzleNumber - 1) * DAY_MS).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Picks the item for a puzzle number, cycling once the list runs out. */
export function pickForDay<T>(items: readonly T[], puzzleNumber: number): T {
  return items[(puzzleNumber - 1) % items.length]!;
}
