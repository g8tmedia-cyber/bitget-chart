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
  TickMarkType,
  type AreaData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import type { Candle } from "../api/types";

export type ScaleMode = "auto" | "log" | "percent";

export interface CandleChartProps {
  data: Candle[];
  latestPrice?: number;
  onCrosshair?: (bar: Candle | null) => void;
  /** Price scale mode: auto (linear+autoscale), log, or percent. */
  scaleMode?: ScaleMode;
  /** IANA timezone id (e.g. "America/New_York") or "UTC". */
  tzId?: string;
  /** Called once when the chart instance is created. Used for imperative
   *  actions (e.g. fitContent) from outside the component. */
  onChartApiReady?: (chart: IChartApi) => void;
}

export function CandleChart({
  data,
  latestPrice,
  onCrosshair,
  scaleMode = "auto",
  tzId = "UTC",
  onChartApiReady,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
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
        // Render X-axis tick labels in the user-selected timezone
        // (instead of the browser-local default). The library has no
        // first-class "timezone" option, so we provide a custom formatter
        // via the v5 tickMarkFormatter API. Updated below when tzId
        // changes; the create-time value is just an initial.
        tickMarkFormatter: makeTickMarkFormatter(tzId),
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

    const candleSeries = chart.addAreaSeries({
      lineColor: "#a1a1aa",
      topColor: "rgba(161, 161, 170, 0.25)",
      bottomColor: "rgba(161, 161, 170, 0)",
      lineWidth: 2,
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
    const ld: AreaData[] = data.map((c) => ({
      time: c.time as Time,
      value: c.close,
    }));
    series.setData(ld);
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

  // --- Price scale mode (auto | log | percent) ---------------------------
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const mode =
      scaleMode === "log"
        ? PriceScaleMode.Logarithmic
        : scaleMode === "percent"
          ? PriceScaleMode.Percentage
          : PriceScaleMode.Normal;
    chart.applyOptions({
      rightPriceScale: { mode },
    });
  }, [scaleMode]);

  // --- Timezone (X-axis tick labels) --------------------------------------
  // Lightweight-charts has no first-class timezone option. We provide a
  // tickMarkFormatter that formats each tick in the user-selected
  // IANA timezone, using Intl.DateTimeFormat. DST is handled
  // automatically by the browser. Return null to fall back to the
  // library default for any unhandled tickMarkType.
  //
  // Cast to `any` because v5's TimeScaleOptions (in some d.ts versions)
  // doesn't expose tickMarkFormatter on the runtime's DeepPartial
  // type even though the docs list it as a valid option. The runtime
  // accepts it just fine.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().applyOptions({
      tickMarkFormatter: makeTickMarkFormatter(tzId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }, [tzId]);

  return <div ref={containerRef} className="w-full h-full" />;
}

/**
 * Build a tick-mark formatter that renders the X-axis labels in the
 * given IANA timezone. DST is handled by the browser.
 */
function makeTickMarkFormatter(
  tzId: string,
): (time: Time, tickMarkType: TickMarkType, locale: string) => string | null {
  return (time, tickMarkType, locale) => {
    const date = new Date(Number(time) * 1000);
    const opts: Intl.DateTimeFormatOptions | null = (() => {
      switch (tickMarkType) {
        case TickMarkType.Year:
          return { year: "numeric" };
        case TickMarkType.Month:
          return { month: "short" };
        case TickMarkType.DayOfMonth:
          return { day: "2-digit", month: "short" };
        case TickMarkType.Time:
          return {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          };
        case TickMarkType.TimeWithSeconds:
          return {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          };
        default:
          return null;
      }
    })();
    if (!opts) return null;
    return new Intl.DateTimeFormat(locale || "en-GB", {
      timeZone: tzId,
      ...opts,
    }).format(date);
  };
}
