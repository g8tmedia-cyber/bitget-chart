/**
 * ChartScaleMode — 3-way price-scale mode toggle.
 *
 *  - auto    : linear (default) + auto-scale; clicking it also re-fits
 *              the time scale (the "reset" action the user expects)
 *  - log     : logarithmic
 *  - percent : percentage (each bar shown as % change from a reference)
 */

export type ScaleMode = "auto" | "log" | "percent";

export interface ChartScaleModeProps {
  value: ScaleMode;
  onChange: (mode: ScaleMode) => void;
}

export function ChartScaleMode({ value, onChange }: ChartScaleModeProps) {
  return (
    <div className="inline-flex items-center bg-zinc-900/80 border border-zinc-800 rounded text-[11px] font-medium overflow-hidden">
      {(["percent", "log", "auto"] as const).map((mode) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={[
              "px-2 py-1 transition-colors",
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-100",
            ].join(" ")}
            title={
              mode === "auto"
                ? "Linear (auto-fit)"
                : mode === "log"
                  ? "Logarithmic"
                  : "Percentage"
            }
          >
            {mode === "percent" ? "%" : mode}
          </button>
        );
      })}
    </div>
  );
}
