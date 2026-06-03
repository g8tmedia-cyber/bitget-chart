/**
 * ChartScaleMode — bottom-right scale controls.
 *
 * Three buttons:
 *   - %      : percentage (each bar shown as % change from a reference)
 *   - log    : toggle between logarithmic and linear (auto) scale.
 *              Clicking while in log → switch to linear. Clicking
 *              while in linear (or percent) → switch to log.
 *   - auto   : explicit "linear + auto-fit" mode (re-fits the
 *              time scale and autoscales the price scale).
 *
 * The log/auto pair behave as a toggle: log ↔ auto. % is its
 * own thing. auto is also reachable directly for users who
 * want to be explicit about resetting the chart.
 */

export type ScaleMode = "auto" | "log" | "percent";

export interface ChartScaleModeProps {
  value: ScaleMode;
  onChange: (mode: ScaleMode) => void;
}

export function ChartScaleMode({ value, onChange }: ChartScaleModeProps) {
  const handleLogToggle = () => {
    // log ↔ auto. From percent, jump straight to log.
    onChange(value === "log" ? "auto" : "log");
  };

  return (
    <div className="inline-flex items-center bg-zinc-900/80 border border-zinc-800 rounded text-[11px] font-medium overflow-hidden">
      <button
        onClick={() => onChange("percent")}
        className={[
          "px-2 py-1 transition-colors",
          value === "percent"
            ? "bg-zinc-100 text-zinc-900"
            : "text-zinc-400 hover:text-zinc-100",
        ].join(" ")}
        title="Percentage"
      >
        %
      </button>
      <button
        onClick={handleLogToggle}
        className={[
          "px-2 py-1 transition-colors",
          value === "log"
            ? "bg-zinc-100 text-zinc-900"
            : "text-zinc-400 hover:text-zinc-100",
        ].join(" ")}
        title={value === "log" ? "Switch to linear" : "Switch to logarithmic"}
      >
        log
      </button>
      <button
        onClick={() => onChange("auto")}
        className={[
          "px-2 py-1 transition-colors",
          value === "auto"
            ? "bg-zinc-100 text-zinc-900"
            : "text-zinc-400 hover:text-zinc-100",
        ].join(" ")}
        title="Linear (auto-fit)"
      >
        auto
      </button>
    </div>
  );
}
