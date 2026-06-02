/**
 * useOrderBook — REST snapshot + WS live updates for the top-of-book.
 *
 * Initial state: a REST `getOrderbook` call provides the snapshot.
 * Then the `OrderBookStream` (books15) replaces the local book with
 * each push (~150ms cadence for futures).
 *
 * Returns the latest snapshot, an error string if the REST fetch
 * failed, and the live WS connection status.
 */

import { useEffect, useState } from "react";
import { getOrderbook, type OrderBookSnapshot } from "../api/bitget";
import { OrderBookStream } from "../api/orderbook-ws";
import type { WsStatus } from "../types";

export interface UseOrderBookResult {
  snapshot: OrderBookSnapshot | null;
  error: string | null;
  status: WsStatus;
}

export function useOrderBook(symbol: string): UseOrderBookResult {
  const [snapshot, setSnapshot] = useState<OrderBookSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WsStatus>("idle");

  // REST snapshot on mount / symbol change
  useEffect(() => {
    let cancelled = false;
    setError(null);
    getOrderbook(symbol, 15)
      .then((snap) => {
        if (cancelled) return;
        setSnapshot(snap);
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
    const stream = new OrderBookStream({
      symbol,
      onStatus: setStatus,
      onSnapshot: (snap) => setSnapshot(snap),
    });
    stream.start();
    return () => stream.stop();
  }, [symbol]);

  return { snapshot, error, status };
}
