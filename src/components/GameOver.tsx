import { useState, type ReactNode } from "react";
import { useCountdown } from "../lib/hooks";

interface Props {
  children: ReactNode;
  shareText: string;
}

/** Result summary with "Copy results" and a countdown to the next puzzle. */
export function GameOver({ children, shareText }: Props) {
  const countdown = useCountdown();
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="game-over">
      <div>{children}</div>
      <button className="primary" onClick={copy}>
        {copied === "ok" ? "Copied!" : copied === "fail" ? "Couldn't copy" : "Copy results"}
      </button>
      <div className="countdown">
        Next puzzle in <b>{countdown}</b>
      </div>
    </div>
  );
}
