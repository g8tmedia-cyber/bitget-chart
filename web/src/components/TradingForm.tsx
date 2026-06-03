/**
 * TradingForm — order entry form. Wires the Open long/short
 * buttons to the demo trading engine via `onPlaceMarketOrder`.
 *
 * Mirrors the Bitget terminal's right-column form:
 *
 *   [Cross] [10x]   <- margin mode + leverage (clickable)
 *   Open           <- (Close removed; closes via Positions list)
 *   Limit | Market
 *   Available  X USDT
 *   Price  [____] [BBO]
 *   Quantity [____]  BTC⌄
 *   ●---●---●---●---●  0% 25% 50% 75% 100%
 *   Cost / Margin  0.00 / 0.00 USDT
 *   ☐ TP/SL
 *   Time in force [GTC ⌄]
 *   [ Open long ]  [ Open short ]
 *   Max X BTC | X BTC
 */

import { useEffect, useMemo, useState } from "react";
import { getContractInfo } from "../api/bitget";
import type { PublicTrade } from "../api/bitget";
import { LeverageModal } from "./LeverageModal";
import type {
  PlaceLimitOrderParams,
  PlaceMarketOrderParams,
} from "../hooks/useDemoAccount";

export interface TradingFormProps {
  symbol: string;
  /** Latest trade price, used as BBO / fill price / mark. */
  latestPrice: number | null;
  /** Latest trade object, kept for future use. */
  latestTrade?: PublicTrade | null;
  /** Demo balance in USDT. */
  balance: number;
  /** Called when the user clicks Open long/short on a market order. */
  onPlaceMarketOrder: (params: PlaceMarketOrderParams) => void;
  /** Called when the user clicks Open long/short on a limit order. */
  onPlaceLimitOrder: (params: PlaceLimitOrderParams) => void;
}

type OrderType = "limit" | "market";
type Tif = "GTC" | "IOC" | "FOK";

export function TradingForm({
  symbol,
  latestPrice,
  balance,
  onPlaceMarketOrder,
  onPlaceLimitOrder,
}: TradingFormProps) {
  const [leverage, setLeverage] = useState<number>(10);
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [quantityPct, setQuantityPct] = useState<number>(0);
  const [tpSl, setTpSl] = useState(false);
  const [tif, setTif] = useState<Tif>("GTC");
  const [minLever, setMinLever] = useState<number>(1);
  const [maxLever, setMaxLever] = useState<number>(150);
  const [leverageModalOpen, setLeverageModalOpen] = useState(false);

  // Fetch the per-symbol min/max leverage whenever the symbol changes.
  useEffect(() => {
    let cancelled = false;
    getContractInfo(symbol)
      .then((info) => {
        if (cancelled) return;
        if (info?.minLever) setMinLever(info.minLever);
        if (info?.maxLever) {
          setMaxLever(info.maxLever);
          setLeverage((cur) => Math.min(cur, info.maxLever!));
        }
      })
      .catch(() => {
        // Ignore — default to 1–150x.
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const bbo = latestPrice;
  const cost = useMemo(() => {
    const q = parseFloat(quantity);
    const p = orderType === "market" ? bbo ?? 0 : parseFloat(price);
    if (!isFinite(q) || !isFinite(p)) return 0;
    return q * p;
  }, [quantity, price, bbo, orderType]);

  // Max BTC the user can buy at the current leverage, given the
  // demo balance and the latest price. Both sides of the form
  // (long and short) get the same value since the demo treats them
  // symmetrically.
  const maxBtc = useMemo(() => {
    if (!bbo || bbo <= 0 || leverage <= 0 || balance <= 0) return 0;
    return (balance * leverage) / bbo;
  }, [balance, leverage, bbo]);

  const handleBbo = () => {
    if (bbo != null) setPrice(bbo.toString());
  };

  const setQtyPct = (pct: number) => {
    setQuantityPct(pct);
    const notional = (balance * leverage * pct) / 100;
    if (bbo && bbo > 0) {
      setQuantity((notional / bbo).toFixed(4));
    }
  };

  const handleSubmit = (side: "long" | "short") => {
    if (!bbo || bbo <= 0) return;
    const q = parseFloat(quantity);
    if (!isFinite(q) || q <= 0) return;

    if (orderType === "market") {
      onPlaceMarketOrder({
        symbol,
        side,
        size: q,
        leverage,
        markPrice: bbo,
      });
    } else {
      // Limit order — require an explicit price.
      const limitPrice = parseFloat(price);
      if (!isFinite(limitPrice) || limitPrice <= 0) return;
      onPlaceLimitOrder({
        symbol,
        side,
        size: q,
        leverage,
        price: limitPrice,
        tif,
      });
    }
    // Clear the quantity so the next order starts fresh.
    setQuantity("");
    setQuantityPct(0);
  };

  return (
    <div className="text-xs">
      {/* Margin mode + leverage row */}
      <div className="grid grid-cols-2 border-b border-zinc-800">
        <div className="px-3 py-2 border-r border-zinc-800">
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
            Margin mode
          </div>
          <div className="text-zinc-100 text-sm font-medium">Cross</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Leverage</span>
            <span className="text-zinc-600 normal-case tracking-normal">
              max {maxLever}x
            </span>
          </div>
          {/* Single clickable button that opens the leverage modal */}
          <button
            onClick={() => setLeverageModalOpen(true)}
            className="w-full text-left px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-medium transition-colors"
          >
            {leverage}x
          </button>
        </div>
      </div>

      {/* Open (Close removed) */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="grid grid-cols-2 rounded bg-zinc-800/40 p-0.5">
          <button className="py-1 text-[11px] rounded bg-zinc-700 text-zinc-100">
            Open
          </button>
          <button
            className="py-1 text-[11px] rounded text-zinc-500 cursor-not-allowed"
            title="Close via the Positions list below"
            disabled
          >
            Close
          </button>
        </div>
      </div>

      {/* Order type */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-1 text-[11px]">
          {(["limit", "market"] as OrderType[]).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={[
                "px-2 py-0.5 rounded transition-colors",
                orderType === t
                  ? "text-zinc-100 font-medium"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {t === "limit" ? "Limit" : "Market"}
            </button>
          ))}
          <span className="ml-auto text-zinc-600">ⓘ</span>
        </div>
      </div>

      {/* Available */}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">Available</span>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-200 tabular-nums">
            {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDT
          </span>
          <button
            className="text-zinc-500 hover:text-zinc-200"
            title="Transfer"
          >
            ⇄
          </button>
        </div>
      </div>

      {/* Price (Limit only) */}
      {orderType === "limit" && (
        <div className="px-3 py-2 border-b border-zinc-800">
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
            Price
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={bbo ? bbo.toFixed(2) : "0.00"}
              className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 text-sm tabular-nums focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handleBbo}
              className="px-2 py-1 text-[10px] rounded bg-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
              title="Best bid/offer"
            >
              BBO
            </button>
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
          Quantity
        </div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 text-sm tabular-nums focus:outline-none focus:border-zinc-500"
          />
          <span className="text-zinc-500 text-xs">BTC ⌄</span>
        </div>
        {/* Slider */}
        <div className="mt-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={quantityPct}
            onChange={(e) => setQtyPct(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[9px] text-zinc-500 tabular-nums">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Cost / Margin — notional on the left, required margin
          (cost ÷ leverage) on the right. Both update live with
          quantity, price, and leverage. */}
      <div className="px-3 py-1.5 border-b border-zinc-800">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500">Cost / Margin</span>
          <span className="text-zinc-300 tabular-nums">
            {cost.toFixed(2)}{" "}
            <span className="text-zinc-600">/</span>{" "}
            {leverage > 0 ? (cost / leverage).toFixed(2) : "0.00"} USDT
          </span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider">
          <span>notional</span>
          <span>margin</span>
        </div>
      </div>

      {/* TP/SL */}
      <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center gap-2 text-[11px]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={tpSl}
            onChange={(e) => setTpSl(e.target.checked)}
            className="accent-emerald-500"
          />
          <span className="text-zinc-300">TP/SL</span>
        </label>
        {tpSl && (
          <span className="ml-auto text-zinc-500 text-[10px]">
            (visual only)
          </span>
        )}
      </div>

      {/* Time in force */}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">Time in force</span>
        <select
          value={tif}
          onChange={(e) => setTif(e.target.value as Tif)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-zinc-200 text-[11px] focus:outline-none focus:border-zinc-500"
        >
          <option value="GTC">GTC</option>
          <option value="IOC">IOC</option>
          <option value="FOK">FOK</option>
        </select>
      </div>

      {/* Open long / Open short */}
      <div className="grid grid-cols-2 gap-2 px-3 py-3">
        <button
          onClick={() => handleSubmit("long")}
          className="py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-semibold transition-colors"
        >
          Open long
        </button>
        <button
          onClick={() => handleSubmit("short")}
          className="py-2 rounded bg-red-500 hover:bg-red-400 text-zinc-950 text-sm font-semibold transition-colors"
        >
          Open short
        </button>
      </div>

      {/* Max per side */}
      <div className="px-3 pb-3 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Max: {maxBtc.toFixed(4)} BTC</span>
        <span>Max: {maxBtc.toFixed(4)} BTC</span>
      </div>

      {/* Leverage modal */}
      <LeverageModal
        open={leverageModalOpen}
        onClose={() => setLeverageModalOpen(false)}
        onConfirm={(l) => setLeverage(l)}
        symbol={symbol}
        marginMode="Cross"
        initialLeverage={leverage}
        minLever={minLever}
        maxLever={maxLever}
        balance={balance}
      />
    </div>
  );
}
