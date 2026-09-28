import { describe, expect, test } from "bun:test";
import { distanceToTarget, isOneLetterApart, isWord, solve, STARTS, TARGET } from "./words";

describe("isOneLetterApart", () => {
  test("accepts exactly one changed letter", () => {
    expect(isOneLetterApart("duct", "duck")).toBe(true);
    expect(isOneLetterApart("pool", "poop")).toBe(true);
  });

  test("rejects zero, two or more changes and different lengths", () => {
    expect(isOneLetterApart("poop", "poop")).toBe(false);
    expect(isOneLetterApart("duct", "dock")).toBe(false);
    expect(isOneLetterApart("duct", "zzzz")).toBe(false);
    expect(isOneLetterApart("poop", "poops")).toBe(false);
  });
});

describe("dictionary", () => {
  test("the target is a word at distance 0", () => {
    expect(TARGET).toBe("poop");
    expect(isWord(TARGET)).toBe(true);
    expect(distanceToTarget(TARGET)).toBe(0);
  });

  test("unknown words are not words and are infinitely far", () => {
    expect(isWord("zzzz")).toBe(false);
    expect(distanceToTarget("zzzz")).toBe(Infinity);
  });
});

describe("start words", () => {
  test("are unique valid words at least 5 steps from the target", () => {
    expect(new Set(STARTS).size).toBe(STARTS.length);
    for (const s of STARTS) {
      expect(isWord(s)).toBe(true);
      expect(distanceToTarget(s)).toBeGreaterThanOrEqual(5);
    }
  });

  test("cover more than two years of puzzles", () => {
    expect(STARTS.length).toBeGreaterThan(365 * 2);
  });
});

describe("solve", () => {
  test("finds a shortest path of valid one-letter steps", () => {
    const { best, count } = solve("duct");
    expect(best[0]).toBe("duct");
    expect(best.at(-1)).toBe(TARGET);
    expect(best.length - 1).toBe(distanceToTarget("duct"));
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < best.length; i++) {
      expect(isWord(best[i]!)).toBe(true);
      expect(isOneLetterApart(best[i - 1]!, best[i]!)).toBe(true);
    }
  });

  test("the target itself is a zero-step path", () => {
    expect(solve(TARGET)).toEqual({ count: 1, best: [TARGET] });
  });

  test("a word one step away has a single path", () => {
    expect(solve("pool")).toEqual({ count: 1, best: ["pool", "poop"] });
  });

  test("every start word is solvable in exactly its distance", () => {
    for (const s of STARTS.slice(0, 50)) {
      expect(solve(s).best.length - 1).toBe(distanceToTarget(s));
    }
  });
});
