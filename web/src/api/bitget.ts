/**
 * Bitget V2 public REST client — single-symbol BTCUSDT perp scope.
 *
 * Base URL: https://api.bitget.com
 * No auth required for the endpoints we use.
 *
 * Reference: see smoke-test results in ../../test_public_api.py + README.md.
 */

import type {
  BitgetEnvelope,
  RawMixCandle,
  RawMixSymbol,
  RawMixTicker,
} from "./raw-types";
import type { Candle, SymbolInfo, Ticker } from "./types";

const BASE = "https://api.bitget.com";
const PRODUCT_TYPE = "USDT-FUTURES" as const;

/** How many candles to fetch per request. Bitget caps `limit` at 1000 for `/candles`. */
const DEFAULT_CANDLE_LIMIT = 1000;

class BitgetApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly msg: string,
    public readonly path: string,
  ) {
    super(`Bitget ${code} on ${path}: ${msg}`);
    this.name = "BitgetApiError";
  }
}

async function request<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${path}`);
  }
  const json = (await res.json()) as BitgetEnvelope<T>;
  if (json.code !== "00000") {
    throw new BitgetApiError(json.code, json.msg, path);
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the latest N candles for a futures symbol.
 *
 * @param symbol       e.g. "BTCUSDT"
 * @param granularity  mix-format: "1m" | "5m" | "15m" | "30m" | "1H" | "4H" |
 *                     "6H" | "12H" | "1D" | "1W" | "1M"
 * @param limit        1–1000, default 200
 *
 * Bitget returns newest-first. We sort ascending by time because that's
 * what lightweight-charts expects.
 */
export async function getCandles(
  symbol: string,
  granularity: string,
  limit: number = DEFAULT_CANDLE_LIMIT,
): Promise<Candle[]> {
  const rows = await request<RawMixCandle[]>(
    "/api/v2/mix/market/candles",
    {
      symbol,
      granularity,
      productType: PRODUCT_TYPE,
      limit,
    },
  );
  return rows
    .map(([ts, o, h, l, c, baseVol, quoteVol]): Candle => ({
      time: Math.floor(Number(ts) / 1000),
      open: Number(o),
      high: Number(h),
      low: Number(l),
      close: Number(c),
      volume: Number(baseVol),
      quoteVolume: Number(quoteVol),
    }))
    .sort((a, b) => a.time - b.time);
}

export async function getTicker(symbol: string): Promise<Ticker> {
  const rows = await request<RawMixTicker[]>(
    "/api/v2/mix/market/ticker",
    { symbol, productType: PRODUCT_TYPE },
  );
  const t = rows[0];
  if (!t) throw new Error(`Empty ticker response for ${symbol}`);
  return {
    symbol: t.symbol,
    lastPrice: Number(t.lastPr),
    open24h: Number(t.open24h),
    high24h: Number(t.high24h),
    low24h: Number(t.low24h),
    change24hPct: Number(t.change24h),
    markPrice: Number(t.markPrice),
    indexPrice: Number(t.indexPrice),
    fundingRate: Number(t.fundingRate),
    nextFundingTime: Number(t.nextFundingTime),
    baseVolume24h: Number(t.baseVolume),
    quoteVolume24h: Number(t.quoteVolume),
    openInterest: Number(t.holdVol),
  };
}

export async function getSymbols(): Promise<SymbolInfo[]> {
  const rows = await request<RawMixSymbol[]>(
    "/api/v2/mix/market/contracts",
    { productType: PRODUCT_TYPE },
  );
  return rows.map((r) => ({
    symbol: r.symbol,
    baseCoin: r.baseCoin,
    quoteCoin: r.quoteCoin,
    productType: r.productType,
    minLever: r.minLever != null ? Number(r.minLever) : undefined,
    maxLever: r.maxLever != null ? Number(r.maxLever) : undefined,
    pricePlace: r.pricePlace != null ? Number(r.pricePlace) : undefined,
    volumePlace: r.volumePlace != null ? Number(r.volumePlace) : undefined,
  }));
}

/**
 * Get the contract info for a single symbol — used to look up
 * per-symbol max leverage for the trading form's leverage selector.
 * Returns null if the symbol isn't found.
 */
export async function getContractInfo(
  symbol: string,
): Promise<SymbolInfo | null> {
  const rows = await request<RawMixSymbol[]>(
    "/api/v2/mix/market/contracts",
    { productType: PRODUCT_TYPE, symbol },
  );
  const r = rows[0];
  if (!r) return null;
  return {
    symbol: r.symbol,
    baseCoin: r.baseCoin,
    quoteCoin: r.quoteCoin,
    productType: r.productType,
    minLever: r.minLever != null ? Number(r.minLever) : undefined,
    maxLever: r.maxLever != null ? Number(r.maxLever) : undefined,
    pricePlace: r.pricePlace != null ? Number(r.pricePlace) : undefined,
    volumePlace: r.volumePlace != null ? Number(r.volumePlace) : undefined,
  };
}

// ---------------------------------------------------------------------------
// All-tickers listing (for the symbol picker)
// ---------------------------------------------------------------------------

/**
 * A single row in the all-tickers response from
 * `/api/v2/mix/market/tickers`. Includes the fields we need to
 * drive the symbol-picker dropdown (price, 24h change, 24h volume).
 * The actual wire response has more fields (bid/ask sizes,
 * funding rate, etc.) — we model only what the picker needs.
 */
export interface FuturesTicker {
  symbol: string; // e.g. "BTCUSDT"
  /** Base coin derived from the symbol (the wire response doesn't
   *  include `baseCoin` for tickers, only for contracts). */
  baseCoin: string; // e.g. "BTC"
  quoteCoin: "USDT";
  lastPr: number;
  /** Signed 24h change in percent, e.g. -1.234 means -1.234% */
  change24h: number;
  /** 24h base-coin volume (e.g. BTC) */
  baseVolume: number;
  /** 24h quote-coin volume (e.g. USDT) — used for the default sort */
  quoteVolume: number;
  high24h: number;
  low24h: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
}

/**
 * Get all USDT-M Futures PERPETUAL tickers in one call. Filters out
 * dated futures (which have a non-null `deliveryTime` on the wire)
 * so the picker only shows tradeable perpetuals. Returns sorted by
 * 24h quote volume descending (the picker's default order).
 *
 * Note: this hits `/api/v2/mix/market/tickers?productType=USDT-FUTURES`
 * which returns 500+ rows. The picker should call this on open, not
 * on every render.
 */
export async function getUsdtFuturesPerpetualTickers(): Promise<FuturesTicker[]> {
  type RawRow = {
    symbol: string;
    lastPr: string;
    high24h?: string;
    low24h?: string;
    change24h: string;
    markPrice?: string;
    indexPrice?: string;
    fundingRate?: string;
    baseVolume: string;
    quoteVolume: string;
    /** null for perpetuals, a timestamp string for dated futures */
    deliveryTime?: string | null;
  };
  const rows = await request<RawRow[]>(
    "/api/v2/mix/market/tickers",
    { productType: PRODUCT_TYPE },
  );
  return rows
    .filter((r) => r.deliveryTime == null || r.deliveryTime === "")
    .map<FuturesTicker>((r) => {
      const baseCoin = r.symbol.endsWith("USDT")
        ? r.symbol.slice(0, -4)
        : r.symbol;
      return {
        symbol: r.symbol,
        baseCoin,
        quoteCoin: "USDT",
        lastPr: Number(r.lastPr),
        change24h: Number(r.change24h),
        baseVolume: Number(r.baseVolume),
        quoteVolume: Number(r.quoteVolume),
        high24h: Number(r.high24h ?? 0),
        low24h: Number(r.low24h ?? 0),
        markPrice: Number(r.markPrice ?? 0),
        indexPrice: Number(r.indexPrice ?? 0),
        fundingRate: Number(r.fundingRate ?? 0),
      };
    })
    .sort((a, b) => b.quoteVolume - a.quoteVolume);
}

// ---------------------------------------------------------------------------
// Order book
// ---------------------------------------------------------------------------

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBookSnapshot {
  /** Asks sorted ascending by price. */
  asks: OrderBookLevel[];
  /** Bids sorted descending by price. */
  bids: OrderBookLevel[];
  /** Match-engine timestamp, ms. */
  ts: number;
}

/**
 * REST snapshot of the order book. Returns up to `limit` levels on
 * each side (Bitget caps this at 200 for `/orderbook`).
 */
export async function getOrderbook(
  symbol: string,
  limit: number = 15,
): Promise<OrderBookSnapshot> {
  const rows = await request<
    { asks: [string, string][]; bids: [string, string][]; ts: string }[]
  >("/api/v2/mix/market/orderbook", {
    symbol,
    productType: PRODUCT_TYPE,
    limit,
  });
  const row = rows[0];
  if (!row) throw new Error(`Empty order book response for ${symbol}`);
  return {
    asks: row.asks
      .map(([p, s]) => ({ price: Number(p), size: Number(s) }))
      .sort((a, b) => a.price - b.price),
    bids: row.bids
      .map(([p, s]) => ({ price: Number(p), size: Number(s) }))
      .sort((a, b) => b.price - a.price),
    ts: Number(row.ts),
  };
}

// ---------------------------------------------------------------------------
// Recent public trades (fills)
// ---------------------------------------------------------------------------

export interface PublicTrade {
  tradeId: string;
  price: number;
  size: number;
  /** "buy" or "sell" — taker side */
  side: "buy" | "sell";
  /** Match-engine timestamp, ms. */
  ts: number;
}

export async function getRecentTrades(
  symbol: string,
  limit: number = 50,
): Promise<PublicTrade[]> {
  const rows = await request<
    {
      tradeId: string;
      price: string;
      size: string;
      side: string;
      ts: string;
    }[]
  >("/api/v2/mix/market/fills", {
    symbol,
    productType: PRODUCT_TYPE,
    limit,
  });
  return rows.map((r) => ({
    tradeId: r.tradeId,
    price: Number(r.price),
    size: Number(r.size),
    side: r.side === "buy" ? "buy" : "sell",
    ts: Number(r.ts),
  }));
}

export { BitgetApiError };
