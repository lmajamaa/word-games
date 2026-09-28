import { describe, expect, test } from "bun:test";
import { msUntilNextPuzzle, pickForDay, puzzleDate, todaysPuzzleNumber } from "./daily";

const HOUR = 60 * 60 * 1000;
/** Puzzle #1 starts at 08:00 UTC on 28 September 2026. */
const FIRST = Date.UTC(2026, 8, 28, 8);

describe("todaysPuzzleNumber", () => {
  test("is 1 for the first day, including before launch", () => {
    expect(todaysPuzzleNumber(FIRST)).toBe(1);
    expect(todaysPuzzleNumber(FIRST + 23 * HOUR)).toBe(1);
    expect(todaysPuzzleNumber(FIRST - 48 * HOUR)).toBe(1);
  });

  test("rolls over at 08:00 UTC", () => {
    expect(todaysPuzzleNumber(FIRST + 24 * HOUR - 1)).toBe(1);
    expect(todaysPuzzleNumber(FIRST + 24 * HOUR)).toBe(2);
    expect(todaysPuzzleNumber(FIRST + 365 * 24 * HOUR)).toBe(366);
  });
});

describe("msUntilNextPuzzle", () => {
  test("counts down to the next 08:00 UTC", () => {
    expect(msUntilNextPuzzle(FIRST)).toBe(24 * HOUR);
    expect(msUntilNextPuzzle(FIRST + 20 * HOUR)).toBe(4 * HOUR);
  });
});

describe("pickForDay", () => {
  test("uses puzzle N for item N-1 and wraps around", () => {
    const items = ["a", "b", "c"];
    expect(pickForDay(items, 1)).toBe("a");
    expect(pickForDay(items, 3)).toBe("c");
    expect(pickForDay(items, 4)).toBe("a");
  });
});

describe("puzzleDate", () => {
  // The format follows the runtime's locale, so only check the parts that don't vary.
  test("is the UTC date the puzzle starts on", () => {
    expect(puzzleDate(1)).toContain("2026");
    expect(puzzleDate(1)).toContain("28");
    expect(puzzleDate(5)).toContain("2");
    expect(puzzleDate(5)).not.toContain("28");
  });
});
