/**
 * useDemoAccount — the demo trading engine's state container.
 *
 * State is the full demo account (balance, positions, openOrders,
 * history), persisted to localStorage on every change. Actions
 * return nothing — they apply state transitions and re-render
 * the consumers.
 *
 * Part 1 ships:
 *   - placeMarketOrder (open or add to a position; same-side adds
 *     and averages entry; opposite-side closes)
 *   - closePosition (full close at mark price, returns margin +
 *     realized PnL to balance)
 *   - reset (wipe everything back to the default balance)
 *
 * Limit orders land in part 2.
 */

import { useCallback, useEffect, useState } from "react";
import type {
  DemoAccount,
  Fill,
  Position,
  Side,
} from "../lib/types-demo";

const STORAGE_KEY = "btcusdt-demo-account";
const DEFAULT_BALANCE = 10_000;

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

export interface PlaceMarketOrderParams {
  symbol: string;
  side: Side;
  size: number;
  leverage: number;
  /** Mark price (used as the fill price for market orders) */
  markPrice: number;
}

export interface UseDemoAccountResult {
  state: DemoAccount;
  /** Open / add to a position at the current mark price. */
  placeMarketOrder: (params: PlaceMarketOrderParams) => void;
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

  return { state, placeMarketOrder, closePosition, reset };
}

// --- State transitions -----------------------------------------------------

function applyMarketFill(
  state: DemoAccount,
  params: PlaceMarketOrderParams,
): DemoAccount {
  const { symbol, side, size, leverage, markPrice } = params;
  const existing = state.positions.find((p) => p.symbol === symbol);
  const notional = size * markPrice;
  const margin = notional / leverage;

  // Insufficient balance — silently reject. (The form's max-size
  // readout should prevent this in normal use, but it's a safety
  // net.)
  if (margin > state.balance) return state;

  const fill: Fill = {
    id: genId(),
    symbol,
    side,
    type: "market",
    size,
    price: markPrice,
    leverage,
    fee: 0,
    realizedPnl: 0,
    createdAt: Date.now(),
    note: existing?.side === side ? "add" : "open",
  };

  // No existing position → open new
  if (!existing) {
    const newPos: Position = {
      id: genId(),
      symbol,
      side,
      size,
      entryPrice: markPrice,
      leverage,
      margin,
      openedAt: Date.now(),
    };
    return {
      balance: state.balance - margin,
      positions: [...state.positions, newPos],
      openOrders: state.openOrders,
      history: [...state.history, fill],
    };
  }

  // Same side → add to position (average entry)
  if (existing.side === side) {
    const totalSize = existing.size + size;
    const avgEntry =
      (existing.entryPrice * existing.size + markPrice * size) / totalSize;
    return {
      balance: state.balance - margin,
      positions: state.positions.map((p) =>
        p.id === existing.id
          ? {
              ...p,
              size: totalSize,
              entryPrice: avgEntry,
              margin: p.margin + margin,
            }
          : p,
      ),
      openOrders: state.openOrders,
      history: [...state.history, fill],
    };
  }

  // Opposite side → close the existing position (no reverses in
  // part 1; if fill.size > existing.size, the excess is ignored).
  return applyClose(state, existing.id, markPrice, fill);
}

function applyClose(
  state: DemoAccount,
  positionId: string,
  markPrice: number,
  prebuiltFill?: Fill,
): DemoAccount {
  const pos = state.positions.find((p) => p.id === positionId);
  if (!pos) return state;

  const dir = pos.side === "long" ? 1 : -1;
  const realizedPnl =
    (markPrice - pos.entryPrice) * pos.size * dir;

  const fill: Fill =
    prebuiltFill ??
    {
      id: genId(),
      symbol: pos.symbol,
      side: pos.side,
      type: "market",
      size: pos.size,
      price: markPrice,
      leverage: pos.leverage,
      fee: 0,
      realizedPnl,
      createdAt: Date.now(),
      note: "close",
    };

  return {
    balance: state.balance + pos.margin + realizedPnl,
    positions: state.positions.filter((p) => p.id !== positionId),
    openOrders: state.openOrders,
    history: [...state.history, fill],
  };
}
