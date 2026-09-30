import { describe, expect, test } from "bun:test";
import { ANSWERS, isWord, RARE_LETTERS, score } from "./words";

describe("score", () => {
  test("counts green, yellow and red letters", () => {
    expect(score("crane", "caret")).toEqual({ green: 1, yellow: 3, red: 1 });
    expect(score("round", "round")).toEqual({ green: 5, yellow: 0, red: 0 });
    expect(score("fghij", "round")).toEqual({ green: 0, yellow: 0, red: 5 });
  });

  test("repeated letters only count as often as the answer has them", () => {
    expect(score("llama", "vital")).toEqual({ green: 0, yellow: 2, red: 3 });
  });

  test("always adds up to five", () => {
    for (const [g, a] of [["elves", "levee"], ["eerie", "shape"], ["hello", "world"]] as const) {
      const s = score(g, a);
      expect(s.green + s.yellow + s.red).toBe(5);
    }
  });
});

describe("answers", () => {
  test("are unique valid words without rare letters", () => {
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
    for (const a of ANSWERS) {
      expect(isWord(a)).toBe(true);
      for (const l of RARE_LETTERS) expect(a).not.toContain(l);
    }
  });

  test("cover several years of puzzles", () => {
    expect(ANSWERS.length).toBeGreaterThan(365 * 3);
  });
});
