/**
 * CandleLegend — OHLC overlay that follows the crosshair.
 * Subscribes to the chart's crosshair moves via the onCrosshair prop.
 */

import type { Candle } from "../api/types";

export interface CandleLegendProps {
  /** Currently hovered bar (null when crosshair is off-canvas) */
  hovered: Candle | null;
  /** Most recent bar, shown as the "current" price when nothing is hovered */
  latest: Candle | null;
  /** When true, indicates this is the latest in-progress bar (color it differently) */
  isLive?: boolean;
}

export function CandleLegend({ hovered, latest, isLive }: CandleLegendProps) {
  const c = hovered ?? latest;
  if (!c) {
    return (
      <div className="text-zinc-500 text-xs font-mono px-3 py-1.5 rounded bg-zinc-900/70 border border-zinc-800">
        —
      </div>
    );
  }
  const up = c.close >= c.open;
  const color = up ? "text-emerald-400" : "text-red-400";
  const time = new Date(c.time * 1000);
  const timeStr = time.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center gap-3 text-xs font-mono px-3 py-1.5 rounded bg-zinc-900/70 border border-zinc-800">
      {hovered == null && isLive && (
        <span className="text-emerald-400 animate-pulse">●</span>
      )}
      <span className="text-zinc-500">{timeStr}</span>
      <span className="text-zinc-400">O</span>
      <span className="text-zinc-100 tabular-nums">{fmt(c.open)}</span>
      <span className="text-zinc-400">H</span>
      <span className="text-emerald-400 tabular-nums">{fmt(c.high)}</span>
      <span className="text-zinc-400">L</span>
      <span className="text-red-400 tabular-nums">{fmt(c.low)}</span>
      <span className="text-zinc-400">C</span>
      <span className={`tabular-nums ${color}`}>{fmt(c.close)}</span>
      <span className="text-zinc-400">Vol</span>
      <span className="text-zinc-200 tabular-nums">{humanVol(c.volume)}</span>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function humanVol(n: number): string {
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(4);
}
