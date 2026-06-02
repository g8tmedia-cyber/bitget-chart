/**
 * LeverageModal — modal opened from the trading form's leverage
 * button. Mirrors the Bitget "Adjust leverage" UI:
 *
 *   Title: "Adjust leverage"
 *   Subtitle: "If you adjust the leverage now, all positions and
 *              pending orders will be affected."
 *   Header: "<SYMBOL> · <Margin mode>"
 *   Number input with up/down spinners
 *   Slider with major tick marks at 1x, 30x, 60x, 90x, 120x, 150x
 *   "Max. open after adjusting leverage: <balance × lev> USDT"
 *   Cancel | Confirm
 *
 * The slider is continuous between minLever and maxLever; the tick
 * marks are just visual reference. The number input is the precise
 * way to set the value. Both are synced.
 *
 * Visual-only for now (no engine): Confirm logs to console and
 * applies the new leverage via onConfirm.
 */

import { useEffect, useState } from "react";

const SLIDER_TICKS = [1, 30, 60, 90, 120, 150] as const;

export interface LeverageModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the new leverage when the user clicks Confirm. */
  onConfirm: (leverage: number) => void;
  symbol: string;
  marginMode: string;
  initialLeverage: number;
  minLever: number;
  maxLever: number;
  /** Demo balance in USDT — used to compute the max-open readout. */
  balance: number;
}

export function LeverageModal({
  open,
  onClose,
  onConfirm,
  symbol,
  marginMode,
  initialLeverage,
  minLever,
  maxLever,
  balance,
}: LeverageModalProps) {
  const [leverage, setLeverage] = useState(initialLeverage);

  // Reset to the parent's current leverage every time the modal
  // opens, so Cancel doesn't leave a half-edited value behind.
  useEffect(() => {
    if (open) setLeverage(initialLeverage);
  }, [open, initialLeverage]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const maxOpen = balance * leverage;
  const visibleTicks = SLIDER_TICKS.filter(
    (t) => t >= minLever && t <= maxLever,
  );

  const clamp = (v: number) =>
    Math.max(minLever, Math.min(maxLever, Math.round(v)));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (!Number.isNaN(v)) setLeverage(clamp(v));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLeverage(clamp(Number(e.target.value)));
  };

  const handleConfirm = () => {
    onConfirm(leverage);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-[440px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-semibold text-zinc-100">
            Adjust leverage
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 -mt-1 -mr-1 p-1"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 16 16"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          If you adjust the leverage now, all positions and pending
          orders will be affected.
        </p>

        {/* Symbol + margin mode */}
        <div className="text-sm text-zinc-300 mb-5">
          {symbol} · {marginMode}
        </div>

        {/* Leverage label */}
        <div className="text-sm text-zinc-300 mb-2">Leverage</div>

        {/* Number input with up/down spinners */}
        <div className="flex items-stretch bg-zinc-800 border border-zinc-700 rounded mb-5 overflow-hidden">
          <input
            type="text"
            value={leverage}
            onChange={handleInputChange}
            className="flex-1 min-w-0 bg-transparent px-3 py-2 text-zinc-100 text-sm focus:outline-none tabular-nums"
          />
          <span className="text-zinc-500 px-2 self-center text-sm">x</span>
          <div className="flex flex-col border-l border-zinc-700">
            <button
              onClick={() => setLeverage(clamp(leverage + 1))}
              className="px-2 py-0.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 text-[10px] leading-none"
              aria-label="Increase"
            >
              ▲
            </button>
            <button
              onClick={() => setLeverage(clamp(leverage - 1))}
              className="px-2 py-0.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 border-t border-zinc-700 text-[10px] leading-none"
              aria-label="Decrease"
            >
              ▼
            </button>
          </div>
        </div>

        {/* Slider with tick marks */}
        <div className="mb-5">
          <input
            type="range"
            min={minLever}
            max={maxLever}
            value={leverage}
            onChange={handleSliderChange}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1 px-0.5 tabular-nums">
            {visibleTicks.map((t) => (
              <span key={t}>{t}x</span>
            ))}
          </div>
        </div>

        {/* Max open */}
        <div className="flex items-center justify-between text-sm mb-6">
          <span className="text-zinc-400">
            Max. open after adjusting leverage
          </span>
          <span className="text-zinc-100 tabular-nums">
            {maxOpen.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
            <span className="text-zinc-500">USDT</span>
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
