/**
 * OrderBookView — top 15 levels, three columns, spread separator in
 * the middle, red/green color coding, and a subtle cumulative-size
 * gradient on the Total column (darker = larger running total, so
 * the top of the asks / bottom of the bids visually "stack up").
 *
 * Grouping selector: the dropdown in the top-right picks a price
 * tick size (0.1, 1, 10, 100). When set, levels are aggregated to
 * the nearest tick — e.g. with grouping=10, only 67490, 67500,
 * 67510... appear, with each row's size being the sum across the
 * underlying levels.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useOrderBook } from "../hooks/useOrderBook";
import type { OrderBookLevel } from "../api/bitget";

const GROUPING_OPTIONS = [0.1, 1, 10, 100] as const;
type Grouping = (typeof GROUPING_OPTIONS)[number];

export interface OrderBookViewProps {
  symbol: string;
}

export function OrderBookView({ symbol }: OrderBookViewProps) {
  const { snapshot, error, status } = useOrderBook(symbol);
  const [grouping, setGrouping] = useState<Grouping>(0.1);
  const [groupingOpen, setGroupingOpen] = useState(false);
  const groupingRef = useRef<HTMLDivElement | null>(null);

  // Close grouping dropdown on outside click
  useEffect(() => {
    if (!groupingOpen) return;
    const onClick = (e: MouseEvent) => {
      if (groupingRef.current && !groupingRef.current.contains(e.target as Node)) {
        setGroupingOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [groupingOpen]);

  const view = useMemo(
    () => (snapshot ? buildView(snapshot, grouping) : null),
    [snapshot, grouping],
  );

  if (error && !snapshot) {
    return (
      <div className="p-3 text-xs text-red-400 font-mono break-words">
        Order book error: {error}
      </div>
    );
  }
  if (!snapshot || !view) {
    return (
      <div className="p-3 text-xs text-zinc-500">Loading order book…</div>
    );
  }

  const maxTotal = Math.max(view.maxAskTotal, view.maxBidTotal, 0.000001);

  return (
    <div className="flex flex-col h-full text-[11px] font-mono tabular-nums">
      {/* Column header + grouping selector */}
      <div className="flex items-center justify-between px-3 py-1.5 text-zinc-500 uppercase text-[10px] tracking-wider">
        <div className="grid grid-cols-[1fr_1fr_1fr] flex-1">
          <span>Price</span>
          <span className="text-right">Quantity (BTC)</span>
          <span className="text-right">Total (BTC)</span>
        </div>
        <div ref={groupingRef} className="relative ml-2">
          <button
            onClick={() => setGroupingOpen((o) => !o)}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 normal-case tracking-normal"
            title="Price tick grouping"
          >
            <span className="tabular-nums">{formatGrouping(grouping)}</span>
            <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6l5 5 5-5" />
            </svg>
          </button>
          {groupingOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-zinc-800 rounded shadow-lg min-w-[80px]">
              {GROUPING_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGrouping(g);
                    setGroupingOpen(false);
                  }}
                  className={[
                    "w-full text-left px-3 py-1 text-[11px] normal-case tracking-normal hover:bg-zinc-800",
                    g === grouping ? "text-zinc-100" : "text-zinc-300",
                  ].join(" ")}
                >
                  {formatGrouping(g)}
                </button>
              ))}
            </div>
          )}
        </div>
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
            grouping={grouping}
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
            grouping={grouping}
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
  grouping: Grouping;
}

function Row({ side, row, cumTotal, maxTotal, grouping }: RowProps) {
  const isAsk = side === "ask";
  const ratio = Math.min(cumTotal / maxTotal, 1);
  // For grouping=0.1 we want one decimal; for 1 / 10 / 100 we round to
  // an integer. Format the price to match the grouping's resolution.
  const priceStr =
    grouping === 0.1
      ? row.price.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : row.price.toLocaleString(undefined, { maximumFractionDigits: 0 });
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
        {priceStr}
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

function formatGrouping(g: number): string {
  if (g < 1) return g.toString();
  return g.toString();
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

function buildView(
  snap: { asks: OrderBookLevel[]; bids: OrderBookLevel[] },
  grouping: Grouping,
): BookView {
  // Aggregate the raw order book into the chosen grouping.
  // grouping=0.1 means "show every level (or round to 0.1)" — for the
  // Bitget data we receive, individual levels are already 0.1 apart
  // for BTC, so 0.1 is effectively no aggregation.
  // grouping=1 / 10 / 100: round each price to the nearest tick and
  // sum sizes within the same tick.
  const asks = aggregate(snap.asks, grouping, "asc").slice(0, 15);
  const bids = aggregate(snap.bids, grouping, "desc").slice(0, 15);
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
  const spreadPrice =
    bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
  const spread =
    bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
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

function aggregate(
  levels: OrderBookLevel[],
  grouping: number,
  dir: "asc" | "desc",
): OrderBookLevel[] {
  if (grouping === 0.1) {
    // No aggregation — just cap the list length and return.
    return levels.slice(0, 15);
  }
  // Bucket by Math.round(price / grouping) * grouping.
  // For ascending (asks) we round normally; for descending (bids) the
  // same rounding works since we just bucket by the key.
  const buckets = new Map<number, number>();
  for (const lvl of levels) {
    const key = Math.round(lvl.price / grouping) * grouping;
    buckets.set(key, (buckets.get(key) ?? 0) + lvl.size);
  }
  const keys = Array.from(buckets.keys()).sort((a, b) =>
    dir === "asc" ? a - b : b - a,
  );
  return keys.map((k) => ({ price: k, size: buckets.get(k) ?? 0 }));
}
