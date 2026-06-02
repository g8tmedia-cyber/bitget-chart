/**
 * useTicker — fetch and periodically refresh the 24h ticker for a symbol.
 * Returns null while loading.
 */

import { useEffect, useState } from "react";
import { getTicker } from "../api/bitget";
import type { Ticker } from "../api/types";

const REFRESH_MS = 15_000; // tickers are cheap and update frequently

export function useTicker(symbol: string): {
  ticker: Ticker | null;
  error: string | null;
} {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const fetchOnce = () => {
      getTicker(symbol)
        .then((t) => {
          if (cancelled) return;
          setTicker(t);
          setError(null);
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (cancelled) return;
          timer = window.setTimeout(fetchOnce, REFRESH_MS);
        });
    };

    fetchOnce();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [symbol]);

  return { ticker, error };
}
