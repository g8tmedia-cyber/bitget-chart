/**
 * ChartPane — owns the chart's loading/error/empty state visuals,
 * the crosshair-driven OHLC legend overlay, and the bottom-right
 * chart controls (clock + scale-mode toggle).
 *
 * Outer container uses `absolute inset-0` so it fills the (relative)
 * parent regardless of flex / `h-full` quirks. Standard pattern for
 * chart libraries inside flex layouts.
 *
 * Header layout (left to right):
 *   [ Time ]   1m  5m  15m  1D  1W  1M   [▾]
 *
 *   - "Time" button: click to switch the chart to a line preview.
 *     Stays line until a row button is clicked.
 *   - Row of timeframe buttons: click one to select it (candles).
 *   - Chevron (▾) on the right: opens the visibility-manager popover
 *     (independent of "Time" and the chart type).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { IChartApi } from "lightweight-charts";
import { CandleChart } from "./CandleChart";
import { CandleLegend } from "./CandleLegend";
import { ChartScaleMode, type ScaleMode } from "./ChartScaleMode";
import { TimeframeSelector } from "./TimeframeSelector";
import { TimeframeDropdown } from "./TimeframeDropdown";
import { TimezoneSelect } from "./TimezoneSelect";
import { TIMEFRAMES } from "../config/timeframes";
import type { Candle } from "../api/types";
import type { UseChartDataResult } from "../hooks/useChartData";
import type { Timeframe } from "../config/timeframes";
import type { Position } from "../lib/types-demo";

export interface ChartPaneProps {
  state: UseChartDataResult;
  scaleMode: ScaleMode;
  onScaleModeChange: (mode: ScaleMode) => void;
  tzId: string;
  onTzIdChange: (tzId: string) => void;
  /** Symbol + exchange labels for the chart-top OHLC legend */
  symbol: string;
  exchange: string;
  /** Timeframe label (e.g. "1H") for the chart-top OHLC legend */
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  /** Open positions — drawn as entry + liq. price lines on the chart. */
  positions?: Position[];
}

const VISIBLE_TF_STORAGE_KEY = "btcusdt-visible-timeframes";

function loadInitialVisibleTimeframes(): Set<string> {
  try {
    const saved = localStorage.getItem(VISIBLE_TF_STORAGE_KEY);
    if (saved) {
      const labels = saved.split(",").filter(Boolean);
      if (labels.length > 0) return new Set(labels);
    }
  } catch {
    // fall through
  }
  return new Set(TIMEFRAMES.map((t) => t.label));
}

export function ChartPane({
  state,
  scaleMode,
  onScaleModeChange,
  tzId,
  onTzIdChange,
  symbol,
  exchange,
  timeframe,
  onTimeframeChange,
  positions,
}: ChartPaneProps) {
  const { data, loading, error, refetch } = state;
  const latest = data.length > 0 ? data[data.length - 1]! : null;
  const [hovered, setHovered] = useState<Candle | null>(null);
  const fading = loading && data.length > 0;
  const chartApiRef = useRef<IChartApi | null>(null);

  // Chart type: "candle" by default. The "Time" button is a one-way
  // switch to "line" (a preview of the price action). Selecting any
  // timeframe in the row snaps it back to "candle". The chevron
  // dropdown is independent of the chart type.
  const [chartType, setChartType] = useState<"candle" | "line">("candle");

  // Visibility manager dropdown (chevron-triggered, lives on the
  // right of the row).
  const [intervalOpen, setIntervalOpen] = useState(false);

  // Which timeframe labels are currently shown in the row. Persisted
  // to localStorage so the user's custom row survives reloads.
  const [visibleTimeframes, setVisibleTimeframes] = useState<Set<string>>(
    loadInitialVisibleTimeframes,
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        VISIBLE_TF_STORAGE_KEY,
        Array.from(visibleTimeframes).join(","),
      );
    } catch {
      // ignore
    }
  }, [visibleTimeframes]);

  const toggleVisibility = useCallback((label: string) => {
    setVisibleTimeframes((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  // "auto" mode snaps the chart back to fit all data and ensures the
  // price axis auto-scales to the visible range. Other modes just
  // switch the price-axis mode and leave the user's zoom alone.
  const handleScaleModeChange = (mode: ScaleMode) => {
    onScaleModeChange(mode);
    if (mode === "auto") {
      const chart = chartApiRef.current;
      if (!chart) return;
      chart.timeScale().fitContent();
      chart.priceScale("right").applyOptions({ autoScale: true });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div className="flex items-center gap-3 px-2 py-1 border-b border-zinc-800 relative">
        <button
          onClick={() => setChartType("line")}
          className={[
            "text-[10px] uppercase tracking-wider transition-colors",
            chartType === "line"
              ? "text-zinc-100 font-semibold"
              : "text-zinc-500 hover:text-zinc-200",
          ].join(" ")}
          title="Switch to line chart"
        >
          Time
        </button>
        <TimeframeSelector
          value={timeframe}
          onChange={(tf) => {
            onTimeframeChange(tf);
            setChartType("candle");
          }}
          visibleTimeframes={visibleTimeframes}
          onChevronClick={() => setIntervalOpen((o) => !o)}
          disabled={state.loading && state.data.length === 0}
        >
          {/* Dropdown lives inside the selector's `relative` container
              so `right-0 top-full` lands directly under the chevron,
              not at the right edge of the chart. */}
          <TimeframeDropdown
            open={intervalOpen}
            visibleTimeframes={visibleTimeframes}
            onToggleVisibility={toggleVisibility}
            selected={timeframe}
            onClose={() => setIntervalOpen(false)}
          />
        </TimeframeSelector>
      </div>

      {/* The chart itself + overlays (fills the rest) */}
      <div className="absolute inset-x-0 bottom-0 top-[33px]">
        {loading && data.length === 0 && <ChartSkeleton />}
        {error && data.length === 0 && (
          <ChartError message={error} onRetry={refetch} />
        )}
        {!loading && !error && data.length === 0 && <ChartEmpty />}

        <div
          className={[
            "absolute inset-0 transition-opacity duration-200",
            fading ? "opacity-50" : "opacity-100",
          ].join(" ")}
        >
          <CandleChart
            data={data}
            latestPrice={latest?.close}
            positions={positions}
            onCrosshair={setHovered}
            scaleMode={scaleMode}
            tzId={tzId}
            chartType={chartType}
            onChartApiReady={(c) => {
              chartApiRef.current = c;
            }}
          />
        </div>

        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <CandleLegend
            hovered={hovered}
            latest={latest}
            symbol={symbol}
            exchange={exchange}
            timeframeLabel={timeframe.label}
          />
        </div>

        {/* Bottom-right controls (matches the TradingView image layout) */}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5">
          <TimezoneSelect tzId={tzId} onChange={onTzIdChange} />
          <ChartScaleMode value={scaleMode} onChange={handleScaleModeChange} />
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm z-10">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
        Loading candles…
      </div>
    </div>
  );
}

function ChartError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="bg-zinc-900 border border-red-900/60 rounded-lg p-5 max-w-md text-center space-y-3">
        <div className="text-red-400 font-semibold">Couldn't load chart data</div>
        <div className="text-zinc-400 text-xs font-mono break-words">
          {message}
        </div>
        <button
          onClick={onRetry}
          className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-100 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm z-10">
      No data for this timeframe.
    </div>
  );
}
