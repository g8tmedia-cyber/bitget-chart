/**
 * TimezoneSelect — click-to-open dropdown for picking the chart's
 * timezone. IANA-aware so DST is handled automatically.
 *
 * Layout (mirrors the reference screenshot):
 *   - Trigger:  "HH:MM:SS UTC±N" (live, ticks every second, with the
 *               offset computed at the current moment so DST stays
 *               correct)
 *   - Dropdown (anchored above the trigger):
 *       UTC                         ← "UTC" as a plain tzId
 *       Exchange                    ← section header
 *       (UTC±N) CityName             ← N is the current actual offset
 *
 * State shape: tzId is an IANA timezone string (or "UTC"). The
 * current offset is derived on every render via Intl.DateTimeFormat,
 * not stored — so the displayed offset auto-corrects as DST kicks in
 * or out throughout the year.
 *
 * Click-outside / Escape closes the menu.
 */

import { useEffect, useRef, useState } from "react";

/** Each row: IANA tzId + a short display label. */
const TIMEZONE_OPTIONS: ReadonlyArray<{ tzId: string; city: string }> = [
  { tzId: "Pacific/Honolulu", city: "Honolulu" },
  { tzId: "America/Anchorage", city: "Anchorage" },
  { tzId: "America/Juneau", city: "Juneau" },
  { tzId: "America/Los_Angeles", city: "Los Angeles" },
  { tzId: "America/Phoenix", city: "Phoenix" },
  { tzId: "America/Vancouver", city: "Vancouver" },
  { tzId: "America/Denver", city: "Denver" },
  { tzId: "America/Mexico_City", city: "Mexico City" },
  { tzId: "America/El_Salvador", city: "San Salvador" },
  { tzId: "America/Bogota", city: "Bogota" },
  { tzId: "America/Chicago", city: "Chicago" },
  { tzId: "America/Lima", city: "Lima" },
  { tzId: "America/New_York", city: "New York" },
  { tzId: "America/Santiago", city: "Santiago" },
  { tzId: "America/Toronto", city: "Toronto" },
  { tzId: "America/Argentina/Buenos_Aires", city: "Buenos Aires" },
  { tzId: "America/Sao_Paulo", city: "Sao Paulo" },
  { tzId: "Atlantic/Azores", city: "Azores" },
  { tzId: "Europe/London", city: "London" },
  { tzId: "Europe/Lisbon", city: "Lisbon" },
  { tzId: "Atlantic/Reykjavik", city: "Reykjavik" },
  { tzId: "Europe/Berlin", city: "Berlin" },
  { tzId: "Europe/Paris", city: "Paris" },
  { tzId: "Europe/Rome", city: "Rome" },
  { tzId: "Europe/Athens", city: "Athens" },
  { tzId: "Africa/Cairo", city: "Cairo" },
  { tzId: "Europe/Helsinki", city: "Helsinki" },
  { tzId: "Europe/Istanbul", city: "Istanbul" },
  { tzId: "Europe/Moscow", city: "Moscow" },
  { tzId: "Africa/Nairobi", city: "Nairobi" },
  { tzId: "Asia/Riyadh", city: "Riyadh" },
  { tzId: "Asia/Dubai", city: "Dubai" },
  { tzId: "Asia/Tbilisi", city: "Tbilisi" },
  { tzId: "Asia/Karachi", city: "Karachi" },
  { tzId: "Asia/Tashkent", city: "Tashkent" },
  { tzId: "Asia/Yekaterinburg", city: "Yekaterinburg" },
  { tzId: "Asia/Kolkata", city: "Mumbai" },
  { tzId: "Asia/Colombo", city: "Colombo" },
  { tzId: "Asia/Dhaka", city: "Dhaka" },
  { tzId: "Asia/Bangkok", city: "Bangkok" },
  { tzId: "Asia/Jakarta", city: "Jakarta" },
  { tzId: "Asia/Hong_Kong", city: "Hong Kong" },
  { tzId: "Asia/Singapore", city: "Singapore" },
  { tzId: "Asia/Shanghai", city: "Beijing" },
  { tzId: "Asia/Manila", city: "Manila" },
  { tzId: "Asia/Tokyo", city: "Tokyo" },
  { tzId: "Asia/Seoul", city: "Seoul" },
  { tzId: "Australia/Sydney", city: "Sydney" },
  { tzId: "Australia/Brisbane", city: "Brisbane" },
  { tzId: "Pacific/Auckland", city: "Auckland" },
  { tzId: "Pacific/Apia", city: "Samoa" },
];

const KNOWN_TZ_IDS = new Set([
  "UTC",
  ...TIMEZONE_OPTIONS.map((o) => o.tzId),
]);

export interface TimezoneSelectProps {
  /** IANA timezone id (e.g. "America/New_York") or "UTC". */
  tzId: string;
  onChange: (tzId: string) => void;
}

export function TimezoneSelect({ tzId, onChange }: TimezoneSelectProps) {
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

  const handleSelect = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const activeOffset = currentOffsetLabel(tzId, now);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors tabular-nums"
        title="Change timezone (IANA — DST-aware)"
      >
        {formatClock(now, tzId)} {activeOffset}
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-30 w-56 max-h-80 overflow-auto bg-zinc-900 border border-zinc-800 rounded shadow-2xl text-sm">
          <button
            onClick={() => handleSelect("UTC")}
            className={[
              "w-full text-left px-3 py-1.5 transition-colors",
              tzId === "UTC"
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
            const isActive = opt.tzId === tzId;
            const offsetLabel = currentOffsetLabel(opt.tzId, now);
            return (
              <button
                key={opt.tzId}
                onClick={() => handleSelect(opt.tzId)}
                className={[
                  "w-full text-left px-3 py-1 transition-colors tabular-nums",
                  isActive
                    ? "bg-zinc-700/60 text-zinc-100"
                    : "text-zinc-300 hover:bg-zinc-800/60",
                ].join(" ")}
              >
                ({offsetLabel}) {opt.city}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** "HH:MM:SS" formatted in the given tzId. */
function formatClock(nowMs: number, tzId: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tzId,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return fmt.format(new Date(nowMs));
}

/** Compute the current actual offset for a tzId and format as `UTC+8` / `UTC-4`. */
function currentOffsetLabel(tzId: string, nowMs: number): string {
  // Trick: format the same instant in UTC and in the target tz, then
  // compute the difference in hours. Robust to DST — uses whatever the
  // tzId currently means.
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tzId,
    timeZoneName: "shortOffset",
  });
  const parts = fmt.formatToParts(new Date(nowMs));
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  // `shortOffset` typically renders as "GMT+8", "GMT-5", or "GMT".
  // Normalize to "UTC+8" / "UTC-5" / "UTC+0".
  if (!offsetPart || /^GMT$/.test(offsetPart)) return "UTC+0";
  const m = offsetPart.match(/^GMT([+-])(\d+)(?::(\d+))?$/);
  if (!m) return offsetPart;
  const sign = m[1] === "-" ? "-" : "+";
  return `UTC${sign}${m[2]}`;
}

export const VALID_TZ_IDS = KNOWN_TZ_IDS;
