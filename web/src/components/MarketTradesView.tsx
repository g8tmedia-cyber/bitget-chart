/**
 * MarketTradesView — live list of recent public trades, newest first.
 *
 * Speed: bypasses React reconciliation entirely. The trades list is
 * a plain `<div>` that we mutate via direct DOM calls (prepend +
 * removeChild), batched into a single rAF flush per frame. No diff,
 * no virtual DOM, no commit phase. Only the WS status and error are
 * React state (they update rarely).
 *
 * Each row is created once via `createTradeRow` and stored as a real
 * DOM node with a `data-trade-id` attribute so we can dedupe across
 * reconnects and trim by removing the last child.
 *
 * Layout: `Price | Quantity | Time`, color-coded by taker side
 * (green for buy, red for sell).
 */

import { useEffect, useRef, useState } from "react";
import { getRecentTrades, type PublicTrade } from "../api/bitget";
import { TradesStream } from "../api/trades-ws";
import type { WsStatus } from "../types";

const MAX_TRADES = 50;

export interface MarketTradesViewProps {
  symbol: string;
}

export function MarketTradesView({ symbol }: MarketTradesViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WsStatus>("idle");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Direct-DOM state (intentionally NOT React state — that's the
    // whole point of this component).
    const seenIds = new Set<string>();
    let pending: PublicTrade[] = [];
    let flushScheduled = false;

    const flush = () => {
      flushScheduled = false;
      if (pending.length === 0) return;
      const incoming = pending;
      pending = [];

      // Build a fragment of new rows in one DOM batch.
      const fragment = document.createDocumentFragment();
      let added = 0;
      for (const t of incoming) {
        if (seenIds.has(t.tradeId)) continue;
        seenIds.add(t.tradeId);
        fragment.appendChild(createTradeRow(t));
        added++;
        if (seenIds.size > MAX_TRADES * 2) break;
      }
      if (added === 0) return;

      // Prepend is O(reflow of children.length nodes) — for 50 rows
      // this is faster than React's diff + commit by an order of
      // magnitude.
      container.prepend(fragment);

      // Trim to MAX_TRADES from the bottom.
      while (container.children.length > MAX_TRADES) {
        const last = container.lastElementChild;
        if (!last) break;
        const id = last.getAttribute("data-trade-id");
        if (id) seenIds.delete(id);
        container.removeChild(last);
      }
    };

    const scheduleFlush = () => {
      if (flushScheduled) return;
      flushScheduled = true;
      requestAnimationFrame(flush);
    };

    let cancelled = false;
    setError(null);

    // REST snapshot — populate the container once on mount / symbol
    // change.
    getRecentTrades(symbol, MAX_TRADES)
      .then((rows) => {
        if (cancelled) return;
        const fragment = document.createDocumentFragment();
        for (const trade of rows) {
          if (seenIds.has(trade.tradeId)) continue;
          seenIds.add(trade.tradeId);
          fragment.appendChild(createTradeRow(trade));
        }
        // Replace the container's contents in one shot.
        container.replaceChildren(fragment);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });

    // WS live updates — append to a buffer, rAF flushes it.
    const stream = new TradesStream({
      symbol,
      onStatus: setStatus,
      onTrades: (newRows) => {
        if (newRows.length === 0) return;
        pending.push(...newRows);
        scheduleFlush();
      },
    });
    stream.start();

    return () => {
      cancelled = true;
      stream.stop();
    };
  }, [symbol]);

  if (error) {
    return (
      <div className="p-3 text-xs text-red-400 font-mono break-words">
        Trades error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-[11px] font-mono tabular-nums">
      <div className="grid grid-cols-[1fr_1fr_1fr] px-3 py-1.5 text-zinc-500 uppercase text-[10px] tracking-wider">
        <span>Price</span>
        <span className="text-right">Quantity</span>
        <span className="text-right">Time</span>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto" />
      <div className="px-3 py-1 text-[10px] text-zinc-600 text-right border-t border-zinc-800">
        {status === "open" ? "live" : status}
      </div>
    </div>
  );
}

function createTradeRow(trade: PublicTrade): HTMLElement {
  const isBuy = trade.side === "buy";
  const row = document.createElement("div");
  row.className = "grid grid-cols-[1fr_1fr_1fr] px-3 py-0.5";
  row.setAttribute("data-trade-id", trade.tradeId);

  const price = document.createElement("span");
  price.className = isBuy ? "text-emerald-400" : "text-red-400";
  price.textContent = trade.price.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  row.appendChild(price);

  const size = document.createElement("span");
  size.className = "text-right text-zinc-300";
  size.textContent = trade.size.toFixed(4);
  row.appendChild(size);

  const time = document.createElement("span");
  time.className = "text-right text-zinc-500";
  time.textContent = formatTime(trade.ts);
  row.appendChild(time);

  return row;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
