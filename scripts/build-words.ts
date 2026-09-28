/**
 * Generates the word data for both games from public sources.
 *
 *   bun run words
 *
 * Sources (downloaded once into scripts/.cache):
 *   - ENABLE word list (public domain Scrabble-style dictionary) — what counts as a word.
 *   - Peter Norvig's count_1w.txt (Google Web Trillion Word Corpus, 333k most frequent
 *     words with counts) — how common a word is.
 *
 * Poop ladder pipeline:
 *   1. dictionary  = 4-letter words in BOTH ENABLE and count_1w (+ allowlist, − blocklist)
 *   2. BFS from POOP over "differs by one letter" edges; keep only the reachable
 *      component and remember each word's distance to POOP.
 *   3. start words = the most frequent non-name words that are ≥ MIN_START_DISTANCE steps away,
 *      shuffled with a fixed seed. Puzzle N uses starts[N % starts.length].
 *
 * Five-letter game pipeline:
 *   - guesses = every 5-letter ENABLE word (− blocklist)
 *   - answers = the most frequent 5-letter non-name words, minus simple plurals / past tenses,
 *     shuffled with a fixed seed.
 */
import { mkdir, exists } from "node:fs/promises";
import { join } from "node:path";

const CACHE = join(import.meta.dir, ".cache");
const OUT = join(import.meta.dir, "..", "src", "data");

const SOURCES = {
  enable: "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt",
  counts: "https://norvig.com/ngrams/count_1w.txt",
  firstNames: "https://raw.githubusercontent.com/dominictarr/random-name/master/first-names.txt",
  surnames: "https://raw.githubusercontent.com/dominictarr/random-name/master/names.txt",
};

const POOP_TARGET = "poop";
const POOP_START_POOL = 2000; // only the N most frequent words may be a daily start word
const MIN_START_DISTANCE = 5;
const FIVE_LETTER_ANSWER_POOL = 2300;
const SEED = 0x5eed;

// Common words missing from ENABLE (which predates the web).
const ALLOW_LIST = [
  "blog", "boop", "wiki", "spam", "tech", "apps", "vids", "mega", "nano", "noob", "grok", "vlog",
  "chai", "goth", "glam", "cred", "emoji", "blogs", "vlogs",
];

// Never accept or show these. ENABLE is fairly clean, but a few slurs/profanity slip through.
const BLOCK_LIST = [
  "fuck", "shit", "cunt", "twat", "dick", "cock", "fags", "dyke", "kike", "spic", "wank", "slut",
  "rape", "porn", "jism", "jizz", "tits", "coon", "gook", "paki", "homo", "whore", "bitch", "nigga",
  "fucks", "shits", "cunts", "dicks", "cocks", "sluts", "raped", "rapes", "porno", "pussy", "penis",
  "sperm", "semen", "dildo", "horny", "negro", "fagot", "spick", "kikes", "gooks", "coons", "dykes",
  "wanks", "twats", "prick",
];

async function fetchCached(name: string, url: string): Promise<string> {
  const path = join(CACHE, name);
  if (await exists(path)) return Bun.file(path).text();
  console.log(`Downloading ${url}`);
  // norvig.com serves an HTML challenge page to clients without a browser-like UA
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (word-list builder)" } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const text = await res.text();
  await Bun.write(path, text);
  return text;
}

/**
 * Mulberry32: a tiny seeded pseudo-random number generator (Tommy Ettinger, public domain).
 *
 * Returns a function that yields numbers in [0, 1), like Math.random(), but the sequence is
 * fully determined by `seed`. That's the point: the daily puzzle order comes from shuffling
 * with a fixed SEED, so re-running this script gives the same order and past puzzles don't
 * change. Math.random() can't be seeded, so it can't be used here.
 *
 * The state is a single 32-bit integer, so the sequence repeats after 2^32 calls — far more
 * than a shuffle of a few thousand words needs. It's fast and statistically decent, but not
 * cryptographically secure; don't use it for anything secret.
 */
function mulberry32(seed: number) {
  return () => {
    // Advance the state by a fixed odd constant (a "Weyl sequence"); `| 0` keeps it 32-bit.
    seed = (seed + 0x6d2b79f5) | 0;
    // Scramble the state with xor-shifts and 32-bit multiplies so consecutive outputs
    // don't look related, even though the state itself just counts up.
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    // `>>> 0` reads the result as an unsigned 32-bit integer; dividing by 2^32 maps it to [0, 1).
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function neighbors(word: string, dict: Set<string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    for (let c = 97; c <= 122; c++) {
      const ch = String.fromCharCode(c);
      if (ch === word[i]) continue;
      const w = word.slice(0, i) + ch + word.slice(i + 1);
      if (dict.has(w)) out.push(w);
    }
  }
  return out;
}

await mkdir(CACHE, { recursive: true });
await mkdir(OUT, { recursive: true });

const enable = new Set(
  (await fetchCached("enable1.txt", SOURCES.enable)).split(/\r?\n/).map(w => w.trim().toLowerCase()),
);
const counts = new Map<string, number>();
for (const line of (await fetchCached("count_1w.txt", SOURCES.counts)).split(/\r?\n/)) {
  const [w, c] = line.split("\t");
  if (w && c) counts.set(w, Number(c));
}
// count_1w is case-folded, so "jane" or "kirk" look common purely as names. Such words
// stay valid guesses but are kept out of the start/answer pools.
const names = new Set(
  [
    ...(await fetchCached("first-names.txt", SOURCES.firstNames)).split(/\r?\n/),
    ...(await fetchCached("surnames.txt", SOURCES.surnames)).split(/\r?\n/),
  ].map(n => n.trim().toLowerCase()),
);
const isCommonWord = (w: string) => !names.has(w) && !ALLOW_LIST.includes(w);
const blocked = new Set(BLOCK_LIST);
const isWord = (w: string) => !blocked.has(w) && (enable.has(w) || ALLOW_LIST.includes(w));
const byFrequency = (a: string, b: string) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0);

// ---------- Poop ladder ----------
const dict4 = new Set([...counts.keys()].filter(w => /^[a-z]{4}$/.test(w) && isWord(w)));
if (!dict4.has(POOP_TARGET)) throw new Error("target missing from dictionary");

const dist = new Map<string, number>([[POOP_TARGET, 0]]);
const queue = [POOP_TARGET];
for (let i = 0; i < queue.length; i++) {
  const w = queue[i]!;
  for (const n of neighbors(w, dict4)) {
    if (!dist.has(n)) {
      dist.set(n, dist.get(w)! + 1);
      queue.push(n);
    }
  }
}

const reachable = [...dist.keys()].sort(byFrequency);
const startPool = reachable
  .slice(0, POOP_START_POOL)
  .filter(w => dist.get(w)! >= MIN_START_DISTANCE && isCommonWord(w));
const poopStarts = shuffled(startPool, SEED);

// Compact CSV-ish lines "word,distance,count" keep the bundle small and readable.
const poop = {
  target: POOP_TARGET,
  words: reachable.map(w => `${w},${dist.get(w)},${counts.get(w)}`).join("\n"),
  starts: poopStarts.join(","),
};
await Bun.write(join(OUT, "poop.json"), JSON.stringify(poop));

// ---------- Five-letter game ----------
const guesses = [...enable].filter(w => /^[a-z]{5}$/.test(w) && isWord(w));
for (const w of ALLOW_LIST) if (w.length === 5 && !guesses.includes(w)) guesses.push(w);
guesses.sort();
// Stems are shorter than 5 letters, so check them against the full dictionary.
const isInflection = (w: string) =>
  (w.endsWith("s") && !w.endsWith("ss") && enable.has(w.slice(0, -1))) ||
  (w.endsWith("es") && enable.has(w.slice(0, -2))) ||
  (w.endsWith("ed") && (enable.has(w.slice(0, -2)) || enable.has(w.slice(0, -1))));
const answerPool = guesses
  .filter(w => counts.has(w) && !isInflection(w) && isCommonWord(w))
  .sort(byFrequency)
  .slice(0, FIVE_LETTER_ANSWER_POOL);
const fiveLetter = {
  guesses: guesses.join(","),
  answers: shuffled(answerPool, SEED).join(","),
};
await Bun.write(join(OUT, "five-letter.json"), JSON.stringify(fiveLetter));

const hist: Record<number, number> = {};
for (const d of dist.values()) hist[d] = (hist[d] ?? 0) + 1;
console.log(`Poop ladder: ${dict4.size} dictionary words, ${reachable.length} reachable from ${POOP_TARGET}`);
console.log(`        distance histogram`, hist);
console.log(`        ${poopStarts.length} start words (${Math.floor(poopStarts.length / 365)}+ years)`);
console.log(`Five-letter: ${guesses.length} valid guesses, ${answerPool.length} answers`);
