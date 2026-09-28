/**
 * Per-game persistence in localStorage. Every access is guarded because storage can be
 * unavailable (private windows, blocked site data) — the games still work, just unsaved.
 */

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: storage unavailable or full
  }
}

const key = (gameId: string, what: string) => `word-games:${gameId}:${what}`;

// ---------- in-progress game ----------

export function loadProgress<T>(gameId: string, day: number): T | null {
  const saved = read<{ day: number; state: T }>(key(gameId, "progress"));
  return saved?.day === day ? saved.state : null;
}

export function saveProgress<T>(gameId: string, day: number, state: T) {
  write(key(gameId, "progress"), { day, state });
}

// ---------- first visit ----------

/** Whether the intro help has been shown for a game, so it only opens once. */
export function hasSeenHelp(gameId: string): boolean {
  return read<boolean>(key(gameId, "seenHelp")) === true;
}

export function markHelpSeen(gameId: string) {
  write(key(gameId, "seenHelp"), true);
}

// ---------- stats ----------

export interface Stats {
  played: number;
  wins: number;
  /** Sum of all scores; each game defines what a score means. */
  totalScore: number;
  streak: number;
  bestStreak: number;
  lastPlayedDay: number | null;
  lastWonDay: number | null;
  /** Histogram of results, keyed by bucket label ("0", "1", …, "6+", "X"). */
  distribution: Record<string, number>;
}

const emptyStats = (): Stats => ({
  played: 0,
  wins: 0,
  totalScore: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayedDay: null,
  lastWonDay: null,
  distribution: {},
});

export function loadStats(gameId: string): Stats {
  return { ...emptyStats(), ...read<Stats>(key(gameId, "stats")) };
}

/** A streak only counts as current if the last win was today or yesterday. */
export function currentStreak(stats: Stats, today: number): number {
  return stats.lastWonDay !== null && stats.lastWonDay >= today - 1 ? stats.streak : 0;
}

export function recordResult(
  gameId: string,
  day: number,
  result: { won: boolean; score: number; bucket: string },
): Stats {
  const stats = loadStats(gameId);
  if (stats.lastPlayedDay === day) return stats; // already recorded

  stats.played += 1;
  stats.lastPlayedDay = day;
  stats.totalScore += result.score;
  stats.distribution[result.bucket] = (stats.distribution[result.bucket] ?? 0) + 1;
  if (result.won) {
    stats.wins += 1;
    stats.streak = stats.lastWonDay === day - 1 ? stats.streak + 1 : 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    stats.lastWonDay = day;
  } else {
    stats.streak = 0;
  }
  write(key(gameId, "stats"), stats);
  return stats;
}
