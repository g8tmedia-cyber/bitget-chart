/**
 * AccountPanel — account summary, fed by the demo engine.
 *
 *   Account                PnL
 *   ────────────────────────────
 *   USDT balance            0.00  ← driven by demo engine
 *   Wallet balance          0.00
 *   Available               0.00
 *   Total unrealized PnL    0.00
 *   ROI                    0.00%
 *   Trading bonuses         0.00
 *
 * In part 1 the balance is engine-managed (changes with PnL).
 * "Reset demo" in the BottomPanel restores the default $10,000.
 * The editable input that previously lived here has been removed
 * now that the engine owns the balance.
 */

import {
  formatUsdt,
  type Position,
  unrealizedPnl,
} from "../lib/types-demo";

export interface AccountPanelProps {
  balance: number;
  positions: Position[];
  /** Latest chart close, used for unrealized PnL total. */
  markPrice: number | null;
}

export function AccountPanel({ balance, positions, markPrice }: AccountPanelProps) {
  const totalUnrealized =
    markPrice == null
      ? 0
      : positions.reduce((sum, p) => sum + unrealizedPnl(p, markPrice), 0);
  const equity = balance + totalUnrealized;
  const roi = balance > 0 ? (totalUnrealized / balance) * 100 : 0;

  return (
    <div className="text-xs border-t border-zinc-800">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-zinc-100 text-sm font-medium">Account</span>
        <button className="text-cyan-400 hover:text-cyan-300 text-[11px]">
          PnL
        </button>
      </div>

      <div className="px-3 py-1 space-y-0.5 tabular-nums">
        <Row label="USDT balance" value={formatUsdt(balance, 4)} />
        <Row label="Equity" value={formatUsdt(equity, 4)} />
        <Row label="Available" value={formatUsdt(balance, 4)} />
        <Row
          label="Total unrealized PnL"
          value={formatUsdt(totalUnrealized)}
          valueClassName={totalUnrealized >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row
          label="ROI"
          value={`${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`}
          valueClassName={roi >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row label="Trading bonuses" value="0.00" />
      </div>

      <div className="px-3 py-2 border-t border-zinc-800">
        <div className="text-zinc-100 text-sm font-medium mb-1">
          Futures details
        </div>
        <Row label="Maturity date" value="Perpetual" />
        <Row label="Maximum leverage" value="150x" />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName = "text-zinc-200",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
