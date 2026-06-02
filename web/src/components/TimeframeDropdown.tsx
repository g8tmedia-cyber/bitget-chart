/**
 * TimeframeDropdown — popover that opens when the chart's top-bar
 * "Time" trigger is clicked. Mirrors the reference image:
 *
 *   Select interval                                  Edit
 *   ┌──────┬─────────────────────────────────────────┐
 *   │ Time │  1m   3m   5m  15m                       │
 *   │  5m  │  30m  1D   3D  1W                       │
 *   │ 15m  │  1M                                     │
 *   │ ...  │                                         │
 *   └──────┴─────────────────────────────────────────┘
 *
 * - The left "Time" column shows the curated quick-pick list.
 * - The right grid shows ALL supported timeframes in 4 columns.
 * - The currently active one is highlighted everywhere it appears.
 * - Clicking any cell applies the selection and closes the popover.
 * - Click-outside / Escape closes without changing anything.
 */

import { useEffect, useRef, useState } from "react";
import {
  TIMEFRAMES,
  TIME_QUICK_PICKS,
  type Timeframe,
} from "../config/timeframes";

export interface TimeframeDropdownProps {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
  disabled?: boolean;
}

export function TimeframeDropdown({
  value,
  onChange,
  disabled,
}: TimeframeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (tf: Timeframe) => {
    onChange(tf);
    setOpen(false);
  };

  const quickPicks = TIME_QUICK_PICKS.map((label) =>
    TIMEFRAMES.find((t) => t.label === label),
  ).filter((t): t is Timeframe => t != null);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={[
          "px-2 py-0.5 text-xs rounded-sm transition-colors",
          "text-zinc-500 hover:text-zinc-100",
          disabled
            ? "opacity-40 cursor-not-allowed"
            : "cursor-pointer",
        ].join(" ")}
      >
        Time
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-[420px]">
          <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-sm font-medium text-zinc-100">
              Select interval
            </span>
            <button
              onClick={() => {
                /* placeholder for future "manage favorites" panel */
              }}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Edit
            </button>
          </header>

          <div className="flex p-3 gap-3">
            {/* Left "Time" quick-pick column */}
            <div className="w-16 shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 px-1">
                Time
              </div>
              <div className="flex flex-col gap-1">
                {quickPicks.map((tf) => (
                  <button
                    key={tf.label}
                    onClick={() => choose(tf)}
                    className={[
                      "px-2 py-1.5 text-xs rounded-md text-center transition-colors",
                      tf.label === value.label
                        ? "bg-zinc-700 text-zinc-100 font-medium"
                        : "text-zinc-300 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right grid: all timeframes in 4 columns */}
            <div className="flex-1 grid grid-cols-4 gap-1.5 auto-rows-min">
              {TIMEFRAMES.map((tf) => {
                const active = tf.label === value.label;
                return (
                  <button
                    key={tf.label}
                    onClick={() => choose(tf)}
                    className={[
                      "px-2 py-2 text-xs rounded-md text-center transition-colors",
                      active
                        ? "bg-zinc-700 text-zinc-100 font-medium"
                        : "text-zinc-300 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
