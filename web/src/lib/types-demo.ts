/**
 * Demo account state types. Backed by localStorage in this build;
 * the shape is deliberately small + flat so a future swap to a real
 * backend (Supabase, Postgres) is just a fetch function change.
 */

export type Side = "long" | "short";
export type DemoOrderType = "market" | "limit";

/** An open position in one symbol, in one direction. */
export interface Position {
  id: string;
  symbol: string;
  side: Side;
  /** Size in BASE coin (e.g. BTC for BTCUSDT) */
  size: number;
  /** Average entry price in quote coin (e.g. USDT) */
  entryPrice: number;
  /** Leverage at the time of entry */
  leverage: number;
  /** USDT margin locked for this position */
  margin: number;
  /** ms timestamp when the position was first opened */
  openedAt: number;
}

/** A working order sitting on the book. Limit-only in this build;
 *  market orders skip this list and go straight to fills. */
export interface OpenOrder {
  id: string;
  symbol: string;
  side: Side;
  type: DemoOrderType;
  /** null for market orders; required for limit */
  price: number | null;
  size: number;
  leverage: number;
  tif: "GTC" | "IOC" | "FOK";
  createdAt: number;
}

/** A historical record of a fill (open, add, or close). */
export interface Fill {
  id: string;
  symbol: string;
  side: Side;
  type: DemoOrderType;
  size: number;
  /** Fill price in quote coin */
  price: number;
  leverage: number;
  /** Trading fee in quote coin. 0 in this build; fees land in part 3. */
  fee: number;
  /** Realized PnL for this fill. 0 for opens, signed for closes. */
  realizedPnl: number;
  createdAt: number;
  /** What this fill did. */
  note: "open" | "add" | "close";
}

export interface DemoAccount {
  balance: number;
  positions: Position[];
  openOrders: OpenOrder[];
  history: Fill[];
}

// --- Helpers ---------------------------------------------------------------

/** Unrealized PnL for a position at the given mark price. */
export function unrealizedPnl(p: Position, markPrice: number): number {
  const dir = p.side === "long" ? 1 : -1;
  return (markPrice - p.entryPrice) * p.size * dir;
}

/** Unrealized ROI as a percentage of the margin locked. */
export function unrealizedRoiPct(p: Position, markPrice: number): number {
  if (p.margin <= 0) return 0;
  return (unrealizedPnl(p, markPrice) / p.margin) * 100;
}

/**
 * Liquidation price (isolated margin, no fees, simple maintenance
 * margin rate). Used to surface an approximate liquidation in the
 * positions list — Bitget's real formula is more complex, but for
 * the demo this is close enough.
 */
export function liquidationPrice(
  p: Position,
  maintenanceMarginRate: number = 0.005,
): number {
  if (p.leverage <= 0) return 0;
  const factor = 1 / p.leverage - maintenanceMarginRate;
  return p.side === "long"
    ? p.entryPrice * (1 - factor)
    : p.entryPrice * (1 + factor);
}

/** Format a number to USDT-style grouping (thousands separators). */
export function formatUsdt(n: number, maxFractionDigits: number = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

/**
 * Total account equity — what the demo is worth right now if
 * you closed every open position at the current mark price.
 *
 *   equity = free balance
 *          + sum of locked margin across all open positions
 *          + sum of unrealized PnL across all open positions
 *
 * Without a mark price the unrealized PnL can't be computed
 * (we'd be marking each position at its own entry price, which
 * means PnL = 0), so we return `balance + totalMargin` — the
 * value the account would have if every position were closed
 * right now at its entry.
 */
export function accountEquity(
  balance: number,
  positions: Position[],
  markPrice: number | null,
): number {
  const totalMargin = positions.reduce((s, p) => s + p.margin, 0);
  if (markPrice == null) return balance + totalMargin;
  const totalUnrealized = positions.reduce(
    (s, p) => s + unrealizedPnl(p, markPrice),
    0,
  );
  return balance + totalMargin + totalUnrealized;
}

/**
 * Decide whether a limit order should fill on this candle. Pure
 * function — exports so the trigger can be unit-tested.
 *
 * A limit order fills when the bar's range includes the limit
 * price. For a long limit at P, the price must come down to P
 * (low <= P) while having been at or above P at some point
 * (high >= P) — i.e. the bar spans P. Same condition for shorts
 * (the bar must span P from below).
 */
export function shouldFillLimitOrder(
  order: OpenOrder,
  candle: { low: number; high: number },
): boolean {
  if (order.type !== "limit" || order.price == null) return false;
  return candle.low <= order.price && candle.high >= order.price;
}
