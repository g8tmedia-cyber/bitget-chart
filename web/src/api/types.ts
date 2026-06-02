/**
 * Typed, app-facing shapes returned by the Bitget API client.
 *
 * - Numbers are real numbers (not strings).
 * - Timestamps are Unix-seconds (not ms), because lightweight-charts expects that.
 */

export interface Candle {
  /** Unix-seconds, as required by lightweight-charts */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Base coin volume (e.g. BTC) */
  volume: number;
  /** Quote coin volume (e.g. USDT) */
  quoteVolume: number;
}

export interface Ticker {
  symbol: string;
  lastPrice: number;
  open24h: number;
  high24h: number;
  low24h: number;
  /** Signed percent change over 24h, e.g. -1.234 means -1.234% */
  change24hPct: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number; // Unix-ms
  baseVolume24h: number;
  quoteVolume24h: number;
  openInterest: number; // holdVol, in base coin
}

export interface SymbolInfo {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  productType: "USDT-FUTURES" | "COIN-FUTURES" | "USDC-FUTURES";
  minLever?: number;
  maxLever?: number;
  pricePlace?: number;
  volumePlace?: number;
}
