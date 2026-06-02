/**
 * TradingForm — visual-only order entry form. No engine behind it
 * yet. Mirrors the Bitget terminal's right-column form:
 *
 *   [Cross] [10x]   <- margin mode + leverage (single segmented row)
 *   Open           <- (Close removed; closes happen via Positions list)
 *   Limit | Market | Post only
 *   Available  0.0000 USDT
 *   Price  [____] [BBO]
 *   Quantity [____]  BTC⌄
 *   ●---●---●---●---●  0% 25% 50% 75% 100%
 *   Cost  0.00 / 0.00 USDT
 *   ☐ TP/SL
 *   Time in force [GTC ⌄]
 *   [ Open long ]  [ Open short ]
 *   Max 0.0000 BTC | 0.0000 BTC
 *
 * The Open long / Open short buttons log a placeholder for now —
 * the actual demo engine lands in a later commit.
 */

import { useEffect, useMemo, useState } from "react";
import { getContractInfo } from "../api/bitget";
import type { PublicTrade } from "../api/bitget";

export interface TradingFormProps {
  symbol: string;
  /** Latest trade price from the market-trades stream, for BBO / cost preview. */
  latestPrice: number | null;
  /** Latest trade object, used to display "live" price next to BBO. */
  latestTrade?: PublicTrade | null;
}

type OrderType = "limit" | "market" | "post_only";
type Tif = "GTC" | "IOC" | "FOK";

const LEVERAGE_TIERS = [1, 5, 10, 20, 25, 50, 75, 100, 125, 150] as const;

export function TradingForm({ symbol, latestPrice }: TradingFormProps) {
  const [leverage, setLeverage] = useState<number>(10);
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [quantityPct, setQuantityPct] = useState<number>(0);
  const [tpSl, setTpSl] = useState(false);
  const [tif, setTif] = useState<Tif>("GTC");
  const [maxLever, setMaxLever] = useState<number>(150);

  // Fetch the per-symbol max leverage whenever the symbol changes.
  useEffect(() => {
    let cancelled = false;
    getContractInfo(symbol)
      .then((info) => {
        if (cancelled) return;
        if (info?.maxLever) {
          setMaxLever(info.maxLever);
          // Clamp current leverage to the new max.
          setLeverage((cur) => Math.min(cur, info.maxLever!));
        }
      })
      .catch(() => {
        // Ignore — default to 150x.
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Auto-fill price with the latest trade price when the user
  // hasn't typed anything yet and we have a fresh tick.
  const bbo = latestPrice;
  const cost = useMemo(() => {
    const q = parseFloat(quantity);
    const p = orderType === "market" ? bbo ?? 0 : parseFloat(price);
    if (!isFinite(q) || !isFinite(p)) return 0;
    return q * p;
  }, [quantity, price, bbo, orderType]);

  const handleBbo = () => {
    if (bbo != null) setPrice(bbo.toString());
  };

  const setQtyPct = (pct: number) => {
    setQuantityPct(pct);
    // Pretend balance is $10,000 for the visual.
    const balance = 10_000;
    const notional = (balance * leverage * pct) / 100;
    if (bbo && bbo > 0) {
      setQuantity((notional / bbo).toFixed(4));
    }
  };

  const handleSubmit = (side: "long" | "short") => {
    // Placeholder — the demo engine lands later.
    // eslint-disable-next-line no-console
    console.log(
      `[trading form] ${side.toUpperCase()} ${orderType} ${quantity} ${symbol} @ ${price || bbo} (${leverage}x, TIF=${tif}, TP/SL=${tpSl})`,
    );
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
          <div className="flex flex-wrap gap-1">
            {LEVERAGE_TIERS.filter((l) => l <= maxLever).map((l) => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className={[
                  "px-1.5 py-0.5 rounded text-[11px] transition-colors",
                  l === leverage
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-200",
                ].join(" ")}
              >
                {l}x
              </button>
            ))}
          </div>
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
          {(["limit", "market", "post_only"] as OrderType[]).map((t) => (
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
              {t === "post_only" ? "Post only" : t === "limit" ? "Limit" : "Market"}
            </button>
          ))}
          <span className="ml-auto text-zinc-600">ⓘ</span>
        </div>
      </div>

      {/* Available */}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">Available</span>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-200 tabular-nums">0.0000 USDT</span>
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

      {/* Cost */}
      <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">Cost</span>
        <span className="text-zinc-300 tabular-nums">
          {cost.toFixed(2)} <span className="text-zinc-600">/</span>{" "}
          {orderType === "market" ? "0.00" : "0.00"} USDT
        </span>
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
        <span>Max: 0.0000 BTC</span>
        <span>Max: 0.0000 BTC</span>
      </div>
    </div>
  );
}
