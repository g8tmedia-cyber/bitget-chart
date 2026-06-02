/**
 * Single source of truth for the 11 supported timeframes.
 *
 * - `granularity` is the Bitget mix/futures REST candle granularity string.
 * - `wsChannel` is the matching Bitget public WS channel name.
 *   Pattern: `candle<granularity>` (e.g. "1m" → "candle1m", "1H" → "candle1H").
 * - `seconds` is the candle duration in seconds — useful for math (time bucketing,
 *   "last updated" text, future date axis formatting).
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
  { label: "5m", granularity: "5m", wsChannel: "candle5m", seconds: 5 * 60 },
  { label: "15m", granularity: "15m", wsChannel: "candle15m", seconds: 15 * 60 },
  { label: "30m", granularity: "30m", wsChannel: "candle30m", seconds: 30 * 60 },
  { label: "1H", granularity: "1H", wsChannel: "candle1H", seconds: 60 * 60 },
  { label: "4H", granularity: "4H", wsChannel: "candle4H", seconds: 4 * 60 * 60 },
  { label: "6H", granularity: "6H", wsChannel: "candle6H", seconds: 6 * 60 * 60 },
  { label: "12H", granularity: "12H", wsChannel: "candle12H", seconds: 12 * 60 * 60 },
  { label: "1D", granularity: "1D", wsChannel: "candle1D", seconds: 24 * 60 * 60 },
  { label: "1W", granularity: "1W", wsChannel: "candle1W", seconds: 7 * 24 * 60 * 60 },
  { label: "1M", granularity: "1M", wsChannel: "candle1M", seconds: 30 * 24 * 60 * 60 },
];

export const DEFAULT_TIMEFRAME: Timeframe = TIMEFRAMES[4]; // 1H

/** Look up a Timeframe by its label, e.g. "1H" → Timeframe object. */
export function timeframeByLabel(label: string): Timeframe | undefined {
  return TIMEFRAMES.find((t) => t.label === label);
}
