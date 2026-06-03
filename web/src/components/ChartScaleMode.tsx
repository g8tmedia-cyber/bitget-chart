/**
 * ChartScaleMode — bottom-right scale controls.
 *
 * Two buttons:
 *   - %      : percentage (each bar shown as % change from a reference)
 *   - log    : toggle between logarithmic and linear (auto) scale.
 *              Clicking while in log → switch to linear. Clicking
 *              while in linear (or percent) → switch to log.
 *
 * Note: the underlying "linear" mode is `auto` in our ScaleMode
 * type — same chart behavior, just a different label for the
 * user. The toggle preserves the auto-fit behavior of `auto`
 * (handled by ChartPane).
 */

export type ScaleMode = "auto" | "log" | "percent";

export interface ChartScaleModeProps {
  value: ScaleMode;
  onChange: (mode: ScaleMode) => void;
}

export function ChartScaleMode({ value, onChange }: ChartScaleModeProps) {
  const handleLogToggle = () => {
    // log ↔ auto. If currently on percent, fall through to log.
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
    </div>
  );
}
