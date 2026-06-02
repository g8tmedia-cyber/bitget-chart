/**
 * useChartData — combines initial REST fetch (useCandles) with a live WS
 * stream that incrementally updates the last bar or appends a new one.
 *
 * Returns the same shape as useCandles so the rest of the app doesn't care
 * which data path produced the bars.
 */

import { useEffect, useRef, useState } from "react";
import { CandleStream } from "../api/bitget-ws";
import type { Candle } from "../api/types";
import type { Timeframe } from "../config/timeframes";
import { getCandles } from "../api/bitget";
import type { WsStatus } from "../types";

export interface UseChartDataResult {
  data: Candle[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updatedAt: number | null;
  wsStatus: WsStatus;
}

export function useChartData(symbol: string, tf: Timeframe): UseChartDataResult {
  const [data, setData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
  const [nonce, setNonce] = useState(0);
  const reqIdRef = useRef(0);

  // --- REST initial fetch -------------------------------------------------
  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    getCandles(symbol, tf.granularity, 200)
      .then((candles) => {
        if (reqId !== reqIdRef.current) return;
        setData(candles);
        setUpdatedAt(Date.now());
        setLoading(false);
        if (candles.length === 0) {
          console.warn(
            `[useChartData] got 0 candles for ${symbol} ${tf.granularity}`,
          );
        } else {
          const first = candles[0]!;
          const last = candles[candles.length - 1]!;
          console.log(
            `[useChartData] got ${candles.length} candles for ${symbol} ${tf.granularity} (${new Date(first.time * 1000).toISOString()} → ${new Date(last.time * 1000).toISOString()})`,
          );
        }
      })
      .catch((e) => {
        if (reqId !== reqIdRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
        console.error(
          `[useChartData] ${symbol} ${tf.granularity} failed:`,
          e,
        );
      });
  }, [symbol, tf, nonce]);

  // --- WS live updates ----------------------------------------------------
  useEffect(() => {
    // Only attach WS once we have an initial snapshot — otherwise a tick
    // arriving before the REST resolves would have no last bar to update.
    if (loading) return;

    const stream = new CandleStream({
      symbol,
      channel: tf.wsChannel,
      onStatus: setWsStatus,
      onTick: (bar) => {
        setData((prev) => mergeTick(prev, bar));
        setUpdatedAt(Date.now());
      },
    });
    stream.start();
    return () => stream.stop();
  }, [symbol, tf, loading]);

  return {
    data,
    loading,
    error,
    refetch: () => setNonce((n) => n + 1),
    updatedAt,
    wsStatus,
  };
}

/**
 * Merge a WS tick into the existing data array:
 *   - if the tick's time matches the last bar → update the last bar
 *   - if the tick's time is newer            → append
 *   - if the tick's time is older (rare)     → ignore
 */
function mergeTick(prev: Candle[], bar: Candle): Candle[] {
  if (prev.length === 0) return [bar];
  const last = prev[prev.length - 1]!;
  if (bar.time === last.time) {
    // In-place update (last bar is the in-progress one)
    const next = prev.slice(0, -1);
    next.push(bar);
    return next;
  }
  if (bar.time > last.time) {
    return [...prev, bar];
  }
  return prev; // older, ignore
}
