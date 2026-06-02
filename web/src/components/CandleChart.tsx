/**
 * CandleChart — wraps lightweight-charts v4.
 *
 * Default chart type is "candle". A `chartType: "line"` prop switches
 * the series to a light area chart (used as the "preview" mode while
 * the interval-selector popover is open — see ChartPane).
 *
 * Props:
 *   data         — sorted-ascending OHLCV + time
 *   latestPrice  — optional dashed line marking the most recent close
 *   onCrosshair  — fired with the bar under the crosshair (null when off)
 *   scaleMode    — auto (linear+autoscale) | log | percent
 *   tzId         — IANA timezone for X-axis tick labels
 *   chartType    — "candle" (default) or "line"
 *   onChartApiReady — receives the chart instance for imperative actions
 *
 * Auto-resizes via ResizeObserver. Cleans up on unmount. Always starts
 * in auto-fit (fit-content) state on load.
 */

import { useEffect, useRef } from "react";
import {
  createChart,
  PriceScaleMode,
  TickMarkType,
  type AreaData,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import type { Candle } from "../api/types";

export type ScaleMode = "auto" | "log" | "percent";
export type ChartType = "candle" | "line";

export interface CandleChartProps {
  data: Candle[];
  latestPrice?: number;
  onCrosshair?: (bar: Candle | null) => void;
  /** Price scale mode: auto (linear+autoscale), log, or percent. */
  scaleMode?: ScaleMode;
  /** IANA timezone id (e.g. "America/New_York") or "UTC". */
  tzId?: string;
  /** Chart series type. Defaults to "candle". */
  chartType?: ChartType;
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
  chartType = "candle",
  onChartApiReady,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Either a candlestick series or an area series, depending on chartType.
  const seriesRef = useRef<
    ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null
  >(null);
  // Tracks the currently-mounted series type so we know what to remove
  // when chartType changes.
  const currentTypeRef = useRef<ChartType>(chartType);
  const priceLineRef = useRef<IPriceLine | null>(null);
  // Keep latest data accessible inside the crosshair subscription without
  // re-binding the subscription on every data change.
  const dataRef = useRef<Candle[]>(data);
  dataRef.current = data;
  // The latest chartType also needs to be available to the data effect
  // (it reads currentTypeRef to decide which setData shape to use).
  const chartTypeRef = useRef<ChartType>(chartType);
  chartTypeRef.current = chartType;

  // --- Create chart once on mount (always starts as candles) -----------
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
        rightOffset: 50,
        shiftVisibleRangeOnNewBar: true,
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

    // Initial series: always candlesticks (chartType is "candle" on
    // mount; the swap effect below handles subsequent changes).
    seriesRef.current = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineColor: "#71717a",
      priceLineStyle: 2,
    });
    currentTypeRef.current = "candle";

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!onCrosshair) return;
      const t = param.time as Time | undefined;
      if (t === undefined) {
        onCrosshair(null);
        return;
      }
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

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width === 0 || height === 0) {
          console.warn("[CandleChart] container is 0x0 — check parent layout");
        }
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Swap series when chartType changes --------------------------------
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (currentTypeRef.current === chartType) return;

    // Drop the existing series.
    if (seriesRef.current) {
      try {
        chart.removeSeries(seriesRef.current);
      } catch {
        // ignore — series may already be detached
      }
      seriesRef.current = null;
    }
    if (priceLineRef.current) {
      priceLineRef.current = null;
    }

    if (chartType === "line") {
      const s = chart.addAreaSeries({
        lineColor: "#a1a1aa",
        topColor: "rgba(161, 161, 170, 0.25)",
        bottomColor: "rgba(161, 161, 170, 0)",
        lineWidth: 2,
        priceLineColor: "#71717a",
        priceLineStyle: 2,
      });
      seriesRef.current = s;
    } else {
      const s = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        priceLineColor: "#71717a",
        priceLineStyle: 2,
      });
      seriesRef.current = s;
    }
    currentTypeRef.current = chartType;

    // Push current data to the freshly-created series.
    if (data.length > 0) {
      pushData(seriesRef.current, data, chartType);
    }
  }, [chartType, data]);

  // --- Push data on prop change -----------------------------------------
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    if (data.length === 0) {
      series.setData([]);
      return;
    }
    pushData(series, data, chartTypeRef.current);
  }, [data]);

  // --- Latest price line ------------------------------------------------
  useEffect(() => {
    const series = seriesRef.current;
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

  // --- Price scale mode (auto | log | percent) -------------------------
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

  // --- Timezone (X-axis tick labels) ------------------------------------
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

function pushData(
  series: ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null,
  data: Candle[],
  chartType: ChartType,
): void {
  if (!series) return;
  if (chartType === "line") {
    const ld: AreaData[] = data.map((c) => ({
      time: c.time as Time,
      value: c.close,
    }));
    series.setData(ld);
  } else {
    const cd: CandlestickData[] = data.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    series.setData(cd);
  }
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
