/**
 * BTCUSDT Chart — full app shell.
 *
 * Layout (top to bottom):
 *   - Top bar           : <TopBar> symbol picker + price + 24h stats
 *   - 3-col main row    : chart | order book/trades | trading form
 *   - Bottom panel      : Positions / Open orders / History
 *
 * Browser-tab title: `${chart's last close} | ${symbol}`. The price
 * comes from the chart's own candle data (state.data), not a
 * separate trade stream, so the tab and the chart's C value are
 * guaranteed to be the same number. Format is the shared
 * `formatPrice` so decimal precision matches the chart legend.
 *
 * `latestClose` is also passed to the TradingForm as the BBO
 * quick-set price (same source, same formatter).
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
import {
  DEFAULT_TIMEFRAME,
  timeframeByLabel,
  type Timeframe,
} from "./config/timeframes";
import type { ScaleMode } from "./components/ChartScaleMode";
import { formatPrice } from "./lib/format";

const DEFAULT_SYMBOL = "BTCUSDT";
const EXCHANGE = "Bitget";

const TF_STORAGE_KEY = "btcusdt-timeframe";
const SCALE_MODE_STORAGE_KEY = "btcusdt-scale-mode";
const TZ_ID_STORAGE_KEY = "btcusdt-tz-id";
const SYMBOL_STORAGE_KEY = "btcusdt-symbol";
const BALANCE_STORAGE_KEY = "btcusdt-demo-balance";
const DEFAULT_TZ_ID = "UTC";
const DEFAULT_BALANCE = 10_000;

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

function loadInitialBalance(): number {
  try {
    const saved = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (saved) {
      const n = Number(saved);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch {
    // fall through
  }
  return DEFAULT_BALANCE;
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
  return `${formatPrice(price)} | ${symbol}`;
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
  const [balance, setBalance] = useState<number>(loadInitialBalance);
  const state = useChartData(symbol, tf);
  const { ticker } = useTicker(symbol);

  // The chart's last close — single source of truth for both the
  // browser-tab price and the trading form's BBO. Pulled from the
  // candle data, so it matches the chart's C value exactly.
  const latestClose =
    state.data.length > 0 ? state.data[state.data.length - 1]!.close : null;

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

  useEffect(() => {
    try {
      localStorage.setItem(BALANCE_STORAGE_KEY, String(balance));
    } catch {
      // ignore
    }
  }, [balance]);

  // Live document title — same number as the chart's C.
  useEffect(() => {
    document.title = formatTitle(latestClose, symbol);
  }, [latestClose, symbol]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <TopBar symbol={symbol} onSymbolChange={setSymbol} ticker={ticker} />
      <main className="p-3 flex flex-col gap-3">
        {/* Top row: chart (left) | order book + market trades (middle)
            | trading form + account (right). Fixed 600px so the chart
            stays a usable size and doesn't grow to fill the
            viewport. The right panel scrolls internally if its
            content is taller than the row. */}
        <div className="grid grid-cols-[minmax(0,1fr)_300px_360px] gap-3 h-[600px] shrink-0">
          <div className="relative rounded border border-zinc-800 bg-zinc-950 overflow-hidden">
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
          <SidePanel symbol={symbol} />
          <aside className="relative rounded border border-zinc-800 bg-zinc-950 flex flex-col overflow-y-auto">
            <TradingForm
              symbol={symbol}
              latestPrice={latestClose}
              balance={balance}
            />
            <AccountPanel
              balance={balance}
              onBalanceChange={setBalance}
            />
          </aside>
        </div>

        {/* Bottom row: Positions / Open orders / Order history /
            Position history. Full width, below the 3-col row. The
            page scrolls if this drops below the viewport. */}
        <div className="h-[320px] shrink-0">
          <BottomPanel />
        </div>
      </main>
    </div>
  );
}

export default App;
