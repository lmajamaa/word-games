import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Keyboard } from "../../components/Keyboard";
import { TileRow } from "../../components/TileRow";
import { Modal } from "../../components/Modal";
import { StatsView } from "../../components/StatsView";
import { GameOver } from "../../components/GameOver";
import { pickForDay, puzzleDate } from "../../lib/daily";
import { usePhysicalKeyboard, useToast } from "../../lib/hooks";
import { currentStreak, hasSeenHelp, loadProgress, loadStats, markHelpSeen, recordResult, saveProgress } from "../../lib/storage";
import { evaluate } from "../five-letter/words";
import { ANSWERS, isWord, RARE_LETTERS, score, type Score } from "./words";

const GAME_ID = "500";
const LENGTH = 5;
const MAX_GUESSES = 8;
// Losses only count towards Played and Win %, like the five-letter game.
const BUCKETS = ["1", "2", "3", "4", "5", "6", "7", "8"];

/** The player's own notes on a letter, cycled by tapping it: none → red → yellow → green. */
type Note = "" | "red" | "yellow" | "green";
const NEXT_NOTE: Record<Note, Note> = { "": "red", red: "yellow", yellow: "green", green: "" };

interface Progress {
  guesses: string[];
  notes: Note[][];
}

type Dialog = "help" | "stats" | null;

interface Props {
  day: number;
  preview: boolean;
}

export function FiveHundred({ day, preview }: Props) {
  const answer = pickForDay(ANSWERS, day);

  const [progress, setProgress] = useState<Progress>(
    () => (!preview && loadProgress<Progress>(GAME_ID, day)) || { guesses: [], notes: [] },
  );
  const { guesses, notes } = progress;
  const [input, setInput] = useState("");
  const [toast, showToast] = useToast();
  const [stats, setStats] = useState(() => loadStats(GAME_ID));
  const [dialog, setDialog] = useState<Dialog>(() => (!preview && !hasSeenHelp(GAME_ID) ? "help" : null));
  useEffect(() => {
    if (dialog === "help") markHelpSeen(GAME_ID);
  }, [dialog]);

  const scores = useMemo(() => guesses.map(g => score(g, answer)), [guesses, answer]);
  const won = guesses.at(-1) === answer;
  const lost = !won && guesses.length === MAX_GUESSES;
  const over = won || lost;

  const update = useCallback(
    (next: Progress) => {
      setProgress(next);
      if (!preview) saveProgress(GAME_ID, day, next);
    },
    [day, preview],
  );

  const submit = useCallback(() => {
    if (input.length < LENGTH) return showToast("Not enough letters");
    if (!isWord(input)) return showToast("Not in word list");

    const next = { guesses: [...guesses, input], notes: [...notes, Array<Note>(LENGTH).fill("")] };
    update(next);
    setInput("");
    if (preview) return;
    const solved = input === answer;
    if (solved || next.guesses.length === MAX_GUESSES) {
      const n = next.guesses.length;
      setStats(recordResult(GAME_ID, day, { won: solved, score: solved ? n : 0, bucket: solved ? String(n) : "X" }));
      setTimeout(() => setDialog("stats"), 2200); // after the tile reveal (--reveal-time)
    }
  }, [input, guesses, notes, answer, day, preview, showToast, update]);

  const cycleNote = (row: number, col: number) => {
    if (over) return;
    const next = notes.map((r, i) => (i === row ? r.map((n, j) => (j === col ? NEXT_NOTE[n] : n)) : r));
    update({ guesses, notes: next });
  };

  const onKey = useCallback(
    (key: string) => {
      if (over) return;
      if (key === "Enter") submit();
      else if (key === "Backspace") setInput(i => i.slice(0, -1));
      else if (/^[a-z]$/.test(key)) setInput(i => (i.length < LENGTH ? i + key : i));
    },
    [over, submit],
  );
  usePhysicalKeyboard(onKey, dialog === null);

  // Keys only show which letters you've tried (and the ones that are never used), not results.
  const usedLetters = useMemo(() => new Set([...RARE_LETTERS, ...guesses.join("")]), [guesses]);

  const shareText = [
    `500 #${day} ${won ? guesses.length : "X"}/${MAX_GUESSES}`,
    ...scores.map(s => "🟩".repeat(s.green) + "🟨".repeat(s.yellow) + "🟥".repeat(s.red)),
    "",
    location.origin + location.pathname + location.hash,
  ].join("\n");

  return (
    <div className="game game-500">
      <div className="subheader">
        {puzzleDate(day)}
        {preview && <span className="badge">preview</span>}
      </div>

      <div className="board fixed" style={{ "--rows": MAX_GUESSES, "--cols": LENGTH + 3 } as CSSProperties}>
        {Array.from({ length: MAX_GUESSES }, (_, i) => {
          const submitted = i < guesses.length;
          const letters = submitted ? guesses[i]! : i === guesses.length && !over ? input : "";
          // Once the game is over every row shows its real colours; until then, the player's notes.
          const reveal = over && submitted ? evaluate(guesses[i]!, answer) : null;
          return (
            <div className="score-row" key={i}>
              <TileRow
                letters={letters}
                length={LENGTH}
                tileClass={j => (reveal ? reveal[j] : submitted && notes[i]?.[j] ? `note-${notes[i]![j]}` : undefined)}
                shake={i === guesses.length && !!toast}
                onTileClick={submitted && !over ? j => cycleNote(i, j) : undefined}
              />
              <Counts score={scores[i]} />
            </div>
          );
        })}
      </div>

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>

      {over ? (
        <GameOver shareText={shareText}>
          {won ? (
            <>
              Solved in <b>{guesses.length}</b> {guesses.length === 1 ? "guess" : "guesses"}!
            </>
          ) : (
            <>
              The word was <b>{answer.toUpperCase()}</b>.
            </>
          )}
        </GameOver>
      ) : (
        <Keyboard onKey={onKey} letterClass={l => (usedLetters.has(l) ? "used" : undefined)} />
      )}

      <nav className="footer">
        <button onClick={() => setDialog("stats")}>Stats</button>
        <button onClick={() => setDialog("help")}>How to play</button>
      </nav>

      {dialog === "help" && (
        <Modal title="How to play 500" onClose={() => setDialog(null)}>
          <p>Guess the five-letter word in {MAX_GUESSES} tries. After each guess you only learn how many letters are:</p>
          <p>
            <b>green</b>: right letter, right spot
            <br />
            <b>yellow</b>: in the word, wrong spot
            <br />
            <b>red</b>: not in the word
          </p>
          <div className="example">
            <div className="score-row">
              <TileRow letters="crane" length={5} />
              <Counts score={score("crane", "caret")} />
            </div>
          </div>
          <p>…but not which letters! Tap letters in your guesses to note what you've worked out (red → yellow → green).</p>
          <p>Q, J, X and Z are never in the answer. A perfect guess scores 500.</p>
          <button className="primary" onClick={() => setDialog(null)}>
            Play!
          </button>
        </Modal>
      )}

      {dialog === "stats" && (
        <Modal title="Stats" onClose={() => setDialog(null)}>
          <StatsView
            stats={stats}
            summary={[
              ["Played", stats.played],
              ["Win %", stats.played ? Math.round((stats.wins / stats.played) * 100) : 0],
              ["Current Streak", currentStreak(stats, day)],
              ["Best Streak", stats.bestStreak],
            ]}
            distributionTitle="Guess distribution"
            buckets={BUCKETS}
            highlight={won ? String(guesses.length) : undefined}
          />
        </Modal>
      )}
    </div>
  );
}

/** The three count tiles: green, yellow and red. Empty until the row has been guessed. */
function Counts({ score }: { score?: Score }) {
  return (
    <div className="counts">
      {(["green", "yellow", "red"] as const).map(c => (
        <div key={c} className={`tile count count-${c}${score ? " scored" : ""}`}>
          {score ? score[c] : ""}
        </div>
      ))}
    </div>
  );
}
