/**
 * TopBar — ticker selector row across the top of the page.
 *
 * Mirrors the reference layout:
 *   [icon] [SYMBOL ▼ ★]  [Last price]  [Mark] [Index] [24h High]
 *   [Low] [24h Vol BTC] [24h Vol USDT] [Funding/Countdown]
 *
 * `Perpetual` is the contract-type sub-label.
 * Dropdown caret (▼) and star (★) are placeholders for the symbol
 * picker and watchlist — they don't do anything yet.
 */

import type { Ticker } from "../api/types";

export interface TopBarProps {
  symbol: string;
  ticker: Ticker | null;
}

export function TopBar({ symbol, ticker }: TopBarProps) {
  const change = ticker?.change24hPct ?? 0;
  const positive = change >= 0;
  const changeText = `${positive ? "+" : ""}${change.toFixed(2)}%`;
  const changeAbs = ticker ? Math.abs(ticker.lastPrice - ticker.open24h) : 0;
  const changeAbsText = changeAbs.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

  return (
    <header className="px-4 sm:px-6 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-x-5 gap-y-2">
      {/* --- Symbol cluster: icon + SYMBOL + dropdown + star + Perpetual --- */}
      <div className="flex items-center gap-2">
        <BitcoinIcon />
        <div className="flex items-center gap-1.5">
          <span className="text-base font-semibold text-zinc-100">{symbol}</span>
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Switch symbol"
            aria-label="Switch symbol"
          >
            <ChevronDownIcon />
          </button>
          <button
            type="button"
            className="text-orange-400 hover:text-orange-300 transition-colors"
            title="Add to watchlist"
            aria-label="Add to watchlist"
          >
            <StarIcon />
          </button>
        </div>
        <span className="text-zinc-500 text-xs">Perpetual</span>
      </div>

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

function BitcoinIcon() {
  return (
    <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-zinc-950 font-bold text-base shrink-0 leading-none">
      ₿
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6l5 5 5-5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// --- Helpers (also used in CandleLegend — duplicate; lift later) -----------

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
