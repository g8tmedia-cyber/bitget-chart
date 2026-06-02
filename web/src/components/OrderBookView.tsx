/**
 * OrderBookView — top 15 levels, three columns, spread separator in
 * the middle, red/green color coding, and a subtle cumulative-size
 * gradient on the Total column (darker = larger running total, so
 * the top of the asks / bottom of the bids visually "stack up").
 */

import { useMemo } from "react";
import { useOrderBook } from "../hooks/useOrderBook";
import type { OrderBookLevel } from "../api/bitget";

export interface OrderBookViewProps {
  symbol: string;
}

export function OrderBookView({ symbol }: OrderBookViewProps) {
  const { snapshot, error, status } = useOrderBook(symbol);

  const view = useMemo(() => buildView(snapshot), [snapshot]);

  if (error && !snapshot) {
    return (
      <div className="p-3 text-xs text-red-400 font-mono break-words">
        Order book error: {error}
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="p-3 text-xs text-zinc-500">Loading order book…</div>
    );
  }

  const maxTotal = Math.max(
    view.maxAskTotal,
    view.maxBidTotal,
    0.000001,
  );

  return (
    <div className="flex flex-col h-full text-[11px] font-mono tabular-nums">
      {/* Column header */}
      <div className="grid grid-cols-[1fr_1fr_1fr] px-3 py-1.5 text-zinc-500 uppercase text-[10px] tracking-wider">
        <span>Price</span>
        <span className="text-right">Quantity (BTC)</span>
        <span className="text-right">Total (BTC)</span>
      </div>

      {/* Asks — rendered in REVERSE so the closest ask sits just above
          the spread, with cheaper asks above it. */}
      <div className="flex-1 overflow-auto flex flex-col-reverse">
        {view.asks.map((row, i) => (
          <Row
            key={`a-${row.price}-${i}`}
            side="ask"
            row={row}
            cumTotal={view.askCumTotals[i] ?? 0}
            maxTotal={maxTotal}
          />
        ))}
      </div>

      {/* Spread separator */}
      <div className="px-3 py-1.5 flex items-center justify-between border-y border-zinc-800 bg-zinc-900/30">
        <span className="text-zinc-100 text-sm font-semibold">
          {view.spreadPrice?.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          }) ?? "—"}
        </span>
        <span className="text-zinc-500 text-[10px]">
          spread {view.spread != null ? view.spread.toFixed(2) : "—"}
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-auto">
        {view.bids.map((row, i) => (
          <Row
            key={`b-${row.price}-${i}`}
            side="bid"
            row={row}
            cumTotal={view.bidCumTotals[i] ?? 0}
            maxTotal={maxTotal}
          />
        ))}
      </div>

      <div className="px-3 py-1 text-[10px] text-zinc-600 text-right border-t border-zinc-800">
        {status === "open" ? "live" : status}
      </div>
    </div>
  );
}

interface RowProps {
  side: "ask" | "bid";
  row: OrderBookLevel;
  cumTotal: number;
  maxTotal: number;
}

function Row({ side, row, cumTotal, maxTotal }: RowProps) {
  const isAsk = side === "ask";
  const ratio = Math.min(cumTotal / maxTotal, 1);
  return (
    <div className="relative grid grid-cols-[1fr_1fr_1fr] px-3 py-0.5">
      {/* Cumulative-size gradient bar on the Total column (right side).
          Wider + darker as cumulative size grows. */}
      <div
        aria-hidden
        className={[
          "absolute inset-y-0 right-0 pointer-events-none",
          isAsk ? "bg-red-500/15" : "bg-emerald-500/15",
        ].join(" ")}
        style={{ width: `${ratio * 100}%` }}
      />
      <span className={["relative", isAsk ? "text-red-400" : "text-emerald-400"].join(" ")}>
        {row.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      <span className="relative text-right text-zinc-300">
        {row.size.toFixed(4)}
      </span>
      <span className="relative text-right text-zinc-200">
        {cumTotal.toFixed(4)}
      </span>
    </div>
  );
}

interface BookView {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  askCumTotals: number[];
  bidCumTotals: number[];
  maxAskTotal: number;
  maxBidTotal: number;
  spreadPrice: number | null;
  spread: number | null;
}

function buildView(snap: { asks: OrderBookLevel[]; bids: OrderBookLevel[] } | null): BookView {
  if (!snap) {
    return {
      asks: [],
      bids: [],
      askCumTotals: [],
      bidCumTotals: [],
      maxAskTotal: 0,
      maxBidTotal: 0,
      spreadPrice: null,
      spread: null,
    };
  }
  const asks = snap.asks.slice(0, 15);
  const bids = snap.bids.slice(0, 15);
  const askCumTotals: number[] = [];
  let acc = 0;
  for (const a of asks) {
    acc += a.size;
    askCumTotals.push(acc);
  }
  const bidCumTotals: number[] = [];
  acc = 0;
  for (const b of bids) {
    acc += b.size;
    bidCumTotals.push(acc);
  }
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const spreadPrice = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  return {
    asks,
    bids,
    askCumTotals,
    bidCumTotals,
    maxAskTotal: askCumTotals[askCumTotals.length - 1] ?? 0,
    maxBidTotal: bidCumTotals[bidCumTotals.length - 1] ?? 0,
    spreadPrice,
    spread,
  };
}
