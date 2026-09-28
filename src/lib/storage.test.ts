import { beforeEach, describe, expect, test } from "bun:test";
import { currentStreak, hasSeenHelp, loadProgress, loadStats, markHelpSeen, recordResult, saveProgress } from "./storage";

// Bun has no DOM, so give the module a minimal in-memory localStorage.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

beforeEach(() => store.clear());

const win = (score: number) => ({ won: true, score, bucket: String(score) });
const loss = { won: false, score: 0, bucket: "X" };

describe("stats", () => {
  test("start empty", () => {
    const s = loadStats("g");
    expect(s.played).toBe(0);
    expect(s.distribution).toEqual({});
  });

  test("record wins, scores and the distribution", () => {
    recordResult("g", 1, win(2));
    const s = recordResult("g", 2, win(0));
    expect(s.played).toBe(2);
    expect(s.wins).toBe(2);
    expect(s.totalScore).toBe(2);
    expect(s.distribution).toEqual({ "0": 1, "2": 1 });
    expect(loadStats("g")).toEqual(s);
  });

  test("a day is only recorded once", () => {
    recordResult("g", 1, win(1));
    const s = recordResult("g", 1, win(1));
    expect(s.played).toBe(1);
  });

  test("streaks grow on consecutive wins and reset on a missed day or a loss", () => {
    recordResult("g", 1, win(0));
    expect(recordResult("g", 2, win(0)).streak).toBe(2);
    expect(recordResult("g", 4, win(0)).streak).toBe(1); // skipped day 3
    expect(recordResult("g", 5, loss).streak).toBe(0);
    expect(loadStats("g").bestStreak).toBe(2);
  });

  test("the current streak only counts if the last win was today or yesterday", () => {
    recordResult("g", 1, win(0));
    const s = recordResult("g", 2, win(0));
    expect(currentStreak(s, 2)).toBe(2);
    expect(currentStreak(s, 3)).toBe(2);
    expect(currentStreak(s, 4)).toBe(0);
  });

  test("games are stored separately", () => {
    recordResult("a", 1, win(0));
    expect(loadStats("b").played).toBe(0);
  });
});

describe("progress", () => {
  test("is only restored for the same day", () => {
    saveProgress("g", 3, ["duck"]);
    expect(loadProgress<string[]>("g", 3)).toEqual(["duck"]);
    expect(loadProgress("g", 4)).toBeNull();
  });
});

describe("help", () => {
  test("is remembered as seen per game", () => {
    expect(hasSeenHelp("g")).toBe(false);
    markHelpSeen("g");
    expect(hasSeenHelp("g")).toBe(true);
    expect(hasSeenHelp("other")).toBe(false);
  });

  test("storage failures don't throw", () => {
    const original = globalThis.localStorage.getItem;
    globalThis.localStorage.getItem = () => {
      throw new Error("blocked");
    };
    expect(hasSeenHelp("g")).toBe(false);
    expect(loadStats("g").played).toBe(0);
    globalThis.localStorage.getItem = original;
  });
});
