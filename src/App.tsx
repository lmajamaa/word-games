import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { PoopLadder } from "./games/poop/PoopLadder";
import { FiveLetter } from "./games/five-letter/FiveLetter";
import { FiveHundred } from "./games/500/FiveHundred";
import { previewDay, todaysPuzzleNumber } from "./lib/daily";
import "./index.css";

interface GameProps {
  day: number;
  preview: boolean;
}

const REPO_URL = "https://github.com/lmajamaa/word-games";

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
  {
    route: "500",
    label: "Find the word from green, yellow and red counts",
    icon: (
      <span className="tab-tiles digits">
        <i className="correct">5</i>
        <i className="present">0</i>
        <i className="wrong">0</i>
      </span>
    ),
    Component: FiveHundred,
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
        <nav className="tabs" aria-label="Games">
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
        <a
          className="github-link"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Source code on GitHub"
          title="Source code on GitHub"
        >
          <GitHubIcon />
        </a>
      </header>
      {/* key: remount with fresh state when the game or day changes */}
      <game.Component key={`${game.route}-${day}`} day={day} preview={preview !== null} />
    </div>
  );
}

/** GitHub's "mark" logo (Octicons, MIT). */
function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="24" height="24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
      />
    </svg>
  );
}

export default App;
