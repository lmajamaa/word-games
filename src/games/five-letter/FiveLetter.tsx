import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Keyboard } from "../../components/Keyboard";
import { TileRow } from "../../components/TileRow";
import { Modal } from "../../components/Modal";
import { StatsView } from "../../components/StatsView";
import { GameOver } from "../../components/GameOver";
import { pickForDay, puzzleDate } from "../../lib/daily";
import { usePhysicalKeyboard, useToast } from "../../lib/hooks";
import { currentStreak, hasSeenHelp, loadProgress, loadStats, markHelpSeen, recordResult, saveProgress } from "../../lib/storage";
import { ANSWERS, evaluate, isWord, type Mark } from "./words";

const GAME_ID = "five-letter";
const LENGTH = 5;
const MAX_GUESSES = 6;
// Like the original, losses only count towards Played and Win %, not the distribution.
const BUCKETS = ["1", "2", "3", "4", "5", "6"];
const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };
const EMOJI: Record<Mark, string> = { correct: "🟩", present: "🟨", absent: "⬛" };

type Dialog = "help" | "stats" | null;

interface Props {
  day: number;
  preview: boolean;
}

export function FiveLetter({ day, preview }: Props) {
  const answer = pickForDay(ANSWERS, day);

  const [guesses, setGuesses] = useState<string[]>(
    () => (!preview && loadProgress<string[]>(GAME_ID, day)) || [],
  );
  const [input, setInput] = useState("");
  const [toast, showToast] = useToast();
  const [stats, setStats] = useState(() => loadStats(GAME_ID));
  const [dialog, setDialog] = useState<Dialog>(() => (!preview && !hasSeenHelp(GAME_ID) ? "help" : null));
  useEffect(() => {
    if (dialog === "help") markHelpSeen(GAME_ID);
  }, [dialog]);

  const marks = useMemo(() => guesses.map(g => evaluate(g, answer)), [guesses, answer]);
  const won = guesses.at(-1) === answer;
  const lost = !won && guesses.length === MAX_GUESSES;
  const over = won || lost;

  // Best known status per letter, for colouring the keyboard.
  const letterMarks = useMemo(() => {
    const best = new Map<string, Mark>();
    guesses.forEach((g, gi) =>
      [...g].forEach((l, i) => {
        const m = marks[gi]![i]!;
        if (!best.has(l) || RANK[m] > RANK[best.get(l)!]) best.set(l, m);
      }),
    );
    return best;
  }, [guesses, marks]);

  const submit = useCallback(() => {
    if (input.length < LENGTH) return showToast("Not enough letters");
    if (!isWord(input)) return showToast("Not in word list");

    const next = [...guesses, input];
    setGuesses(next);
    setInput("");
    if (preview) return;
    saveProgress(GAME_ID, day, next);
    const solved = input === answer;
    if (solved || next.length === MAX_GUESSES) {
      setStats(
        recordResult(GAME_ID, day, {
          won: solved,
          score: solved ? next.length : 0,
          bucket: solved ? String(next.length) : "X",
        }),
      );
      setTimeout(() => setDialog("stats"), 2200); // after the tile reveal (--reveal-time)
    }
  }, [input, guesses, answer, day, preview, showToast]);

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

  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (i < guesses.length) return { letters: guesses[i]!, marks: marks[i] };
    if (i === guesses.length && !over) return { letters: input, current: true };
    return { letters: "" };
  });

  const shareText = [
    `🟩🟨⬛ #${day} ${won ? guesses.length : "X"}/${MAX_GUESSES}`,
    ...marks.map(m => m.map(x => EMOJI[x]).join("")),
    "",
    location.origin + location.pathname + location.hash,
  ].join("\n");

  return (
    <div className="game five-letter">
      <div className="subheader">
        {puzzleDate(day)}
        {preview && <span className="badge">preview</span>}
      </div>

      <div className="board fixed" style={{ "--rows": MAX_GUESSES, "--cols": LENGTH } as CSSProperties}>
        {rows.map((r, i) => (
          <TileRow
            key={i}
            letters={r.letters}
            length={LENGTH}
            tileClass={r.marks ? j => r.marks![j] : undefined}
            shake={r.current && !!toast}
          />
        ))}
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
        <Keyboard onKey={onKey} letterClass={l => letterMarks.get(l)} />
      )}

      <nav className="footer">
        <button onClick={() => setDialog("stats")}>Stats</button>
        <button onClick={() => setDialog("help")}>How to play</button>
      </nav>

      {dialog === "help" && (
        <Modal title="How to play 🟩🟨⬛" onClose={() => setDialog(null)}>
          <p>Guess the five-letter word in {MAX_GUESSES} tries. After each guess the tiles show how close you were:</p>
          <div className="example">
            <TileRow letters="crane" length={5} tileClass={i => evaluate("crane", "caret")[i]} />
          </div>
          <p>
            <b>Green</b>: right letter, right spot. <b>Yellow</b>: in the word, wrong spot. <b>Grey</b>: not in the
            word.
          </p>
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
