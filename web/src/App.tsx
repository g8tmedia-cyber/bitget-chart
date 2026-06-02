/**
 * BTCUSDT Chart — full app shell.
 *
 * Layout:
 *   - Top bar       : <TopBar> (symbol, last price, 24h stats, ticker)
 *   - Body grid     : 2 columns
 *       - Left      : <ChartPane> (chart + crosshair legend + bottom-right
 *                     scale-mode toggle + clock) with timeframe selector
 *                     below
 *       - Right     : <OrderBookPanel> (top) + <RecentTradesPanel> (bottom)
 */

import { useEffect, useState } from "react";
import { ChartPane } from "./components/ChartPane";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { RecentTradesPanel } from "./components/RecentTradesPanel";
import { TimeframeSelector } from "./components/TimeframeSelector";
import { TopBar } from "./components/TopBar";
import { useChartData } from "./hooks/useChartData";
import { useTicker } from "./hooks/useTicker";
import {
  DEFAULT_TIMEFRAME,
  timeframeByLabel,
  type Timeframe,
} from "./config/timeframes";
import type { ScaleMode } from "./components/ChartScaleMode";

const SYMBOL = "BTCUSDT";
const DEFAULT_TITLE = "BTCUSDT Chart — Bitget";

const TF_STORAGE_KEY = "btcusdt-timeframe";
const SCALE_MODE_STORAGE_KEY = "btcusdt-scale-mode";
const TZ_STORAGE_KEY = "btcusdt-tz";

const VALID_SCALE_MODES: ScaleMode[] = ["auto", "log", "percent"];

function loadInitialScaleMode(): ScaleMode {
  try {
    const saved = localStorage.getItem(SCALE_MODE_STORAGE_KEY);
    if (saved && (VALID_SCALE_MODES as string[]).includes(saved)) {
      return saved as ScaleMode;
    }
  } catch {
    // fall through
  }
  return "auto";
}

function loadInitialTimezone(): string {
  try {
    return localStorage.getItem(TZ_STORAGE_KEY) ?? "UTC";
  } catch {
    return "UTC";
  }
}

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
  const [scaleMode, setScaleMode] = useState<ScaleMode>(loadInitialScaleMode);
  const [timezone, setTimezone] = useState<string>(loadInitialTimezone);
  const state = useChartData(SYMBOL, tf);
  const { ticker } = useTicker(SYMBOL);

  useEffect(() => {
    try {
      localStorage.setItem(TF_STORAGE_KEY, tf.label);
    } catch {
      // ignore
    }
  }, [tf]);

  useEffect(() => {
    try {
      localStorage.setItem(SCALE_MODE_STORAGE_KEY, scaleMode);
    } catch {
      // ignore
    }
  }, [scaleMode]);

  useEffect(() => {
    try {
      localStorage.setItem(TZ_STORAGE_KEY, timezone);
    } catch {
      // ignore
    }
  }, [timezone]);

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
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <TopBar
        symbol={SYMBOL}
        timeframeLabel={tf.label}
        ticker={ticker}
        wsStatus={state.wsStatus}
        updatedAt={state.updatedAt}
      />
      <main className="flex-1 p-3 grid grid-cols-[1fr_280px] gap-3 min-h-0">
        <div className="flex flex-col gap-3 min-h-0">
          <div className="relative flex-1 min-h-0 rounded border border-zinc-800 bg-zinc-950">
            <ChartPane
              state={state}
              scaleMode={scaleMode}
              onScaleModeChange={setScaleMode}
              timezone={timezone}
              onTimezoneChange={setTimezone}
            />
          </div>
          <div className="flex items-center justify-center">
            <TimeframeSelector
              value={tf}
              onChange={setTf}
              disabled={state.loading && state.data.length === 0}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <OrderBookPanel />
          <RecentTradesPanel />
        </div>
      </main>
    </div>
  );
}

export default App;
