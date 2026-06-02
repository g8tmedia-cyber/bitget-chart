import type { Ticker } from "../api/types";
import type { WsStatus } from "../types";
import { LastUpdated } from "./LastUpdated";

export interface TopBarProps {
  symbol: string;
  timeframeLabel: string;
  ticker: Ticker | null;
  wsStatus: WsStatus;
  updatedAt: number | null;
}

export function TopBar({
  symbol,
  timeframeLabel,
  ticker,
  wsStatus,
  updatedAt,
}: TopBarProps) {
  const change = ticker?.change24hPct ?? 0;
  const positive = change >= 0;
  const changeText = `${positive ? "+" : ""}${change.toFixed(2)}%`;

  return (
    <header className="px-4 sm:px-6 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-x-4 gap-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-widest text-zinc-500">
          {symbol}
        </span>
        <span className="text-zinc-400 text-xs">USDT-FUTURES · Perp</span>
      </div>
      <PriceDisplay ticker={ticker} />
      <ChangeBadge value={changeText} positive={positive} />
      <div className="hidden md:flex items-center gap-4 text-xs text-zinc-400">
        <Stat label="24h High" value={ticker ? fmt(ticker.high24h) : "—"} />
        <Stat label="24h Low" value={ticker ? fmt(ticker.low24h) : "—"} />
        <Stat
          label="24h Vol"
          value={ticker ? humanVolume(ticker.quoteVolume24h) : "—"}
        />
        <Stat
          label="Funding"
          value={
            ticker
              ? `${(ticker.fundingRate * 100).toFixed(4)}%`
              : "—"
          }
        />
      </div>
      <span className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
        <LastUpdated updatedAt={updatedAt} />
        <span className="hidden sm:inline">{timeframeLabel}</span>
        <WsDot status={wsStatus} />
      </span>
    </header>
  );
}

function PriceDisplay({ ticker }: { ticker: Ticker | null }) {
  if (!ticker) {
    return (
      <span className="text-zinc-500 text-2xl font-semibold tabular-nums">
        —
      </span>
    );
  }
  return (
    <span className="text-2xl font-semibold tabular-nums">
      {fmt(ticker.lastPrice)}
    </span>
  );
}

function ChangeBadge({ value, positive }: { value: string; positive: boolean }) {
  return (
    <span
      className={[
        "px-2 py-0.5 rounded text-xs font-medium tabular-nums",
        positive
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
          : "bg-red-500/10 text-red-400 border border-red-500/30",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-zinc-500 uppercase text-[10px] tracking-wider">
        {label}
      </span>
      <span className="text-zinc-200 tabular-nums">{value}</span>
    </div>
  );
}

function WsDot({
  status,
}: {
  status: "connecting" | "open" | "closed" | "error" | "idle";
}) {
  const color =
    status === "open"
      ? "bg-emerald-400"
      : status === "connecting"
        ? "bg-amber-400 animate-pulse"
        : status === "error" || status === "closed"
          ? "bg-red-400"
          : "bg-zinc-600";
  return (
    <span
      title={`WebSocket: ${status}`}
      className={`inline-block w-2 h-2 rounded-full ${color}`}
    />
  );
}

function fmt(n: number): string {
  // Auto-precision: 2 decimals for >1000, 4 for >1, 6 for tiny
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
