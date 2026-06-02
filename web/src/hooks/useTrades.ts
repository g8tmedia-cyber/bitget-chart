/**
 * useTrades — REST snapshot + WS live updates for recent public trades.
 *
 * Initial state: a REST `getRecentTrades` call returns the most recent
 * fills. Subsequent WS `trade` pushes are prepended to the list,
 * deduplicated by tradeId, capped at MAX_TRADES rows.
 *
 * Speed: WS pushes are batched into a single state update per
 * animation frame. For high-volume symbols (BTCUSDT can fire 50–100
 * trades/sec), this caps React re-renders at the display's refresh
 * rate (~60fps) instead of one re-render per WS push.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getRecentTrades, type PublicTrade } from "../api/bitget";
import { TradesStream } from "../api/trades-ws";
import type { WsStatus } from "../types";

const MAX_TRADES = 50;

export interface UseTradesResult {
  trades: PublicTrade[];
  error: string | null;
  status: WsStatus;
}

export function useTrades(symbol: string): UseTradesResult {
  const [trades, setTrades] = useState<PublicTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WsStatus>("idle");
  // Keep a ref to the current trade IDs so we can dedupe WS pushes.
  const seenIdsRef = useRef<Set<string>>(new Set());

  // rAF batching buffer. WS pushes append here, and a single
  // requestAnimationFrame flushes them to state. flushScheduledRef
  // guards against scheduling multiple flushes within the same
  // animation frame.
  const pendingRef = useRef<PublicTrade[]>([]);
  const flushScheduledRef = useRef(false);

  const flush = useCallback(() => {
    flushScheduledRef.current = false;
    if (pendingRef.current.length === 0) return;
    const incoming = pendingRef.current;
    pendingRef.current = [];
    setTrades((prev) => {
      const seen = seenIdsRef.current;
      // WS payload is newest-first; filter to ones we haven't seen.
      const fresh: PublicTrade[] = [];
      for (const t of incoming) {
        if (seen.has(t.tradeId)) continue;
        seen.add(t.tradeId);
        fresh.push(t);
        if (prev.length + fresh.length >= MAX_TRADES * 2) break;
      }
      if (fresh.length === 0) return prev;
      const next = [...fresh, ...prev];
      // Trim + prune the seen set so it doesn't grow forever.
      if (next.length > MAX_TRADES) {
        next.length = MAX_TRADES;
        const keep = new Set(next.map((t) => t.tradeId));
        seen.clear();
        for (const id of keep) seen.add(id);
      }
      return next;
    });
  }, []);

  // REST snapshot on mount / symbol change
  useEffect(() => {
    let cancelled = false;
    setError(null);
    seenIdsRef.current = new Set();
    getRecentTrades(symbol, MAX_TRADES)
      .then((rows) => {
        if (cancelled) return;
        // API returns newest first; cap and seed the seen set.
        const capped = rows.slice(0, MAX_TRADES);
        setTrades(capped);
        for (const t of capped) seenIdsRef.current.add(t.tradeId);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // WS live updates
  useEffect(() => {
    const stream = new TradesStream({
      symbol,
      onStatus: setStatus,
      onTrades: (newRows) => {
        if (newRows.length === 0) return;
        // Append to the rAF buffer; the next animation frame will
        // flush everything in one state update.
        pendingRef.current.push(...newRows);
        if (!flushScheduledRef.current) {
          flushScheduledRef.current = true;
          requestAnimationFrame(flush);
        }
      },
    });
    stream.start();
    return () => stream.stop();
  }, [symbol, flush]);

  return { trades, error, status };
}
