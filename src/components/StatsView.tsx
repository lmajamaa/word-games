import type { Stats } from "../lib/storage";

interface Props {
  stats: Stats;
  /** The headline numbers, e.g. [["Wins", 3], ["Current Streak", 2]]. */
  summary: [label: string, value: string | number][];
  distributionTitle: string;
  buckets: string[];
  /** Bucket to highlight (today's result). */
  highlight?: string;
}

export function StatsView({ stats, summary, distributionTitle, buckets, highlight }: Props) {
  const max = Math.max(1, ...buckets.map(b => stats.distribution[b] ?? 0));
  return (
    <div className="stats">
      <div className="stats-summary">
        {summary.map(([label, value]) => (
          <div key={label}>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
      <h3>{distributionTitle}</h3>
      <div className="histogram">
        {buckets.map(b => {
          const n = stats.distribution[b] ?? 0;
          return (
            <div className="histogram-row" key={b}>
              <span className="histogram-label">{b}</span>
              <div
                className={`histogram-bar${b === highlight ? " highlight" : ""}`}
                style={{ width: `${Math.max(8, (n / max) * 100)}%` }}
              >
                {n}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
