import { useEffect, useState } from "react";
import { msUntilNextPuzzle } from "./daily";

/** Maps physical key presses to the on-screen keyboard's key names. */
export function usePhysicalKeyboard(onKey: (key: string) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter" || e.key === "Backspace") {
        e.preventDefault();
        onKey(e.key);
      } else if (/^[a-z]$/i.test(e.key)) {
        onKey(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey, enabled]);
}

export function useCountdown(): string {
  const [ms, setMs] = useState(msUntilNextPuzzle);
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** Short-lived message (e.g. "Not in word list") that clears itself. */
export function useToast(duration = 1200): [string, (msg: string) => void] {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(""), duration);
    return () => clearTimeout(id);
  }, [msg, duration]);
  return [msg, setMsg];
}
