# word-games

Daily word games as a static site (Bun + React). In the UI each game is shown as an icon, not a name:

- **💩** (`poop`): get from today's start word to **POOP** by changing one letter at a time, in as few steps as possible.
- **🟩🟨⬛** (`five-letter`): guess the five-letter word in six tries.
- **500** (`500`): guess the five-letter word in eight tries, but each guess only tells you how many letters are green, yellow and red, not which ones. Tap letters to keep notes.

The IDs in brackets are used everywhere: source folders, routes and saved data (localStorage keys `word-games:<game>:<what>`).

```bash
bun install
bun dev            # dev server with hot reload
bun run build      # static site -> dist/ (deploy anywhere; asset paths are relative)
bun run words      # regenerate src/data/*.json word lists
bun run typecheck
bun test
```

Routes are hash based (`#/poop`, `#/five-letter`, `#/500`), so no server rewrites are needed. Add `?day=N` to preview any puzzle; preview mode doesn't save progress or stats.

## How the word lists are made

`scripts/build-words.ts` builds everything from public sources (cached in `scripts/.cache`):

| Source | Used for |
| --- | --- |
| [ENABLE](https://github.com/dolph/dictionary) word list | what counts as a word |
| Norvig's [`count_1w.txt`](https://norvig.com/ngrams/) (Google Web Trillion Word Corpus counts) | how common a word is |
| [first names and surnames](https://github.com/dominictarr/random-name) | keeping names out of daily puzzles |

**💩 word ladder**
1. Dictionary: the 4-letter words that appear in both ENABLE and `count_1w`, plus an allowlist of modern words (blog, wiki, …) and minus a blocklist of slurs and profanity.
2. BFS from POOP. Only the connected component is kept, and each word stores its distance, which is the par for a puzzle.
3. Start words: the 2000 most frequent reachable words that are at least 5 steps from POOP and aren't names, shuffled with a fixed seed.

**Five-letter game**: every 5-letter ENABLE word is a valid guess. Answers are the 2300 most frequent 5-letter words, excluding names and simple plurals and past tenses.

**500 game**: the same valid guesses. Answers are the five-letter answers without Q, J, X or Z, shuffled with a different seed so the two games don't share a word on the same day.

Puzzle *N* uses `list[(N - 1) % length]`. The day rolls over at 08:00 UTC (see `src/lib/daily.ts`).

## Layout

```
src/
  App.tsx              game registry + tabs; add a game here
  lib/                 daily puzzle number, localStorage stats/progress, hooks
  components/          Keyboard, TileRow, Modal, StatsView, GameOver (shared)
  games/poop/          word graph, shortest-path solver, UI
  games/five-letter/   scoring (handles repeated letters), UI
  games/500/           green/yellow/red counts, letter notes, UI
  data/                generated word lists
scripts/build-words.ts word-list pipeline
```
