/**
 * CandleLegend — chart-top OHLC label, mirrors the reference layout.
 *
 *   <SYMBOL> perpetual last price · <TF> · <Exchange>   O.. H.. L.. C..  +X.XX (+0.0X%)
 *
 * - The prefix (`BTCUSDT perpetual last price · 1H · Bitget`) is static
 *   (no live dot, no Vol, no time in this slot).
 * - `O` is plain; `H` is green; `L` is red; `C` is colored by the bar's
 *   close-vs-open direction.
 * - The trailing `+X.XX (+X.XX%)` is the **bar's** close-vs-open delta
 *   (not 24h), colored by sign.
 * - When the crosshair hovers a different bar, the four values and
 *   the trailing change switch to that bar.
 */

import type { Candle } from "../api/types";

export interface CandleLegendProps {
  /** Currently hovered bar (null when crosshair is off-canvas) */
  hovered: Candle | null;
  /** Most recent bar, shown as the "current" price when nothing is hovered */
  latest: Candle | null;
  symbol: string;
  exchange: string;
  timeframeLabel: string;
}

export function CandleLegend({
  hovered,
  latest,
  symbol,
  exchange,
  timeframeLabel,
}: CandleLegendProps) {
  const c = hovered ?? latest;
  if (!c) {
    return (
      <div className="text-zinc-500 text-xs font-mono px-3 py-1.5 rounded bg-zinc-900/70 border border-zinc-800">
        —
      </div>
    );
  }

  const up = c.close >= c.open;
  const closeColor = up ? "text-emerald-400" : "text-red-400";
  const changeAbs = c.close - c.open;
  const changePct = c.open !== 0 ? (changeAbs / c.open) * 100 : 0;
  const changeSign = changeAbs >= 0 ? "+" : "";

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded bg-zinc-900/70 border border-zinc-800 tabular-nums whitespace-nowrap">
      <span className="text-zinc-100 font-semibold">{symbol}</span>
      <span className="text-zinc-500">perpetual last price</span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-400">{timeframeLabel}</span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-400">{exchange}</span>

      <span className="text-zinc-600 ml-1">O</span>
      <span className="text-zinc-100">{fmt(c.open)}</span>
      <span className="text-zinc-600 ml-1">H</span>
      <span className="text-emerald-400">{fmt(c.high)}</span>
      <span className="text-zinc-600 ml-1">L</span>
      <span className="text-red-400">{fmt(c.low)}</span>
      <span className="text-zinc-600 ml-1">C</span>
      <span className={closeColor}>{fmt(c.close)}</span>

      <span className={closeColor}>
        {changeSign}
        {changeAbs.toFixed(1)} ({changeSign}
        {changePct.toFixed(2)}%)
      </span>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
