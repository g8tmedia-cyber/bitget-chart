/**
 * AccountPanel — visual-only account summary. Mirrors the right-
 * column "Account" section in the Bitget terminal:
 *
 *   Account                PnL
 *   ────────────────────────────
 *   USDT balance            0.00
 *   Wallet balance           0.00
 *   Available               0.00
 *   Total unrealized PnL    0.00
 *   ROI                    0.00%
 *   Trading bonuses         0.00
 *
 * Plus a "Reset demo" button (no-op for the layout-only phase).
 */

export function AccountPanel() {
  return (
    <div className="text-xs border-t border-zinc-800">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-zinc-100 text-sm font-medium">Account</span>
        <button className="text-cyan-400 hover:text-cyan-300 text-[11px]">
          PnL
        </button>
      </div>

      <div className="px-3 py-1 space-y-0.5 tabular-nums">
        <Row label="USDT balance" value="0.00" />
        <Row label="Wallet balance" value="0.00" />
        <Row label="Available" value="0.00" />
        <Row label="Total unrealized PnL" value="0.00" />
        <Row label="ROI" value="0.00%" />
        <Row label="Trading bonuses" value="0.00" />
      </div>

      <div className="px-3 py-2">
        <button
          className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors"
          title="Reset demo (no-op in this layout-only build)"
        >
          Reset demo
        </button>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}
