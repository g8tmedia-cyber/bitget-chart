import { useEffect, useState } from "react";

export interface LastUpdatedProps {
  /** Unix-ms of the last successful update; null until first arrives */
  updatedAt: number | null;
  /** Pulse a visual signal briefly when a new update arrives */
  pulseOnChange?: boolean;
}

export function LastUpdated({ updatedAt, pulseOnChange = true }: LastUpdatedProps) {
  const [now, setNow] = useState(() => Date.now());
  const [pulse, setPulse] = useState(false);

  // Re-tick the relative-time label every 1s
  useEffect(() => {
    if (updatedAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [updatedAt]);

  // Pulse briefly when updatedAt changes
  useEffect(() => {
    if (!pulseOnChange || updatedAt == null) return;
    setPulse(true);
    const id = window.setTimeout(() => setPulse(false), 400);
    return () => window.clearTimeout(id);
  }, [updatedAt, pulseOnChange]);

  if (updatedAt == null) {
    return <span className="text-zinc-500">never</span>;
  }
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000));
  const text =
    seconds < 5
      ? "just now"
      : seconds < 60
        ? `${seconds}s ago`
        : `${Math.floor(seconds / 60)}m ago`;
  return (
    <span className={pulse ? "text-emerald-400" : ""}>
      updated {text}
    </span>
  );
}
