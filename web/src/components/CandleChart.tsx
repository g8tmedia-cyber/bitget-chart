/**
 * CandleChart — wraps lightweight-charts v4.
 *
 * Always shows candles. No overlays.
 *
 * Props:
 *   data         — sorted-ascending OHLCV + time
 *   latestPrice  — optional dashed line marking the most recent close
 *   onCrosshair  — fired with the bar under the crosshair (null when off)
 *   logScale     — true = log price axis, false = linear
 *   onChartApiReady — receives the chart instance for imperative actions
 *
 * Auto-resizes via ResizeObserver. Cleans up on unmount. The chart always
 * starts in the auto-fit (fit-content) state on load — viewport is not
 * persisted across reloads.
 */

import { useEffect, useRef } from "react";
import {
  createChart,
  PriceScaleMode,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import type { Candle } from "../api/types";

export interface CandleChartProps {
  data: Candle[];
  latestPrice?: number;
  onCrosshair?: (bar: Candle | null) => void;
  /** Logarithmic price scale when true, linear when false. */
  logScale?: boolean;
  /** Called once when the chart instance is created. Used for imperative
   *  actions (e.g. fitContent) from outside the component. */
  onChartApiReady?: (chart: IChartApi) => void;
}

export function CandleChart({
  data,
  latestPrice,
  onCrosshair,
  logScale = false,
  onChartApiReady,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  // Keep latest data accessible inside the crosshair subscription without
  // re-binding the subscription on every data change.
  const dataRef = useRef<Candle[]>(data);
  dataRef.current = data;

  // --- Create chart once on mount -----------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { color: "transparent" },
        textColor: "#a1a1aa",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { borderColor: "rgba(63, 63, 70, 0.6)" },
      timeScale: {
        borderColor: "rgba(63, 63, 70, 0.6)",
        timeVisible: true,
        secondsVisible: false,
        // Pixel padding on the right of the latest bar. The default is 0,
        // which glues the freshest candle to the chart's right edge.
        rightOffset: 50,
        // Keep a bit of room on the left so the oldest bar isn't flush either.
        shiftVisibleRangeOnNewBar: true,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(161, 161, 170, 0.4)", width: 1, style: 2 },
        horzLine: { color: "rgba(161, 161, 170, 0.4)", width: 1, style: 2 },
      },
      autoSize: false,
    });
    chartRef.current = chart;
    onChartApiReady?.(chart);

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineColor: "#71717a",
      priceLineStyle: 2,
    });
    candleSeriesRef.current = candleSeries;

    // --- Crosshair subscription ------------------------------------------
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!onCrosshair) return;
      const t = param.time as Time | undefined;
      if (t === undefined) {
        onCrosshair(null);
        return;
      }
      // Binary search for the bar at this time. Data is sorted ascending.
      const arr = dataRef.current;
      let lo = 0;
      let hi = arr.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const m = arr[mid]!;
        if (m.time < Number(t)) lo = mid + 1;
        else if (m.time > Number(t)) hi = mid - 1;
        else {
          onCrosshair(m);
          return;
        }
      }
      onCrosshair(null);
    });

    // --- Viewport persistence REMOVED ---------------------------------------
    // (Earlier versions saved the time-scale pan/zoom to localStorage and
    // restored it on reload. Reverted: the chart now always starts in
    // auto-fit state. No localStorage writes for the viewport.)

    // --- Auto-resize ------------------------------------------------------
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width === 0 || height === 0) {
          console.warn(
            "[CandleChart] container is 0x0 — check parent layout",
          );
        }
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      priceLineRef.current = null;
    };
    // onCrosshair intentionally not in deps: chart is created once, callback
    // updates a ref so we don't need to re-subscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable ref to onCrosshair so the subscription above sees the latest fn
  const onCrosshairRef = useRef(onCrosshair);
  onCrosshairRef.current = onCrosshair;

  // --- Push data on prop change -------------------------------------------
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    if (data.length === 0) {
      series.setData([]);
      return;
    }
    const cd: CandlestickData[] = data.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    series.setData(cd);
    // The chart's default `setData` behavior auto-fits the time scale, so
    // the chart starts in the "Auto" state on every load. No restore.
  }, [data]);

  // --- Latest price line --------------------------------------------------
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    if (priceLineRef.current) {
      series.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }
    if (latestPrice !== undefined) {
      priceLineRef.current = series.createPriceLine({
        price: latestPrice,
        color: "#a1a1aa",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
    }
  }, [latestPrice]);

  // --- Price scale mode (linear vs log) -----------------------------------
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      rightPriceScale: {
        mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
      },
    });
  }, [logScale]);

  return <div ref={containerRef} className="w-full h-full" />;
}
