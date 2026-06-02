/**
 * ChartPane — owns the chart's loading/error/empty state visuals
 * and the crosshair-driven OHLC legend overlay.
 *
 * Outer container uses `absolute inset-0` so it fills the (relative)
 * parent regardless of flex / `h-full` quirks. This is the standard
 * pattern for chart libraries inside flex layouts.
 */

import { useRef, useState } from "react";
import type { IChartApi } from "lightweight-charts";
import { CandleChart } from "./CandleChart";
import { CandleLegend } from "./CandleLegend";
import { ScaleToggle } from "./ScaleToggle";
import type { Candle } from "../api/types";
import type { UseChartDataResult } from "../hooks/useChartData";

export interface ChartPaneProps {
  state: UseChartDataResult;
  logScale: boolean;
  onLogChange: (v: boolean) => void;
}

export function ChartPane({ state, logScale, onLogChange }: ChartPaneProps) {
  const { data, loading, error, refetch } = state;
  const latest = data.length > 0 ? data[data.length - 1]! : null;
  const [hovered, setHovered] = useState<Candle | null>(null);
  const fading = loading && data.length > 0;
  const chartApiRef = useRef<IChartApi | null>(null);

  // "Auto" snaps both axes back to fit all data:
  //   - timeScale().fitContent()      resets X (pan/zoom)
  //   - priceScale autoScale = true   resets Y (in case the user had
  //                                   manually zoomed the price axis)
  const handleReset = () => {
    const chart = chartApiRef.current;
    if (!chart) return;
    chart.timeScale().fitContent();
    chart.priceScale("right").applyOptions({ autoScale: true });
  };

  return (
    <div className="absolute inset-0">
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
          onCrosshair={setHovered}
          logScale={logScale}
          onChartApiReady={(c) => {
            chartApiRef.current = c;
          }}
        />
      </div>

      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <CandleLegend
          hovered={hovered}
          latest={latest}
          isLive={hovered == null}
        />
      </div>

      <div className="absolute top-2 right-2 z-10">
        <ScaleToggle
          logScale={logScale}
          onLogChange={onLogChange}
          onReset={handleReset}
        />
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
