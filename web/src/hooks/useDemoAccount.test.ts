/**
 * Unit tests for the demo trading engine's pure functions.
 *
 * Covers:
 *   - PnL helpers: unrealizedPnl, unrealizedRoiPct, liquidationPrice
 *   - Limit-order trigger predicate: shouldFillLimitOrder
 *   - State transitions exported from useDemoAccount:
 *       applyMarketFill (open / add / close)
 *       applyClose
 *       applyLimitFill
 *   - Formatting helper
 *
 * The demo hook itself is tested implicitly through these pure
 * functions — the hook is just a state container around them.
 */

import { describe, expect, it } from "vitest";
import {
  applyClose,
  applyLimitFill,
  applyMarketFill,
} from "../hooks/useDemoAccount";
import {
  formatUsdt,
  liquidationPrice,
  shouldFillLimitOrder,
  unrealizedPnl,
  unrealizedRoiPct,
  type DemoAccount,
  type OpenOrder,
  type Position,
} from "../lib/types-demo";

// --- Helpers ---------------------------------------------------------------

function freshAccount(balance = 10_000): DemoAccount {
  return {
    balance,
    positions: [],
    openOrders: [],
    history: [],
  };
}

function freshPosition(overrides: Partial<Position> = {}): Position {
  return {
    id: "pos-1",
    symbol: "BTCUSDT",
    side: "long",
    size: 0.1,
    entryPrice: 67_000,
    leverage: 10,
    margin: 670,
    openedAt: 1_700_000_000_000,
    ...overrides,
  };
}

function freshOrder(overrides: Partial<OpenOrder> = {}): OpenOrder {
  return {
    id: "ord-1",
    symbol: "BTCUSDT",
    side: "long",
    type: "limit",
    price: 66_500,
    size: 0.1,
    leverage: 10,
    tif: "GTC",
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

// --- PnL helpers -----------------------------------------------------------

describe("unrealizedPnl", () => {
  it("returns positive for a profitable long", () => {
    const p = freshPosition({ side: "long", entryPrice: 67_000, size: 0.1 });
    expect(unrealizedPnl(p, 67_500)).toBeCloseTo(50, 6);
  });

  it("returns negative for an unprofitable long", () => {
    const p = freshPosition({ side: "long", entryPrice: 67_000, size: 0.1 });
    expect(unrealizedPnl(p, 66_500)).toBeCloseTo(-50, 6);
  });

  it("returns positive for a profitable short (price went down)", () => {
    const p = freshPosition({ side: "short", entryPrice: 67_000, size: 0.1 });
    expect(unrealizedPnl(p, 66_500)).toBeCloseTo(50, 6);
  });

  it("returns 0 when mark equals entry", () => {
    const p = freshPosition({ side: "long", entryPrice: 67_000, size: 0.1 });
    expect(unrealizedPnl(p, 67_000)).toBe(0);
  });
});

describe("unrealizedRoiPct", () => {
  it("computes ROI relative to margin", () => {
    const p = freshPosition({ side: "long", entryPrice: 67_000, size: 0.1, leverage: 10, margin: 670 });
    // PnL = 50, margin = 670, ROI = 50/670 * 100 ≈ 7.46%
    expect(unrealizedRoiPct(p, 67_500)).toBeCloseTo(7.4627, 3);
  });

  it("returns 0 when margin is 0 (no division by zero)", () => {
    const p = freshPosition({ side: "long", margin: 0 });
    expect(unrealizedRoiPct(p, 67_000)).toBe(0);
  });

  it("goes negative on an unprofitable position", () => {
    const p = freshPosition({ side: "long", entryPrice: 67_000, size: 0.1, leverage: 10, margin: 670 });
    // PnL = -100, ROI = -100/670 * 100 ≈ -14.93%
    expect(unrealizedRoiPct(p, 66_000)).toBeCloseTo(-14.9254, 3);
  });
});

describe("liquidationPrice", () => {
  it("is below entry for a long", () => {
    const p = freshPosition({ side: "long", entryPrice: 67_000, leverage: 10 });
    const liq = liquidationPrice(p);
    expect(liq).toBeLessThan(67_000);
  });

  it("is above entry for a short", () => {
    const p = freshPosition({ side: "short", entryPrice: 67_000, leverage: 10 });
    const liq = liquidationPrice(p);
    expect(liq).toBeGreaterThan(67_000);
  });

  it("moves closer to entry as leverage increases", () => {
    const long10x = freshPosition({ side: "long", entryPrice: 67_000, leverage: 10 });
    const long100x = freshPosition({ side: "long", entryPrice: 67_000, leverage: 100 });
    expect(liquidationPrice(long100x)).toBeGreaterThan(liquidationPrice(long10x));
  });

  it("returns 0 when leverage is 0 (defensive)", () => {
    const p = freshPosition({ leverage: 0 });
    expect(liquidationPrice(p)).toBe(0);
  });
});

// --- Limit-order trigger predicate -----------------------------------------

describe("shouldFillLimitOrder", () => {
  it("fills a long limit when the bar's range includes the limit (low touched it)", () => {
    const order = freshOrder({ side: "long", price: 66_500 });
    // Bar opened at 67k, dropped to 66k, closed at 66.2k — range
    // includes 66.5k → should fill.
    expect(shouldFillLimitOrder(order, { low: 66_000, high: 67_000 })).toBe(true);
  });

  it("does not fill a long limit when the bar never reached the price", () => {
    const order = freshOrder({ side: "long", price: 66_500 });
    // Bar stayed above the limit (high was 67k, low was 66.6k — never
    // touched 66.5k).
    expect(shouldFillLimitOrder(order, { low: 66_600, high: 67_000 })).toBe(false);
  });

  it("fills a short limit when the bar's range includes the limit (high touched it)", () => {
    const order = freshOrder({ side: "short", price: 67_500 });
    // Bar went up to 68k, includes 67.5k.
    expect(shouldFillLimitOrder(order, { low: 66_500, high: 68_000 })).toBe(true);
  });

  it("does not fill a short limit when the bar never reached the price", () => {
    const order = freshOrder({ side: "short", price: 67_500 });
    expect(shouldFillLimitOrder(order, { low: 66_500, high: 67_400 })).toBe(false);
  });

  it("does not consider a market order (defensive)", () => {
    const order = freshOrder({ type: "market", price: null });
    expect(shouldFillLimitOrder(order, { low: 0, high: 100_000 })).toBe(false);
  });
});

// --- Market fills ----------------------------------------------------------

describe("applyMarketFill — open", () => {
  it("opens a new position, deducts margin + fee", () => {
    const state = freshAccount(10_000);
    const after = applyMarketFill(state, {
      symbol: "BTCUSDT",
      side: "long",
      size: 0.1,
      leverage: 10,
      markPrice: 67_000,
    });

    // Notional = 0.1 * 67000 = 6700, margin = 670, taker fee = 0.06% = 4.02
    expect(after.balance).toBeCloseTo(10_000 - 670 - 4.02, 5);
    expect(after.positions).toHaveLength(1);
    expect(after.positions[0]).toMatchObject({
      symbol: "BTCUSDT",
      side: "long",
      size: 0.1,
      entryPrice: 67_000,
      leverage: 10,
    });
    // margin = 670 + 4.02 fee = 674.02
    expect(after.positions[0]!.margin).toBeCloseTo(674.02, 5);
    expect(after.history).toHaveLength(1);
    expect(after.history[0]!.note).toBe("open");
    expect(after.history[0]!.fee).toBeCloseTo(4.02, 5);
  });

  it("rejects when margin exceeds balance", () => {
    const state = freshAccount(100); // tiny balance
    const after = applyMarketFill(state, {
      symbol: "BTCUSDT",
      side: "long",
      size: 0.1,
      leverage: 10,
      markPrice: 67_000,
    });
    expect(after).toBe(state);
    expect(after.positions).toHaveLength(0);
  });

  it("rejects when size is 0 or negative", () => {
    const state = freshAccount();
    const after = applyMarketFill(state, {
      symbol: "BTCUSDT",
      side: "long",
      size: 0,
      leverage: 10,
      markPrice: 67_000,
    });
    // State returned unchanged, no position.
    expect(after).toBe(state);
  });
});

describe("applyMarketFill — add", () => {
  it("averages the entry price when adding to a same-side position", () => {
    let state = freshAccount();
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 67_000,
    });
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 69_000,
    });
    // Avg entry = (67000*0.1 + 69000*0.1) / 0.2 = 68000
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0]!.size).toBeCloseTo(0.2, 6);
    expect(state.positions[0]!.entryPrice).toBeCloseTo(68_000, 6);
    // Margin stacks: 674.02 + (690 + 4.14) = 1368.16
    expect(state.positions[0]!.margin).toBeCloseTo(1368.16, 5);
  });

  it("marks the second fill as 'add' in history", () => {
    let state = freshAccount();
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 67_000,
    });
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 69_000,
    });
    expect(state.history).toHaveLength(2);
    expect(state.history[0]!.note).toBe("open");
    expect(state.history[1]!.note).toBe("add");
  });
});

describe("applyMarketFill — close via opposite side", () => {
  it("closes an existing long on a short fill, returns margin + realized PnL", () => {
    let state = freshAccount();
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 67_000,
    });
    // Price went up to 68k. Close via short.
    const after = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "short", size: 0.1, leverage: 10, markPrice: 68_000,
    });
    expect(after.positions).toHaveLength(0);
    // Balance = initial - margin1 - fee1 + margin1 + (PnL - exitFee)
    // PnL gross = (68000-67000)*0.1 = 100
    // Exit fee = 0.1*68000*0.0006 = 4.08
    // Realized PnL = 100 - 4.08 = 95.92
    // Balance = 10000 - 674.02 + 674.02 + 95.92 = 10095.92
    expect(after.balance).toBeCloseTo(10_095.92, 2);
    const closeFill = after.history.find((f) => f.note === "close");
    expect(closeFill).toBeDefined();
    expect(closeFill!.realizedPnl).toBeCloseTo(95.92, 2);
  });

  it("ignores excess size (no reverses in this build)", () => {
    let state = freshAccount();
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 67_000,
    });
    // Try to close with a short that's TWICE the size — should just
    // close the long and ignore the excess.
    const after = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "short", size: 0.2, leverage: 10, markPrice: 68_000,
    });
    expect(after.positions).toHaveLength(0);
  });
});

// --- Direct close ----------------------------------------------------------

describe("applyClose", () => {
  it("returns margin + realized PnL and records a close fill", () => {
    let state = freshAccount();
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 67_000,
    });
    const posId = state.positions[0]!.id;

    const after = applyClose(state, posId, 67_500);

    // PnL gross = (67500-67000)*0.1 = 50
    // Exit fee = 0.1*67500*0.0006 = 4.05
    // Net = 50 - 4.05 = 45.95
    // Balance = 10000 - 674.02 + 674.02 + 45.95 = 10045.95
    expect(after.balance).toBeCloseTo(10_045.95, 2);
    expect(after.positions).toHaveLength(0);
    const close = after.history.find((f) => f.note === "close");
    expect(close).toBeDefined();
    expect(close!.realizedPnl).toBeCloseTo(45.95, 2);
    expect(close!.fee).toBeCloseTo(4.05, 2);
  });

  it("is a no-op for a missing id", () => {
    const state = freshAccount();
    const after = applyClose(state, "nonexistent", 67_000);
    expect(after).toBe(state);
  });

  it("records a negative PnL on an unprofitable close", () => {
    let state = freshAccount();
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 67_000,
    });
    const posId = state.positions[0]!.id;
    const after = applyClose(state, posId, 66_000);
    const close = after.history.find((f) => f.note === "close");
    expect(close!.realizedPnl).toBeLessThan(0);
  });
});

// --- Limit fills -----------------------------------------------------------

describe("applyLimitFill", () => {
  it("opens a new position at the limit price, charges maker fee", () => {
    let state = freshAccount();
    // Place a limit: margin = 0.1 * 66500 / 10 = 665; locked
    // (no maker fee at place time — fee charged on fill)
    state = (state.openOrders.length === 0 && state.balance === 10_000)
      ? {
          ...state,
          balance: state.balance - 665,
          openOrders: [freshOrder({ price: 66_500, size: 0.1, leverage: 10 })],
        }
      : state;
    // Simulate the trigger firing at the limit price.
    const orderId = state.openOrders[0]!.id;
    const after = applyLimitFill(state, orderId, 66_500);

    expect(after.openOrders).toHaveLength(0);
    expect(after.positions).toHaveLength(1);
    expect(after.positions[0]!.entryPrice).toBe(66_500);
    // Maker fee = 0.1 * 66500 * 0.0002 = 1.33
    // Margin on position = 665 + 1.33 = 666.33
    expect(after.positions[0]!.margin).toBeCloseTo(666.33, 2);
    // Balance unchanged from the place time (no further deduction)
    expect(after.balance).toBeCloseTo(9_335, 5);
  });

  it("averages entry when adding to an existing same-side position", () => {
    let state = freshAccount();
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 67_000,
    });
    // Place a limit at 65k for 0.2 BTC, 10x. margin = 1300
    const limitOrder: OpenOrder = freshOrder({
      price: 65_000,
      size: 0.2,
      leverage: 10,
    });
    state = {
      ...state,
      balance: state.balance - (0.2 * 65_000) / 10,
      openOrders: [limitOrder],
    };
    // Fill the limit at 65k.
    const after = applyLimitFill(state, limitOrder.id, 65_000);
    // Avg entry = (67000*0.1 + 65000*0.2) / 0.3 = (6700 + 13000) / 0.3 = 19700/0.3 = 65666.67
    expect(after.positions[0]!.entryPrice).toBeCloseTo(65_666.67, 1);
  });

  it("closes an existing long when filled on the short side", () => {
    let state = freshAccount();
    state = applyMarketFill(state, {
      symbol: "BTCUSDT", side: "long", size: 0.1, leverage: 10, markPrice: 67_000,
    });
    // Place a short limit at 68k.
    const shortLimit: OpenOrder = freshOrder({
      side: "short", price: 68_000, size: 0.1, leverage: 10,
    });
    state = {
      ...state,
      balance: state.balance - (0.1 * 68_000) / 10,
      openOrders: [shortLimit],
    };
    // Fill at 68k — should close the long with profit.
    const after = applyLimitFill(state, shortLimit.id, 68_000);
    expect(after.positions).toHaveLength(0);
    const close = after.history.find((f) => f.note === "close");
    expect(close).toBeDefined();
    // PnL gross = (68000-67000)*0.1 = 100; maker fee = 0.1*68000*0.0002 = 1.36
    // Net = 100 - 1.36 = 98.64
    expect(close!.realizedPnl).toBeCloseTo(98.64, 2);
  });

  it("is a no-op for a missing id", () => {
    const state = freshAccount();
    const after = applyLimitFill(state, "nonexistent", 67_000);
    expect(after).toBe(state);
  });
});

// --- Formatting ------------------------------------------------------------

describe("formatUsdt", () => {
  it("adds thousands separators", () => {
    expect(formatUsdt(1_234_567)).toBe("1,234,567");
  });

  it("respects the maxFractionDigits option", () => {
    expect(formatUsdt(1234.5678, 2)).toBe("1,234.57");
    expect(formatUsdt(1234.5678, 0)).toBe("1,235");
  });
});
