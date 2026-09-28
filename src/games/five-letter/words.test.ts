import { describe, expect, test } from "bun:test";
import { ANSWERS, evaluate, isWord } from "./words";

describe("evaluate", () => {
  test("marks exact, misplaced and missing letters", () => {
    expect(evaluate("crane", "caret")).toEqual(["correct", "present", "present", "absent", "present"]);
  });

  test("all correct when the guess is the answer", () => {
    expect(evaluate("levee", "levee")).toEqual(Array(5).fill("correct"));
  });

  test("a repeated guess letter is only marked as often as the answer has it", () => {
    // one L and one A in the answer: only the first L and the first A are marked
    expect(evaluate("llama", "vital")).toEqual(["present", "absent", "present", "absent", "absent"]);
    expect(evaluate("hello", "world")).toEqual(["absent", "absent", "absent", "correct", "present"]);
  });

  test("exact matches are claimed before misplaced ones", () => {
    // answer has one E, at the end: the E in position 1 must not steal it
    expect(evaluate("eerie", "shape")).toEqual(["absent", "absent", "absent", "absent", "correct"]);
  });

  test("repeated answer letters can all be marked present", () => {
    expect(evaluate("elves", "levee")).toEqual(["present", "present", "correct", "correct", "absent"]);
  });
});

describe("word lists", () => {
  test("every answer is a valid five-letter guess", () => {
    for (const a of ANSWERS) {
      expect(a).toMatch(/^[a-z]{5}$/);
      expect(isWord(a)).toBe(true);
    }
  });

  test("answers are unique and there are enough for years of puzzles", () => {
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
    expect(ANSWERS.length).toBeGreaterThan(365 * 3);
  });

  test("rejects non-words", () => {
    expect(isWord("qqqqq")).toBe(false);
    expect(isWord("crane")).toBe(true);
  });
});
