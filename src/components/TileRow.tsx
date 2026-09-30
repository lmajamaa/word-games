interface Props {
  letters: string;
  length: number;
  /** Class per tile index, e.g. "match" / "present" / "absent". */
  tileClass?: (index: number) => string | undefined;
  shake?: boolean;
  /** Makes the tiles tappable, e.g. for marking letters. */
  onTileClick?: (index: number) => void;
}

export function TileRow({ letters, length, tileClass, shake, onTileClick }: Props) {
  return (
    <div className={`tile-row${shake ? " shake" : ""}`}>
      {Array.from({ length }, (_, i) => (
        <div
          key={i}
          className={`tile ${letters[i] ? "filled" : ""} ${tileClass?.(i) ?? ""}${onTileClick ? " clickable" : ""}`}
          onClick={onTileClick && (() => onTileClick(i))}
        >
          {letters[i] ?? ""}
        </div>
      ))}
    </div>
  );
}
