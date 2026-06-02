/**
 * BTCUSDT Chart — full app shell.
 *
 * Layout (top to bottom):
 *   - Top bar      : <TopBar> symbol + price + 24h stats
 *   - Body grid    : 2 columns
 *       - Left     : chart with timeframe picker in its top header
 *       - Right    : <SidePanel> (Order book / Market trades tabs)
 *
 * Document title: live price from the trade stream, throttled to
 * ~10Hz so we don't thrash the title bar. Format: `12345.67 | BTCUSDT`.
 */

import { useEffect, useState } from "react";
import { ChartPane } from "./components/ChartPane";
import { SidePanel } from "./components/SidePanel";
import { TopBar } from "./components/TopBar";
import { useChartData } from "./hooks/useChartData";
import { useTicker } from "./hooks/useTicker";
import { TradesStream } from "./api/trades-ws";
import {
  DEFAULT_TIMEFRAME,
  timeframeByLabel,
  type Timeframe,
} from "./config/timeframes";
import type { ScaleMode } from "./components/ChartScaleMode";

const SYMBOL = "BTCUSDT";
const EXCHANGE = "Bitget";
const DEFAULT_TITLE = `${SYMBOL} | Bitget`;

const TF_STORAGE_KEY = "btcusdt-timeframe";
const SCALE_MODE_STORAGE_KEY = "btcusdt-scale-mode";
const TZ_ID_STORAGE_KEY = "btcusdt-tz-id";
const DEFAULT_TZ_ID = "UTC";

// Throttle window for browser-tab title updates. 100ms = 10Hz, well
// below human perception but enough to avoid document.title churn.
const TITLE_THROTTLE_MS = 100;

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

function loadInitialTzId(): string {
  try {
    const saved = localStorage.getItem(TZ_ID_STORAGE_KEY);
    if (saved && saved.length > 0) return saved;
  } catch {
    // fall through
  }
  return DEFAULT_TZ_ID;
}

function formatTitle(price: number): string {
  const formatted = price.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return `${formatted} | ${SYMBOL}`;
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
  const [tzId, setTzId] = useState<string>(loadInitialTzId);
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
      localStorage.setItem(TZ_ID_STORAGE_KEY, tzId);
    } catch {
      // ignore
    }
  }, [tzId]);

  // Live document title — `price | symbol`. Subscribes directly to
  // the trade stream (each trade is a price tick) and throttles
  // document.title writes to TITLE_THROTTLE_MS. No App re-renders
  // are triggered; the title is written as a side effect.
  useEffect(() => {
    document.title = DEFAULT_TITLE;

    let timer: number | null = null;
    let pendingPrice: number | null = null;
    let lastUpdate = 0;

    const stream = new TradesStream({
      symbol: SYMBOL,
      onTrades: (trades) => {
        if (trades.length === 0) return;
        const price = trades[0].price;
        pendingPrice = price;
        const now = performance.now();
        const elapsed = now - lastUpdate;
        if (elapsed >= TITLE_THROTTLE_MS) {
          document.title = formatTitle(price);
          lastUpdate = now;
          pendingPrice = null;
        } else if (timer == null) {
          timer = window.setTimeout(() => {
            timer = null;
            if (pendingPrice != null) {
              document.title = formatTitle(pendingPrice);
              lastUpdate = performance.now();
              pendingPrice = null;
            }
          }, TITLE_THROTTLE_MS - elapsed);
        }
      },
    });
    stream.start();
    return () => {
      stream.stop();
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <TopBar symbol={SYMBOL} ticker={ticker} />
      <main className="flex-1 p-3 grid grid-cols-[1fr_280px] gap-3 min-h-0">
        <div className="relative min-h-0 rounded border border-zinc-800 bg-zinc-950 overflow-hidden">
          <ChartPane
            state={state}
            scaleMode={scaleMode}
            onScaleModeChange={setScaleMode}
            tzId={tzId}
            onTzIdChange={setTzId}
            symbol={SYMBOL}
            exchange={EXCHANGE}
            timeframe={tf}
            onTimeframeChange={setTf}
          />
        </div>
        <SidePanel symbol={SYMBOL} />
      </main>
    </div>
  );
}

export default App;
