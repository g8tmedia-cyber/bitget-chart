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
  }));
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
