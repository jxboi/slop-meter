import { useState } from 'react';
import type { Repo } from '../types';
import { TrendingUp } from 'lucide-react';
export function HealthChart({ repos }: { repos: Repo[] }) {
  const [days, setDays] = useState(30);
  const [hover, setHover] = useState<number | null>(null);
  const dates = [...new Set(repos.flatMap((r) => r.trend.map((t) => t.date)))]
    .sort()
    .filter((d) => Date.now() - Date.parse(d) <= days * 86400000 + 1000);
  const points = dates.map((date) => {
    const values = repos
      .map((r) => r.trend.filter((t) => t.date <= date).at(-1)?.value)
      .filter((v): v is number => v !== undefined);
    return { date, value: Math.round(values.reduce((a, b) => a + b, 0) / (values.length || 1)) };
  });
  const chartPoints =
    points.length > 32
      ? points.filter((_, i) => i % Math.ceil(points.length / 30) === 0 || i === points.length - 1)
      : points;
  const lo = Math.max(
      0,
      Math.floor((Math.min(...chartPoints.map((p) => p.value), 50) - 5) / 10) * 10,
    ),
    hi = Math.min(100, Math.ceil((Math.max(...chartPoints.map((p) => p.value), 70) + 5) / 10) * 10);
  const x = (i: number) => 42 + (i / Math.max(1, chartPoints.length - 1)) * 390,
    y = (v: number) => 165 - ((v - lo) / (hi - lo)) * 135;
  const coords = chartPoints.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  return (
    <section className="panel chart-panel">
      <div className="section-title">
        <h2>Codebase health</h2>
        <select
          aria-label="Health trend period"
          className="compact-select"
          value={days}
          onChange={(e) => setDays(+e.target.value)}
        >
          <option value="30">30 days</option>
          <option value="7">7 days</option>
          <option value="90">90 days</option>
        </select>
      </div>
      {!chartPoints.length ? (
        <div className="chart-empty">
          <TrendingUp />
          <p>Your first scan starts the story.</p>
        </div>
      ) : (
        <>
          <div className="chart-subline">
            <span className="legend-dot" />{' '}
            {hover !== null
              ? `${chartPoints[hover]?.value} / 100 · ${new Date(chartPoints[hover]?.date).toLocaleDateString()}`
              : 'Health score over time'}
            <span>Higher is healthier</span>
          </div>
          <svg
            className="health-chart"
            viewBox="0 0 450 205"
            role="img"
            aria-label={`Health trend from ${chartPoints[0]?.value} to ${chartPoints.at(-1)?.value} out of 100`}
            onMouseLeave={() => setHover(null)}
          >
            {[0, 1, 2, 3].map((i) => {
              const v = lo + ((hi - lo) * i) / 3;
              return (
                <g key={i}>
                  <line
                    x1="42"
                    x2="434"
                    y1={y(v)}
                    y2={y(v)}
                    stroke="#e1e5dc"
                    strokeDasharray="3 5"
                  />
                  <text x="27" y={y(v) + 4} textAnchor="end">
                    {Math.round(v)}
                  </text>
                </g>
              );
            })}
            <polyline
              points={coords}
              fill="none"
              stroke="#60764f"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {chartPoints.map((p, i) => (
              <g key={p.date} onMouseEnter={() => setHover(i)}>
                <circle
                  cx={x(i)}
                  cy={y(p.value)}
                  r={i === chartPoints.length - 1 || hover === i ? 4 : 0}
                  fill="#60764f"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cx={x(i)} cy={y(p.value)} r="12" fill="transparent" />
              </g>
            ))}
            {[0, Math.floor((chartPoints.length - 1) / 2), chartPoints.length - 1]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y="195"
                  textAnchor={i === 0 ? 'start' : i === chartPoints.length - 1 ? 'end' : 'middle'}
                >
                  {new Date(chartPoints[i].date).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </text>
              ))}
          </svg>
        </>
      )}
    </section>
  );
}
