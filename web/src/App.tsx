/**
 * BTCUSDT Chart — full app shell.
 *
 * Layout (top to bottom):
 *   - Top bar           : <TopBar> symbol picker + price + 24h stats
 *   - 3-col main row    :
 *       - Left          : chart
 *       - Middle (280px): <SidePanel> (Order book | Market trades tabs)
 *       - Right (340px) : <TradingForm> + <AccountPanel>
 *   - Bottom panel      : <BottomPanel> (Positions / Open orders / …)
 *
 * Document title: live price from the trade stream, throttled to
 * ~10Hz. Format: `12345.67 | BTCUSDT`.
 *
 * `latestPrice` is a throttled 10Hz state, updated from the same
 * TradesStream that drives the title. The TradingForm uses it for
 * the BBO quick-set button and the cost preview.
 */

import { useEffect, useState } from "react";
import { ChartPane } from "./components/ChartPane";
import { SidePanel } from "./components/SidePanel";
import { TopBar } from "./components/TopBar";
import { TradingForm } from "./components/TradingForm";
import { AccountPanel } from "./components/AccountPanel";
import { BottomPanel } from "./components/BottomPanel";
import { useChartData } from "./hooks/useChartData";
import { useTicker } from "./hooks/useTicker";
import { TradesStream } from "./api/trades-ws";
import {
  DEFAULT_TIMEFRAME,
  timeframeByLabel,
  type Timeframe,
} from "./config/timeframes";
import type { ScaleMode } from "./components/ChartScaleMode";

const DEFAULT_SYMBOL = "BTCUSDT";
const EXCHANGE = "Bitget";

const TF_STORAGE_KEY = "btcusdt-timeframe";
const SCALE_MODE_STORAGE_KEY = "btcusdt-scale-mode";
const TZ_ID_STORAGE_KEY = "btcusdt-tz-id";
const SYMBOL_STORAGE_KEY = "btcusdt-symbol";
const DEFAULT_TZ_ID = "UTC";

// Throttle window for browser-tab title updates and the trading
// form's BBO. 100ms = 10Hz, well below human perception.
const TICK_THROTTLE_MS = 100;

const VALID_SCALE_MODES: ScaleMode[] = ["auto", "log", "percent"];

function loadInitialSymbol(): string {
  try {
    const saved = localStorage.getItem(SYMBOL_STORAGE_KEY);
    if (saved && saved.length > 0) return saved;
  } catch {
    // fall through
  }
  return DEFAULT_SYMBOL;
}

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

function formatTitle(price: number | null, symbol: string): string {
  if (price == null) return `${symbol} | ${EXCHANGE}`;
  const formatted = price.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return `${formatted} | ${symbol}`;
}

function App() {
  const [symbol, setSymbol] = useState<string>(loadInitialSymbol);
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
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const state = useChartData(symbol, tf);
  const { ticker } = useTicker(symbol);

  useEffect(() => {
    try {
      localStorage.setItem(SYMBOL_STORAGE_KEY, symbol);
    } catch {
      // ignore
    }
  }, [symbol]);

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

  // Live document title + throttled latestPrice for the trading form.
  // Subscribes directly to the trade stream (each trade = a price
  // tick) and throttles document.title + setLatestPrice writes to
  // TICK_THROTTLE_MS. No App re-renders between throttles.
  useEffect(() => {
    document.title = formatTitle(null, symbol);
    setLatestPrice(null);

    let timer: number | null = null;
    let pendingPrice: number | null = null;
    let lastUpdate = 0;

    const stream = new TradesStream({
      symbol,
      onTrades: (trades) => {
        if (trades.length === 0) return;
        const price = trades[0].price;
        pendingPrice = price;
        const now = performance.now();
        const elapsed = now - lastUpdate;
        if (elapsed >= TICK_THROTTLE_MS) {
          document.title = formatTitle(price, symbol);
          setLatestPrice(price);
          lastUpdate = now;
          pendingPrice = null;
        } else if (timer == null) {
          timer = window.setTimeout(() => {
            timer = null;
            if (pendingPrice != null) {
              document.title = formatTitle(pendingPrice, symbol);
              setLatestPrice(pendingPrice);
              lastUpdate = performance.now();
              pendingPrice = null;
            }
          }, TICK_THROTTLE_MS - elapsed);
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
  }, [symbol]);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <TopBar symbol={symbol} onSymbolChange={setSymbol} ticker={ticker} />
      <main className="flex-1 p-3 min-h-0">
        {/* 2-row × 3-column grid:
            - Chart spans both rows in column 1 (full height)
            - Order book / market trades in column 2 row 1
            - Bottom panel (Positions / Open orders / History) in
              column 2 row 2 — to the left of the right panel
            - Trading form + account spans both rows in column 3 */}
        <div className="h-full grid grid-cols-[minmax(0,1fr)_300px_360px] grid-rows-[1fr_300px] gap-3">
          {/* Chart: column 1, full height */}
          <div className="row-span-2 relative rounded border border-zinc-800 bg-zinc-950 overflow-hidden">
            <ChartPane
              state={state}
              scaleMode={scaleMode}
              onScaleModeChange={setScaleMode}
              tzId={tzId}
              onTzIdChange={setTzId}
              symbol={symbol}
              exchange={EXCHANGE}
              timeframe={tf}
              onTimeframeChange={setTf}
            />
          </div>

          {/* Order book + market trades: column 2, row 1 */}
          <div className="col-start-2 row-start-1 h-full">
            <SidePanel symbol={symbol} />
          </div>

          {/* Bottom panel: column 2, row 2 — sits to the left of
              the right panel, below the order book */}
          <div className="col-start-2 row-start-2 h-full">
            <BottomPanel />
          </div>

          {/* Right panel: column 3, full height */}
          <aside className="col-start-3 row-span-2 relative rounded border border-zinc-800 bg-zinc-950 flex flex-col overflow-y-auto">
            <TradingForm symbol={symbol} latestPrice={latestPrice} />
            <AccountPanel />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
