/**
 * TopBar — ticker selector row across the top of the page.
 *
 * Mirrors the reference layout:
 *   [picker]  [Last price]  [Mark] [Index] [24h High] [Low] ...
 *
 * The symbol cluster is the <SymbolPicker> — click it to open the
 * dropdown of all USDT-M Futures perpetuals.
 */

import { SymbolPicker } from "./SymbolPicker";
import type { Ticker } from "../api/types";

export interface TopBarProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  ticker: Ticker | null;
}

export function TopBar({ symbol, onSymbolChange, ticker }: TopBarProps) {
  const change = ticker?.change24hPct ?? 0;
  const positive = change >= 0;
  const changeText = `${positive ? "+" : ""}${change.toFixed(2)}%`;
  const changeAbs = ticker ? Math.abs(ticker.lastPrice - ticker.open24h) : 0;
  const changeAbsText = changeAbs.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

  return (
    <header className="px-4 sm:px-6 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-x-5 gap-y-2">
      {/* --- Symbol picker (clickable) --- */}
      <SymbolPicker symbol={symbol} onChange={onSymbolChange} />

      {/* --- Live price + 24h change stacked --- */}
      <div className="flex flex-col leading-tight">
        <span className="text-2xl font-semibold text-emerald-400 tabular-nums">
          {ticker ? fmt(ticker.lastPrice) : "—"}
        </span>
        <span
          className={[
            "text-xs font-medium tabular-nums",
            positive ? "text-emerald-400" : "text-red-400",
          ].join(" ")}
        >
          {ticker ? `-${changeAbsText} (${changeText})` : "—"}
        </span>
      </div>

      {/* --- Stat tiles --- */}
      <div className="hidden md:flex items-center gap-5 text-xs">
        <Stat label="Mark price" value={ticker ? fmt(ticker.markPrice) : "—"} />
        <Stat
          label="Index price"
          value={ticker ? fmt(ticker.indexPrice) : "—"}
          trailing={<span className="text-zinc-500">↗</span>}
        />
        <Stat label="24h high" value={ticker ? fmt(ticker.high24h) : "—"} />
        <Stat label="24h low" value={ticker ? fmt(ticker.low24h) : "—"} />
        <Stat
          label="24h quantity (BTC)"
          value={ticker ? humanVolume(ticker.baseVolume24h) : "—"}
        />
        <Stat
          label="24h total (USDT)"
          value={ticker ? humanVolume(ticker.quoteVolume24h) : "—"}
        />
        <Stat
          label="Funding rate"
          value={
            ticker
              ? `${(ticker.fundingRate * 100).toFixed(4)}%`
              : "—"
          }
          valueClassName="text-emerald-400"
        />
      </div>
    </header>
  );
}

// --- Sub-components ----------------------------------------------------------

function Stat({
  label,
  value,
  trailing,
  valueClassName = "text-zinc-200",
}: {
  label: string;
  value: string;
  trailing?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-zinc-500 uppercase text-[10px] tracking-wider">
        {label}
      </span>
      <span className={["tabular-nums", valueClassName].join(" ")}>
        {value}
        {trailing}
      </span>
    </div>
  );
}

// --- Helpers ----------------------------------------------------------------

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function humanVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}
