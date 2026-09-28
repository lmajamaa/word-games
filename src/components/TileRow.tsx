interface Props {
  letters: string;
  length: number;
  /** Class per tile index, e.g. "match" / "present" / "absent". */
  tileClass?: (index: number) => string | undefined;
  shake?: boolean;
}

export function TileRow({ letters, length, tileClass, shake }: Props) {
  return (
    <div className={`tile-row${shake ? " shake" : ""}`}>
      {Array.from({ length }, (_, i) => (
        <div key={i} className={`tile ${letters[i] ? "filled" : ""} ${tileClass?.(i) ?? ""}`}>
          {letters[i] ?? ""}
        </div>
      ))}
    </div>
  );
}
