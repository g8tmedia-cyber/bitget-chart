import { TIMEFRAMES, type Timeframe } from "../config/timeframes";

export interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
  /**
   * Called when the chevron on the last entry is clicked. Use this to
   * open a fuller "select interval" popover elsewhere.
   */
  onChevronClick?: () => void;
  disabled?: boolean;
}

/**
 * Plain-text timeframe picker that matches the reference layout:
 * active TF in white, others in dim grey, no border / background.
 * A small chevron sits next to the last entry — clicking the
 * chevron fires `onChevronClick` (the parent typically uses this
 * to open an interval-selector popover), clicking the label
 * itself selects the timeframe.
 */
export function TimeframeSelector({
  value,
  onChange,
  onChevronClick,
  disabled,
}: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 text-xs select-none">
      {TIMEFRAMES.map((tf, i) => {
        const active = tf.label === value.label;
        const isLast = i === TIMEFRAMES.length - 1;
        return (
          <button
            key={tf.label}
            onClick={() => onChange(tf)}
            disabled={disabled}
            className={[
              "px-1 py-0.5 rounded-sm transition-colors",
              "inline-flex items-center gap-1",
              active
                ? "text-zinc-100 font-semibold"
                : "text-zinc-500 hover:text-zinc-200",
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
            title={tf.label}
          >
            <span>{tf.label}</span>
            {isLast && (
              <span
                role={onChevronClick ? "button" : undefined}
                onClick={(e) => {
                  if (!onChevronClick) return;
                  e.stopPropagation();
                  onChevronClick();
                }}
                className={[
                  "inline-flex items-center",
                  onChevronClick ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
                title="Open interval selector"
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
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
