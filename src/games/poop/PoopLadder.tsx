import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard } from "../../components/Keyboard";
import { TileRow } from "../../components/TileRow";
import { Modal } from "../../components/Modal";
import { StatsView } from "../../components/StatsView";
import { GameOver } from "../../components/GameOver";
import { EmojiRain } from "../../components/EmojiRain";
import { pickForDay } from "../../lib/daily";
import { usePhysicalKeyboard, useToast } from "../../lib/hooks";
import { currentStreak, hasSeenHelp, loadProgress, loadStats, markHelpSeen, recordResult, saveProgress } from "../../lib/storage";
import { distanceToTarget, isOneLetterApart, isWord, solve, STARTS, TARGET } from "./words";

const GAME_ID = "poop";
const LENGTH = TARGET.length;
const BUCKETS = ["0", "1", "2", "3", "4", "5", "6+"];
const bucketFor = (extra: number) => (extra >= 6 ? "6+" : String(extra));

type Dialog = "help" | "stats" | "yesterday" | null;

interface Props {
  day: number;
  /** Preview mode: don't save progress or stats. */
  preview: boolean;
}

export function PoopLadder({ day, preview }: Props) {
  const start = pickForDay(STARTS, day);
  const par = distanceToTarget(start);

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
  // Only rain on the winning guess itself, not when reopening a finished game.
  const [celebrate, setCelebrate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chain = [start, ...guesses];
  const last = chain.at(-1)!;
  const won = last === TARGET;
  const extra = guesses.length - par;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [guesses.length, input]);

  const submit = useCallback(() => {
    if (input.length < LENGTH) return;
    // The one-letter rule is checked first: it's the rule players break most often.
    if (!isOneLetterApart(input, last)) return showToast("Not one letter different");
    if (!isWord(input)) return showToast("Not in word list");

    const next = [...guesses, input];
    setGuesses(next);
    setInput("");
    if (input === TARGET) setCelebrate(true);
    if (preview) return;
    saveProgress(GAME_ID, day, next);
    if (input === TARGET) {
      const extraGuesses = next.length - par;
      setStats(recordResult(GAME_ID, day, { won: true, score: extraGuesses, bucket: bucketFor(extraGuesses) }));
      setTimeout(() => setDialog("stats"), 1200);
    }
  }, [input, last, guesses, day, par, preview, showToast]);

  const onKey = useCallback(
    (key: string) => {
      if (won) return;
      if (key === "Enter") submit();
      else if (key === "Backspace") setInput(i => i.slice(0, -1));
      else if (/^[a-z]$/.test(key)) setInput(i => (i.length < LENGTH ? i + key : i));
    },
    [won, submit],
  );
  usePhysicalKeyboard(onKey, dialog === null);

  const matchTarget = (word: string) => (i: number) => (word[i] === TARGET[i] ? "match" : undefined);

  const shareText = [
    `💩 #${day} ${guesses.length}/${par}`,
    ...chain.map(w => [...w].map((c, i) => (c === TARGET[i] ? "🟫" : "⬜")).join("")),
    "",
    location.origin + location.pathname,
  ].join("\n");

  return (
    <div className="game poop">
      <div className="subheader">
        #{day}: <b>{start.toUpperCase()}</b> → {TARGET.toUpperCase()}
        {preview && <span className="badge">preview</span>}
      </div>

      <div className="board" ref={scrollRef}>
        {chain.map((w, i) => (
          <TileRow key={i} letters={w} length={LENGTH} tileClass={matchTarget(w)} />
        ))}
        {!won && <TileRow letters={input} length={LENGTH} shake={!!toast} />}
      </div>

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
      {celebrate && <EmojiRain emoji="💩" />}

      {won ? (
        <GameOver shareText={shareText}>
          You used <b>{guesses.length} guesses</b>.<br />
          The best solution was <b>{par} guesses</b>
          {extra === 0 ? " — you nailed it! 🎉" : "."}
        </GameOver>
      ) : (
        <Keyboard onKey={onKey} />
      )}

      <nav className="footer">
        {day > 1 && <button onClick={() => setDialog("yesterday")}>Yesterday's answer</button>}
        <button onClick={() => setDialog("stats")}>Stats</button>
        <button onClick={() => setDialog("help")}>How to play</button>
      </nav>

      {dialog === "help" && (
        <Modal title="How to play 💩" onClose={() => setDialog(null)}>
          <p>
            Get to <b>POOP</b> in as few steps as possible.
          </p>
          <p>Each word must be exactly one letter different from the last:</p>
          <div className="example">
            <TileRow letters="pool" length={4} tileClass={matchTarget("pool")} />
            <TileRow letters="poop" length={4} tileClass={matchTarget("poop")} />
          </div>
          <p>A new starting word is chosen every day. Can you find the shortest path?</p>
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
              ["Wins", stats.wins],
              ["Avg. Extra Guesses", stats.wins ? (stats.totalScore / stats.wins).toFixed(2) : "–"],
              ["Current Streak", currentStreak(stats, day)],
              ["Best Streak", stats.bestStreak],
            ]}
            distributionTitle="Extra guesses"
            buckets={BUCKETS}
            highlight={won ? bucketFor(extra) : undefined}
          />
        </Modal>
      )}

      {dialog === "yesterday" && (
        <Modal title={`Yesterday: ${pickForDay(STARTS, day - 1).toUpperCase()}`} onClose={() => setDialog(null)}>
          <Yesterday start={pickForDay(STARTS, day - 1)} />
        </Modal>
      )}
    </div>
  );
}

function Yesterday({ start }: { start: string }) {
  const { count, best } = solve(start);
  const ways = count === 1 ? "only one way" : `${count} ways`;
  return (
    <>
      <p>
        The shortest path was <b>{best.length - 1} guesses</b>, and there {count === 1 ? "was" : "were"} {ways} to
        get there! {count === 1 ? "Here it is:" : "Here's the one with the most common words:"}
      </p>
      <div className="example">
        {best.map((w, i) => (
          <TileRow key={i} letters={w} length={LENGTH} tileClass={j => (w[j] === TARGET[j] ? "match" : undefined)} />
        ))}
      </div>
    </>
  );
}
