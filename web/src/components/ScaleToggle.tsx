/**
 * ChartControls — two independent controls:
 *
 *   - Auto  : stateless reset button. Clicking it calls `timeScale().fitContent()`
 *             on the chart, snapping the viewport back to show all data. It
 *             does NOT change the price-axis mode.
 *   - Log   : standalone on/off toggle. On = logarithmic price scale,
 *             off = linear (the default).
 */

export interface ScaleToggleProps {
  logScale: boolean;
  onLogChange: (v: boolean) => void;
  onReset: () => void;
}

export function ScaleToggle({
  logScale,
  onLogChange,
  onReset,
}: ScaleToggleProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={onReset}
        className="px-2 py-1 rounded text-xs font-medium bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
        title="Reset viewport (fit all data)"
      >
        Auto
      </button>
      <button
        onClick={() => onLogChange(!logScale)}
        className={[
          "px-2 py-1 rounded text-xs font-medium border transition-colors",
          logScale
            ? "bg-zinc-100 text-zinc-900 border-zinc-100"
            : "bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-zinc-100",
        ].join(" ")}
        title={
          logScale
            ? "Switch price axis to linear"
            : "Switch price axis to logarithmic"
        }
      >
        Log
      </button>
    </div>
  );
}
