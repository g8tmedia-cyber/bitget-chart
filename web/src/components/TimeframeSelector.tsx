import { TIMEFRAMES, type Timeframe } from "../config/timeframes";

export interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
  disabled?: boolean;
}

export function TimeframeSelector({
  value,
  onChange,
  disabled,
}: TimeframeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TIMEFRAMES.map((tf) => {
        const active = tf.label === value.label;
        return (
          <button
            key={tf.label}
            onClick={() => onChange(tf)}
            disabled={disabled}
            className={[
              "px-3 py-1 rounded text-xs font-medium transition-colors",
              "border",
              active
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-zinc-100",
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
}
