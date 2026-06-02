/**
 * Shared number / price formatters used by both the chart legend
 * and the browser-tab title. Keeping the formatter in one place
 * ensures the tab and the chart display the same number with the
 * same precision.
 */

/**
 * Format a price with smart precision based on magnitude:
 *   >= 1000  → up to 2 decimals  (e.g. 67,840  or  1,927.47)
 *   >= 1     → up to 4 decimals  (e.g. 77.18   or  0.5)
 *   < 1      → up to 6 decimals  (e.g. 0.034380  or  0.000359)
 *
 * Matches the per-bucket precision the CandleLegend uses for
 * O/H/L/C, so the chart's C and the browser tab's price render
 * identically.
 */
export function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
