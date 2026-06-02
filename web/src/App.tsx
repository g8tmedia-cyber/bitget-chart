/**
 * BTCUSDT Chart — full app shell.
 */

import { useEffect, useState } from "react";
import { ChartPane } from "./components/ChartPane";
import { TimeframeSelector } from "./components/TimeframeSelector";
import { TopBar } from "./components/TopBar";
import { useChartData } from "./hooks/useChartData";
import { useTicker } from "./hooks/useTicker";
import {
  DEFAULT_TIMEFRAME,
  timeframeByLabel,
  type Timeframe,
} from "./config/timeframes";

const SYMBOL = "BTCUSDT";
const DEFAULT_TITLE = "BTCUSDT Chart — Bitget";
const LOG_STORAGE_KEY = "btcusdt-log";
const TF_STORAGE_KEY = "btcusdt-timeframe";

function App() {
  const [tf, setTf] = useState<Timeframe>(() => {
    try {
      const saved = localStorage.getItem(TF_STORAGE_KEY);
      if (saved) return timeframeByLabel(saved) ?? DEFAULT_TIMEFRAME;
    } catch {
      // fall through
    }
    return DEFAULT_TIMEFRAME;
  });
  const [logScale, setLogScale] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOG_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const state = useChartData(SYMBOL, tf);
  const { ticker } = useTicker(SYMBOL);

  useEffect(() => {
    try {
      localStorage.setItem(TF_STORAGE_KEY, tf.label);
    } catch {
      // ignore (private mode, etc.)
    }
  }, [tf]);

  useEffect(() => {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, logScale ? "1" : "0");
    } catch {
      // ignore (private mode, etc.)
    }
  }, [logScale]);

  // Live document title — `$PRICE · SYMBOL` so the price is visible
  // in the browser tab even when the page is in the background.
  useEffect(() => {
    if (!ticker) {
      document.title = DEFAULT_TITLE;
      return;
    }
    const price = ticker.lastPrice.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
    document.title = `$${price}  ·  ${SYMBOL}`;
  }, [ticker]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <TopBar
        symbol={SYMBOL}
        timeframeLabel={tf.label}
        ticker={ticker}
        wsStatus={state.wsStatus}
        updatedAt={state.updatedAt}
      />
      <main className="flex-1 p-3 flex flex-col gap-3 min-h-0">
        <div className="relative w-full flex-1 min-h-[60vh] rounded border border-zinc-800 bg-zinc-950">
          <ChartPane
            state={state}
            logScale={logScale}
            onLogChange={setLogScale}
          />
        </div>
        <div className="flex items-center justify-center">
          <TimeframeSelector
            value={tf}
            onChange={setTf}
            disabled={state.loading && state.data.length === 0}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
