/**
 * useDemoAccount — the demo trading engine's state container.
 *
 * State is the full demo account (balance, positions, openOrders,
 * history), persisted to localStorage on every change. Actions
 * return nothing — they apply state transitions and re-render
 * the consumers.
 *
 * Part 2 ships:
 *   - placeLimitOrder — deducts margin, parks an order on the
 *     book; the parent wires the candle-data trigger via
 *     `fillLimitOrder`
 *   - cancelOrder — returns the margin, removes the order
 *   - fillLimitOrder — applies a limit fill (margin was already
 *     deducted on place; no further balance change here)
 *
 * Part 3 polish:
 *   - Realistic fees: 0.06% taker (market) / 0.02% maker (limit)
 *     deducted from margin on open, from realized PnL on close.
 *   - Edge cases: insufficient margin silently rejected;
 *     cancelling/filling a missing id is a no-op.
 */

import { useCallback, useEffect, useState } from "react";
import type {
  DemoAccount,
  Fill,
  OpenOrder,
  Position,
  Side,
} from "../lib/types-demo";

const STORAGE_KEY = "btcusdt-demo-account";
const DEFAULT_BALANCE = 10_000;

// Bitget USDT-FUTURES fee schedule (VIP 0)
const TAKER_FEE_RATE = 0.0006; // 0.06%
const MAKER_FEE_RATE = 0.0002; // 0.02%

function loadInitial(): DemoAccount {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.balance === "number" &&
        Array.isArray(parsed.positions) &&
        Array.isArray(parsed.openOrders) &&
        Array.isArray(parsed.history)
      ) {
        return parsed as DemoAccount;
      }
    }
  } catch {
    // fall through to default
  }
  return {
    balance: DEFAULT_BALANCE,
    positions: [],
    openOrders: [],
    history: [],
  };
}

let _idCounter = 0;
function genId(): string {
  _idCounter += 1;
  return `${Date.now().toString(36)}-${_idCounter.toString(36)}`;
}

function feeForFill(type: Fill["type"]): number {
  return type === "market" ? TAKER_FEE_RATE : MAKER_FEE_RATE;
}

export interface PlaceMarketOrderParams {
  symbol: string;
  side: Side;
  size: number;
  leverage: number;
  /** Mark price (used as the fill price for market orders) */
  markPrice: number;
}

export interface PlaceLimitOrderParams {
  symbol: string;
  side: Side;
  size: number;
  leverage: number;
  price: number;
  tif: "GTC" | "IOC" | "FOK";
}

export interface UseDemoAccountResult {
  state: DemoAccount;
  /** Open / add to a position at the current mark price. */
  placeMarketOrder: (params: PlaceMarketOrderParams) => void;
  /** Park a limit order on the book; margin is deducted now. */
  placeLimitOrder: (params: PlaceLimitOrderParams) => void;
  /** Cancel a parked limit order; margin is returned. */
  cancelOrder: (orderId: string) => void;
  /** Fill a limit order at the given price (the limit price).
   *  No further balance change — margin was already deducted
   *  on place. */
  fillLimitOrder: (orderId: string, fillPrice: number) => void;
  /** Fully close a position at the current mark price. */
  closePosition: (positionId: string, markPrice: number) => void;
  /** Wipe everything back to the default balance. */
  reset: () => void;
}

export function useDemoAccount(): UseDemoAccountResult {
  const [state, setState] = useState<DemoAccount>(loadInitial);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const placeMarketOrder = useCallback(
    (params: PlaceMarketOrderParams) => {
      if (params.size <= 0 || params.markPrice <= 0) return;
      setState((prev) => applyMarketFill(prev, params));
    },
    [],
  );

  const placeLimitOrder = useCallback(
    (params: PlaceLimitOrderParams) => {
      if (params.size <= 0 || params.price <= 0) return;
      setState((prev) => {
        const notional = params.size * params.price;
        const margin = notional / params.leverage;
        if (margin > prev.balance) return prev; // insufficient
        const order: OpenOrder = {
          id: genId(),
          symbol: params.symbol,
          side: params.side,
          type: "limit",
          price: params.price,
          size: params.size,
          leverage: params.leverage,
          tif: params.tif,
          createdAt: Date.now(),
        };
        return {
          ...prev,
          balance: prev.balance - margin,
          openOrders: [...prev.openOrders, order],
        };
      });
    },
    [],
  );

  const cancelOrder = useCallback((orderId: string) => {
    setState((prev) => {
      const order = prev.openOrders.find((o) => o.id === orderId);
      if (!order) return prev;
      // Return the margin that was locked when the order was placed.
      const margin = (order.size * (order.price ?? 0)) / order.leverage;
      return {
        ...prev,
        balance: prev.balance + margin,
        openOrders: prev.openOrders.filter((o) => o.id !== orderId),
      };
    });
  }, []);

  const fillLimitOrder = useCallback(
    (orderId: string, fillPrice: number) => {
      if (fillPrice <= 0) return;
      setState((prev) => applyLimitFill(prev, orderId, fillPrice));
    },
    [],
  );

  const closePosition = useCallback(
    (positionId: string, markPrice: number) => {
      if (markPrice <= 0) return;
      setState((prev) => applyClose(prev, positionId, markPrice));
    },
    [],
  );

  const reset = useCallback(() => {
    setState({
      balance: DEFAULT_BALANCE,
      positions: [],
      openOrders: [],
      history: [],
    });
  }, []);

  return {
    state,
    placeMarketOrder,
    placeLimitOrder,
    cancelOrder,
    fillLimitOrder,
    closePosition,
    reset,
  };
}

// --- State transitions -----------------------------------------------------
// Exported for unit testing.

export function applyMarketFill(
  state: DemoAccount,
  params: PlaceMarketOrderParams,
): DemoAccount {
  if (params.size <= 0 || params.markPrice <= 0) return state;
  const { symbol, side, size, leverage, markPrice } = params;
  const existing = state.positions.find((p) => p.symbol === symbol);
  const notional = size * markPrice;
  const fee = notional * feeForFill("market");
  const margin = notional / leverage;

  if (margin > state.balance) return state;

  const fill: Fill = {
    id: genId(),
    symbol,
    side,
    type: "market",
    size,
    price: markPrice,
    leverage,
    fee,
    realizedPnl: 0,
    createdAt: Date.now(),
    note: existing?.side === side ? "add" : "open",
  };

  if (!existing) {
    const newPos: Position = {
      id: genId(),
      symbol,
      side,
      size,
      entryPrice: markPrice,
      leverage,
      margin: margin + fee, // margin + fee both locked from balance
      openedAt: Date.now(),
    };
    return {
      balance: state.balance - margin - fee,
      positions: [...state.positions, newPos],
      openOrders: state.openOrders,
      history: [...state.history, fill],
    };
  }

  if (existing.side === side) {
    const totalSize = existing.size + size;
    const avgEntry =
      (existing.entryPrice * existing.size + markPrice * size) / totalSize;
    return {
      balance: state.balance - margin - fee,
      positions: state.positions.map((p) =>
        p.id === existing.id
          ? {
              ...p,
              size: totalSize,
              entryPrice: avgEntry,
              margin: p.margin + margin + fee,
            }
          : p,
      ),
      openOrders: state.openOrders,
      history: [...state.history, fill],
    };
  }

  // Opposite side → close (no reverses in this build).
  return applyClose(state, existing.id, markPrice, fill);
}

export function applyClose(
  state: DemoAccount,
  positionId: string,
  markPrice: number,
  prebuiltFill?: Fill,
): DemoAccount {
  const pos = state.positions.find((p) => p.id === positionId);
  if (!pos) return state;

  const dir = pos.side === "long" ? 1 : -1;
  const grossPnl = (markPrice - pos.entryPrice) * pos.size * dir;

  // Two paths:
  //   1) prebuiltFill is provided — the trade that caused the close
  //      is already in the fill (opposite-side market or limit fill).
  //      The fee on that fill IS the fee for the whole trade; no
  //      additional exit fee. Just rewrite note → "close" and
  //      recompute realizedPnl against that fee.
  //   2) prebuiltFill is null — direct close from the Positions list.
  //      This is a market close, charge taker fee.
  const fill: Fill =
    prebuiltFill != null
      ? {
          ...prebuiltFill,
          note: "close",
          realizedPnl: grossPnl - prebuiltFill.fee,
          fee: prebuiltFill.fee,
        }
      : {
          id: genId(),
          symbol: pos.symbol,
          side: pos.side,
          type: "market",
          size: pos.size,
          price: markPrice,
          leverage: pos.leverage,
          fee: pos.size * markPrice * feeForFill("market"),
          realizedPnl:
            grossPnl - pos.size * markPrice * feeForFill("market"),
          createdAt: Date.now(),
          note: "close",
        };

  return {
    balance: state.balance + pos.margin + fill.realizedPnl,
    positions: state.positions.filter((p) => p.id !== positionId),
    openOrders: state.openOrders,
    history: [...state.history, fill],
  };
}

/**
 * Apply a limit order fill. The margin for this order was already
 * deducted when the order was placed, so we just transfer it
 * from the (now-removed) order onto the position, plus charge
 * the maker fee.
 */
export function applyLimitFill(
  state: DemoAccount,
  orderId: string,
  fillPrice: number,
): DemoAccount {
  const order = state.openOrders.find((o) => o.id === orderId);
  if (!order) return state;
  if (order.type !== "limit" || order.price == null) return state;

  const existing = state.positions.find(
    (p) => p.symbol === order.symbol,
  );
  const notional = order.size * fillPrice;
  const fee = notional * feeForFill("limit");
  const margin = notional / order.leverage;

  const fill: Fill = {
    id: genId(),
    symbol: order.symbol,
    side: order.side,
    type: "limit",
    size: order.size,
    price: fillPrice,
    leverage: order.leverage,
    fee,
    realizedPnl: 0,
    createdAt: Date.now(),
    note: existing?.side === order.side ? "add" : "open",
  };

  const withoutOrder: DemoAccount = {
    ...state,
    openOrders: state.openOrders.filter((o) => o.id !== orderId),
  };

  if (!existing) {
    const newPos: Position = {
      id: genId(),
      symbol: order.symbol,
      side: order.side,
      size: order.size,
      entryPrice: fillPrice,
      leverage: order.leverage,
      margin: margin + fee,
      openedAt: Date.now(),
    };
    return {
      ...withoutOrder,
      positions: [...withoutOrder.positions, newPos],
      history: [...withoutOrder.history, fill],
    };
  }

  if (existing.side === order.side) {
    const totalSize = existing.size + order.size;
    const avgEntry =
      (existing.entryPrice * existing.size + fillPrice * order.size) /
      totalSize;
    return {
      ...withoutOrder,
      positions: withoutOrder.positions.map((p) =>
        p.id === existing.id
          ? {
              ...p,
              size: totalSize,
              entryPrice: avgEntry,
              margin: p.margin + margin + fee,
            }
          : p,
      ),
      history: [...withoutOrder.history, fill],
    };
  }

  // Opposite side — close.
  return applyClose(withoutOrder, existing.id, fillPrice, fill);
}
