const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

interface Props {
  onKey: (key: string) => void;
  /** Extra class for a letter key, e.g. its five-letter game evaluation. */
  letterClass?: (letter: string) => string | undefined;
}

/** On-screen keyboard laid out like Wordle's: full-width rows, the middle row inset by half a key. */
export function Keyboard({ onKey, letterClass }: Props) {
  return (
    <div className="keyboard">
      {ROWS.map((row, i) => (
        <div className="keyboard-row" key={row}>
          {i === 1 && <div className="key-spacer" />}
          {i === 2 && (
            <button className="key wide" onClick={() => onKey("Enter")}>
              Enter
            </button>
          )}
          {[...row].map(l => (
            <button key={l} className={`key ${letterClass?.(l) ?? ""}`} onClick={() => onKey(l)}>
              {l}
            </button>
          ))}
          {i === 2 && (
            <button className="key wide" onClick={() => onKey("Backspace")} aria-label="Backspace">
              <BackspaceIcon />
            </button>
          )}
          {i === 1 && <div className="key-spacer" />}
        </div>
      ))}
    </div>
  );
}

function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z"
      />
    </svg>
  );
}
