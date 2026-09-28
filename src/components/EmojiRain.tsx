import { useState } from "react";

interface Props {
  emoji: string;
  count?: number;
}

/** One-shot celebration: emojis fall from the top of the screen once each, then vanish. */
export function EmojiRain({ emoji, count = 60 }: Props) {
  const [drops] = useState(() =>
    Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      rotate: Math.random() * 30 - 15,
      delay: Math.random() * 3000,
      duration: 2500 + Math.random() * 1000,
    })),
  );

  return (
    <div className="emoji-rain" aria-hidden="true">
      {drops.map((d, i) => (
        <span
          key={i}
          style={{
            left: `${d.left}%`,
            rotate: `${d.rotate}deg`,
            animationDelay: `${d.delay}ms`,
            animationDuration: `${d.duration}ms`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
