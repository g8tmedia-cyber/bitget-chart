/**
 * TimezoneSelect — click-to-open dropdown for picking the chart's
 * UTC offset. Replaces the previous cycle-clock button.
 *
 * Layout (mirrors the reference screenshot):
 *   - Trigger:  "HH:MM:SS UTC±N" (live, ticks every second)
 *   - Dropdown (anchored above the trigger):
 *       UTC                         ← offset 0, plain
 *       Exchange                    ← section header
 *       (UTC-10) Honolulu
 *       (UTC-8)  Anchorage
 *       ...
 *
 * The selected offset is stored as a number (positive or negative
 * hours from UTC). Special "UTC" entry is offset 0 with no city.
 *
 * Click-outside / Escape closes the menu.
 */

import { useEffect, useRef, useState } from "react";

const TIMEZONE_OPTIONS: ReadonlyArray<{ offset: number; city: string }> = [
  { offset: -10, city: "Honolulu" },
  { offset: -8, city: "Anchorage" },
  { offset: -8, city: "Juneau" },
  { offset: -7, city: "Los Angeles" },
  { offset: -7, city: "Phoenix" },
  { offset: -7, city: "Vancouver" },
  { offset: -6, city: "Denver" },
  { offset: -6, city: "Mexico City" },
  { offset: -6, city: "San Salvador" },
  { offset: -5, city: "Bogota" },
  { offset: -5, city: "Chicago" },
  { offset: -5, city: "Lima" },
  { offset: -5, city: "New York" },
  { offset: -4, city: "Santiago" },
  { offset: -4, city: "Toronto" },
  { offset: -3, city: "Buenos Aires" },
  { offset: -3, city: "Sao Paulo" },
  { offset: -1, city: "Azores" },
  { offset: 0, city: "London" },
  { offset: 0, city: "Lisbon" },
  { offset: 0, city: "Reykjavik" },
  { offset: 1, city: "Berlin" },
  { offset: 1, city: "Paris" },
  { offset: 1, city: "Rome" },
  { offset: 2, city: "Athens" },
  { offset: 2, city: "Cairo" },
  { offset: 2, city: "Helsinki" },
  { offset: 3, city: "Istanbul" },
  { offset: 3, city: "Moscow" },
  { offset: 3, city: "Nairobi" },
  { offset: 3, city: "Riyadh" },
  { offset: 4, city: "Dubai" },
  { offset: 4, city: "Tbilisi" },
  { offset: 5, city: "Karachi" },
  { offset: 5, city: "Tashkent" },
  { offset: 5, city: "Yekaterinburg" },
  { offset: 5, city: "Mumbai" },
  { offset: 5, city: "Colombo" },
  { offset: 6, city: "Dhaka" },
  { offset: 7, city: "Bangkok" },
  { offset: 7, city: "Jakarta" },
  { offset: 8, city: "Hong Kong" },
  { offset: 8, city: "Singapore" },
  { offset: 8, city: "Beijing" },
  { offset: 8, city: "Manila" },
  { offset: 9, city: "Tokyo" },
  { offset: 9, city: "Seoul" },
  { offset: 10, city: "Sydney" },
  { offset: 10, city: "Brisbane" },
  { offset: 12, city: "Auckland" },
  { offset: 13, city: "Samoa" },
];

export interface TimezoneSelectProps {
  /** Offset from UTC in hours (e.g. -4, 0, 8). UTC entry is 0. */
  offset: number;
  onChange: (offset: number) => void;
}

export function TimezoneSelect({ offset, onChange }: TimezoneSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Live clock — tick every second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Close on click outside / Escape.
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

  const handleSelect = (next: number) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors tabular-nums"
        title="Change timezone (UTC offset for the X-axis labels)"
      >
        {formatClock(now, offset)}
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-30 w-56 max-h-80 overflow-auto bg-zinc-900 border border-zinc-800 rounded shadow-2xl text-sm">
          <button
            onClick={() => handleSelect(0)}
            className={[
              "w-full text-left px-3 py-1.5 transition-colors",
              offset === 0
                ? "bg-zinc-700/60 text-zinc-100"
                : "text-zinc-200 hover:bg-zinc-800/60",
            ].join(" ")}
          >
            UTC
          </button>
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 border-y border-zinc-800">
            Exchange
          </div>
          {TIMEZONE_OPTIONS.map((opt) => {
            const isActive = opt.offset === offset;
            return (
              <button
                key={`${opt.offset}-${opt.city}`}
                onClick={() => handleSelect(opt.offset)}
                className={[
                  "w-full text-left px-3 py-1 transition-colors tabular-nums",
                  isActive
                    ? "bg-zinc-700/60 text-zinc-100"
                    : "text-zinc-300 hover:bg-zinc-800/60",
                ].join(" ")}
              >
                ({formatOffset(opt.offset)}) {opt.city}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Format a Date for the trigger, applying the given UTC offset in hours. */
function formatClock(nowMs: number, offsetHours: number): string {
  const shifted = new Date(nowMs + offsetHours * 3_600_000);
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  const ss = String(shifted.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} ${formatOffset(offsetHours)}`;
}

/** `+0`, `+8`, `-5`, etc. — `+0` is special-cased so the trigger shows `UTC+0`. */
export function formatOffset(offsetHours: number): string {
  if (offsetHours === 0) return "UTC+0";
  return offsetHours > 0 ? `UTC+${offsetHours}` : `UTC${offsetHours}`;
}
