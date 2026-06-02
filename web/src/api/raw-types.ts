/**
 * Bitget V2 API response shapes.
 *
 * Note: Bitget returns all numeric values as STRINGS (even for price, volume, etc.).
 * The API client (`./bitget.ts`) converts them to typed numbers before exposing
 * to the rest of the app. Types here describe the raw wire format.
 *
 * All endpoints are wrapped: `{ code, msg, requestTime, data }`.
 * A non-`"00000"` code means the call failed even with HTTP 200.
 */

export interface BitgetEnvelope<T> {
  code: string; // "00000" = success
  msg: string;
  requestTime: string;
  data: T;
}

/** A single mix/futures candle row as Bitget returns it. */
export type RawMixCandle = [
  /** timestamp in ms (string) */
  string,
  /** open price */
  string,
  /** high price */
  string,
  /** low price */
  string,
  /** close price */
  string,
  /** base coin volume (e.g. BTC) */
  string,
  /** quote coin volume (e.g. USDT) */
  string,
];

/** A single mix/futures ticker row. */
export interface RawMixTicker {
  symbol: string;
  lastPr: string;
  open24h: string;
  high24h: string;
  low24h: string;
  change24h: string; // signed percent as string, e.g. "-1.234"
  fundingRate: string;
  nextFundingTime: string;
  markPrice: string;
  indexPrice: string;
  holdVol: string;
  baseVolume: string;
  quoteVolume: string;
}

/** A single mix/futures symbol/instrument row. */
export interface RawMixSymbol {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  productType: "USDT-FUTURES" | "COIN-FUTURES" | "USDC-FUTURES";
  /** Min leverage (string-encoded integer, e.g. "1") */
  minLever?: string;
  /** Max leverage (string-encoded integer, e.g. "150") */
  maxLever?: string;
  /** Price decimal places (e.g. "1" for BTCUSDT) */
  pricePlace?: string;
  /** Size decimal places (e.g. "4" for BTCUSDT) */
  volumePlace?: string;
  // many more fields exist on the wire; we only model what we use
}
