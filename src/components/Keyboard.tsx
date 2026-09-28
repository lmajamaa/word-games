const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

interface Props {
  onKey: (key: string) => void;
  /** Extra class for a letter key, e.g. its five-letter game evaluation. */
  letterClass?: (letter: string) => string | undefined;
}

export function Keyboard({ onKey, letterClass }: Props) {
  return (
    <div className="keyboard">
      {ROWS.map((row, i) => (
        <div className="keyboard-row" key={row}>
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
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
