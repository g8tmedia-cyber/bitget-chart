/**
 * ChartClock — live clock with a timezone selector.
 *
 * Updates every second. Click the clock to cycle through the timezone
 * list (UTC → Local → Asia/Manila → America/New_York → Europe/London
 * → UTC ...). Future: a real dropdown instead of cycling.
 */

import { useEffect, useState } from "react";

const TIMEZONES = [
  "UTC",
  "Local",
  "Asia/Manila",
  "America/New_York",
  "Europe/London",
] as const;

type Timezone = (typeof TIMEZONES)[number];

export interface ChartClockProps {
  /** Optional controlled value. If omitted, internal state. */
  timezone?: Timezone;
  onTimezoneChange?: (tz: Timezone) => void;
}

export function ChartClock({
  timezone: controlled,
  onTimezoneChange,
}: ChartClockProps) {
  const [internal, setInternal] = useState<Timezone>("UTC");
  const tz = controlled ?? internal;

  const setTz = (next: Timezone) => {
    if (controlled === undefined) setInternal(next);
    onTimezoneChange?.(next);
  };

  // Tick once per second.
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const label = formatClock(tz);

  const cycle = () => {
    const idx = TIMEZONES.indexOf(tz);
    const next = TIMEZONES[(idx + 1) % TIMEZONES.length]!;
    setTz(next);
  };

  return (
    <button
      onClick={cycle}
      className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors tabular-nums"
      title={`Timezone: ${tz} (click to cycle)`}
    >
      {label}
    </button>
  );
}

function formatClock(tz: Timezone): string {
  const now = new Date();
  if (tz === "Local") {
    return `${now.toLocaleTimeString("en-GB")} Local`;
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz === "UTC" ? "UTC" : tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${formatter.format(now)} ${tzLabel(tz)}`;
}

function tzLabel(tz: Timezone): string {
  switch (tz) {
    case "UTC":
      return "UTC";
    case "Local":
      return "Local";
    case "Asia/Manila":
      return "GMT+8";
    case "America/New_York":
      return "EST";
    case "Europe/London":
      return "GMT";
  }
}
