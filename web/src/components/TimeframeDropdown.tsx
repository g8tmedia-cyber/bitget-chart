/**
 * TimeframeDropdown — controlled popover for managing which timeframes
 * are visible in the chart's row.
 *
 * Each entry has a visibility indicator:
 *   ✓  currently visible in the row
 *   +  currently hidden
 *
 * Clicking an entry toggles its visibility. This popover does NOT
 * change the selected timeframe — the user selects a timeframe by
 * clicking one of the row buttons in the chart header.
 */

import { useEffect, useRef } from "react";
import { TIMEFRAMES, type Timeframe } from "../config/timeframes";

export interface TimeframeDropdownProps {
  open: boolean;
  /** Set of labels currently visible in the row. */
  visibleTimeframes: Set<string>;
  /** Toggle a label in/out of the visible set. */
  onToggleVisibility: (label: string) => void;
  /** Currently selected timeframe (highlighted in the list). */
  selected: Timeframe;
  onClose: () => void;
}

export function TimeframeDropdown({
  open,
  visibleTimeframes,
  onToggleVisibility,
  selected,
  onClose,
}: TimeframeDropdownProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-30 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-[260px]"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-sm font-medium text-zinc-100">
          Visible timeframes
        </span>
        <button
          onClick={() => {
            /* placeholder for future custom-timeframe editor */
          }}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Edit
        </button>
      </header>

      <div className="p-2 max-h-80 overflow-auto">
        {TIMEFRAMES.map((tf) => {
          const isVisible = visibleTimeframes.has(tf.label);
          const isSelected = tf.label === selected.label;
          return (
            <button
              key={tf.label}
              onClick={() => onToggleVisibility(tf.label)}
              className={[
                "w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2",
                isSelected
                  ? "bg-zinc-700/60 text-zinc-100"
                  : "text-zinc-300 hover:bg-zinc-800",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "w-4 inline-flex items-center justify-center text-xs",
                  isVisible ? "text-emerald-400" : "text-zinc-600",
                ].join(" ")}
              >
                {isVisible ? "✓" : "+"}
              </span>
              <span className={isVisible ? "" : "text-zinc-500"}>
                {tf.label}
              </span>
              {isSelected && (
                <span className="ml-auto text-[10px] text-cyan-400 uppercase tracking-wider">
                  active
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
