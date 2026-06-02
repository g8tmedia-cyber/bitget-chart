/**
 * TimeframeSelector — plain-text row of timeframe buttons.
 *
 * Layout: [1m] [5m] [15m] [1D] [1W] [1M]   [▾]
 *                                          ^-- separate chevron button,
 *                                              not part of any timeframe
 *
 * Only renders the timeframes whose label is in `visibleTimeframes`.
 * The chevron on the right is a separate clickable element.
 *
 * The root container is `position: relative` so any children passed
 * in (e.g. the visibility-manager dropdown) can anchor themselves to
 * the chevron via `absolute right-0 top-full`.
 *
 * Clicking a timeframe button selects it (candlestick view). Clicking
 * the chevron opens the dropdown (visibility manager). The two
 * triggers are independent.
 */

import type { ReactNode } from "react";
import { TIMEFRAMES, type Timeframe } from "../config/timeframes";

export interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
  /**
   * Set of timeframe labels currently visible in the row. Timeframes
   * not in this set are not rendered.
   */
  visibleTimeframes: Set<string>;
  /**
   * Called when the chevron on the right is clicked. Use this to
   * open the visibility-manager dropdown elsewhere.
   */
  onChevronClick?: () => void;
  disabled?: boolean;
  /**
   * Optional children rendered inside the same `relative` container
   * as the chevron, so an absolute-positioned popover can anchor to
   * the chevron (use `absolute right-0 top-full`).
   */
  children?: ReactNode;
}

export function TimeframeSelector({
  value,
  onChange,
  visibleTimeframes,
  onChevronClick,
  disabled,
  children,
}: TimeframeSelectorProps) {
  const visible = TIMEFRAMES.filter((tf) => visibleTimeframes.has(tf.label));

  return (
    <div className="relative flex items-center gap-1 text-xs select-none">
      {visible.length === 0 ? (
        <span className="text-zinc-500 italic px-1">
          (empty — open the picker)
        </span>
      ) : (
        visible.map((tf) => {
          const active = tf.label === value.label;
          return (
            <button
              key={tf.label}
              onClick={() => onChange(tf)}
              disabled={disabled}
              className={[
                "px-1 py-0.5 rounded-sm transition-colors",
                active
                  ? "text-zinc-100 font-semibold"
                  : "text-zinc-500 hover:text-zinc-200",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
              title={tf.label}
            >
              {tf.label}
            </button>
          );
        })
      )}

      {/* Separate chevron on the right of the row. Not part of any
          timeframe button — its only job is to open the visibility
          manager dropdown. */}
      {onChevronClick && (
        <button
          onClick={onChevronClick}
          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Customize visible timeframes"
          aria-label="Customize visible timeframes"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-2.5 h-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>
      )}

      {/* Children (e.g. the visibility-manager dropdown) anchor
          themselves to this `relative` container, so positioning
          `absolute right-0 top-full` lands directly under the
          chevron. */}
      {children}
    </div>
  );
}
