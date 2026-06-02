/**
 * MarketTradesView — live list of recent public trades, newest first.
 * Each row: `Price | Quantity | Time`, color-coded by the taker side
 * (green for buy, red for sell).
 */

import { useTrades } from "../hooks/useTrades";
import type { PublicTrade } from "../api/bitget";

export interface MarketTradesViewProps {
  symbol: string;
}

export function MarketTradesView({ symbol }: MarketTradesViewProps) {
  const { trades, error, status } = useTrades(symbol);

  if (error && trades.length === 0) {
    return (
      <div className="p-3 text-xs text-red-400 font-mono break-words">
        Trades error: {error}
      </div>
    );
  }
  if (trades.length === 0) {
    return (
      <div className="p-3 text-xs text-zinc-500">Loading trades…</div>
    );
  }

  return (
    <div className="flex flex-col h-full text-[11px] font-mono tabular-nums">
      <div className="grid grid-cols-[1fr_1fr_1fr] px-3 py-1.5 text-zinc-500 uppercase text-[10px] tracking-wider">
        <span>Price</span>
        <span className="text-right">Quantity</span>
        <span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-auto">
        {trades.map((t) => (
          <TradeRow key={t.tradeId} trade={t} />
        ))}
      </div>
      <div className="px-3 py-1 text-[10px] text-zinc-600 text-right border-t border-zinc-800">
        {status === "open" ? "live" : status}
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: PublicTrade }) {
  const isBuy = trade.side === "buy";
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] px-3 py-0.5">
      <span className={isBuy ? "text-emerald-400" : "text-red-400"}>
        {trade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      <span className="text-right text-zinc-300">{trade.size.toFixed(4)}</span>
      <span className="text-right text-zinc-500">{formatTime(trade.ts)}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
