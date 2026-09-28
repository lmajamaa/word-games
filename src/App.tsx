import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { PoopLadder } from "./games/poop/PoopLadder";
import { FiveLetter } from "./games/five-letter/FiveLetter";
import { previewDay, todaysPuzzleNumber } from "./lib/daily";
import "./index.css";

interface GameProps {
  day: number;
  preview: boolean;
}

/**
 * Every daily game plugs in here; the first one is the home page. Games are shown as icons
 * rather than names; `label` is what screen readers announce and `route` is the URL
 * (`#/<route>`). Saved stats are keyed by each game's own GAME_ID, not by the route.
 */
const GAMES: { route: string; label: string; icon: ReactNode; Component: ComponentType<GameProps> }[] = [
  { route: "poop", label: "Word ladder to poop", icon: <span className="tab-emoji">💩</span>, Component: PoopLadder },
  {
    route: "five-letter",
    label: "Guess the five-letter word",
    icon: (
      <span className="tab-tiles">
        <i className="correct" />
        <i className="present" />
        <i className="absent" />
      </span>
    ),
    Component: FiveLetter,
  },
];

const gameFromHash = () => GAMES.find(g => `#/${g.route}` === location.hash) ?? GAMES[0]!;

export function App() {
  const [game, setGame] = useState(gameFromHash);
  const [today, setToday] = useState(todaysPuzzleNumber);
  const preview = previewDay();

  useEffect(() => {
    const onHash = () => setGame(gameFromHash());
    // Roll over to the new puzzle if the tab stays open past the daily reset.
    const tick = setInterval(() => setToday(todaysPuzzleNumber()), 30_000);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      clearInterval(tick);
    };
  }, []);

  const day = preview ?? today;
  return (
    <div className="app">
      <header>
        <h1>Word Games</h1>
        <nav className="tabs">
          {GAMES.map(g => (
            <a
              key={g.route}
              href={`#/${g.route}`}
              className={g === game ? "active" : ""}
              aria-label={g.label}
              title={g.label}
              aria-current={g === game ? "page" : undefined}
            >
              {g.icon}
            </a>
          ))}
        </nav>
      </header>
      {/* key: remount with fresh state when the game or day changes */}
      <game.Component key={`${game.route}-${day}`} day={day} preview={preview !== null} />
    </div>
  );
}

export default App;
