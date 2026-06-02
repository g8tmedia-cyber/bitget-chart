/**
 * Single source of truth for the supported timeframes.
 *
 * Granularities in this list are confirmed working against the live
 * Bitget V2 mix/futures endpoint via probe_granularities.py. The
 * API's own error message lists exactly which granularities are
 * accepted:
 *   [1m, 3m, 5m, 15m, 30m, 1H, 4H, 6H, 12H, 1D, 1W, 1M,
 *    6Hutc, 12Hutc, 1Dutc, 3Dutc, 1Wutc, 1Mutc]
 *
 * Note: hour-based granularities use UPPERCASE `H` (1H, 4H, 6H, 12H),
 * not lowercase. Lowercase `h` returns HTTP 400. Day/Week/Month
 * granularities are also uppercase.
 *
 * Order matches the image's general "minutes -> hours -> days ->
 * weeks -> months" convention. We expose the 8 most-used ones
 * (1m/3m/5m/15m/30m + 1H/4H + 1D/1W/1M); the rest are omitted to
 * keep the row tight. 2H, 8H, 2m, 1s, 3M are NOT supported.
 */

export interface Timeframe {
  /** UI label, e.g. "1H" */
  label: string;
  /** Bitget REST granularity string (case-sensitive: 1H not 1h) */
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
  { label: "1H", granularity: "1H", wsChannel: "candle1H", seconds: 60 * 60 },
  { label: "4H", granularity: "4H", wsChannel: "candle4H", seconds: 4 * 60 * 60 },
  { label: "1D", granularity: "1D", wsChannel: "candle1D", seconds: 24 * 60 * 60 },
  { label: "1W", granularity: "1W", wsChannel: "candle1W", seconds: 7 * 24 * 60 * 60 },
  { label: "1M", granularity: "1M", wsChannel: "candle1M", seconds: 30 * 24 * 60 * 60 },
];

/**
 * Quick-pick favorites shown in the "Time" column of the interval
 * selector. Spans the supported granularities. These are also present
 * in the main grid (just visually highlighted in the left column).
 */
export const TIME_QUICK_PICKS: string[] = ["5m", "15m", "30m", "1H", "1D", "1W"];

export const DEFAULT_TIMEFRAME: Timeframe = TIMEFRAMES[3]; // 15m

export function timeframeByLabel(label: string): Timeframe | undefined {
  return TIMEFRAMES.find((t) => t.label === label);
}
