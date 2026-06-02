/**
 * Single source of truth for the supported timeframes.
 *
 * Granularities in this list are confirmed working against the live
 * Bitget V2 mix/futures endpoint via probe_granularities.py. The
 * image's longer list (1s/2m/1h/2h/4h/6h/8h/12h/3D/3M etc.) is NOT
 * supported by the futures candle endpoint and would 400, so they're
 * not included here.
 *
 * Order matches the image's general "seconds -> minutes -> hours ->
 * days -> weeks -> months" convention, even though we only have the
 * subset of granularities the API actually accepts.
 */

export interface Timeframe {
  /** UI label, e.g. "1H" */
  label: string;
  /** Bitget REST granularity string */
  granularity: string;
  /** Bitget WS channel name */
  wsChannel: string;
  /** Duration in seconds */
  seconds: number;
}

export const TIMEFRAMES: Timeframe[] = [
  { label: "1m", granularity: "1m", wsChannel: "candle1m", seconds: 60 },
  { label: "3m", granularity: "3m", wsChannel: "candle3m", seconds: 3 * 60 },
  { label: "5m", granularity: "5m", wsChannel: "candle5m", seconds: 5 * 60 },
  { label: "15m", granularity: "15m", wsChannel: "candle15m", seconds: 15 * 60 },
  { label: "30m", granularity: "30m", wsChannel: "candle30m", seconds: 30 * 60 },
  { label: "1D", granularity: "1D", wsChannel: "candle1D", seconds: 24 * 60 * 60 },
  { label: "3D", granularity: "3D", wsChannel: "candle3D", seconds: 3 * 24 * 60 * 60 },
  { label: "1W", granularity: "1W", wsChannel: "candle1W", seconds: 7 * 24 * 60 * 60 },
  { label: "1M", granularity: "1M", wsChannel: "candle1M", seconds: 30 * 24 * 60 * 60 },
];

/**
 * Quick-pick favorites shown in the "Time" column of the interval
 * selector. Spans the supported granularities. These are also present
 * in the main grid (just visually highlighted in the left column).
 */
export const TIME_QUICK_PICKS: string[] = ["5m", "15m", "30m", "1D", "1W"];

export const DEFAULT_TIMEFRAME: Timeframe = TIMEFRAMES[3]; // 15m

export function timeframeByLabel(label: string): Timeframe | undefined {
  return TIMEFRAMES.find((t) => t.label === label);
}
