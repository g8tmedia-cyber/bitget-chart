/**
 * AccountPanel — visual-only account summary. Mirrors the right-
 * column "Account" section in the Bitget terminal:
 *
 *   Account                PnL
 *   ────────────────────────────
 *   USDT balance            0.00  ← editable (demo balance)
 *   Wallet balance          0.00
 *   Available               0.00
 *   Total unrealized PnL    0.00
 *   ROI                    0.00%
 *   Trading bonuses         0.00
 *
 * The USDT balance row is the demo's working balance — it feeds
 * the "Max. open" readout in the leverage modal and the "Max"
 * position size in the trading form. The user can edit it inline
 * to any value.
 */

export interface AccountPanelProps {
  balance: number;
  onBalanceChange: (balance: number) => void;
}

export function AccountPanel({ balance, onBalanceChange }: AccountPanelProps) {
  return (
    <div className="text-xs border-t border-zinc-800">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-zinc-100 text-sm font-medium">Account</span>
        <button className="text-cyan-400 hover:text-cyan-300 text-[11px]">
          PnL
        </button>
      </div>

      <div className="px-3 py-1 space-y-0.5 tabular-nums">
        <EditableBalanceRow
          label="USDT balance"
          value={balance}
          onChange={onBalanceChange}
        />
        <Row label="Wallet balance" value={balance.toFixed(2)} />
        <Row label="Available" value={balance.toFixed(2)} />
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

function EditableBalanceRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <input
        type="number"
        value={value}
        min={0}
        step={100}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n) && n >= 0) onChange(n);
        }}
        className="w-28 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-right text-zinc-200 text-xs tabular-nums focus:outline-none focus:border-zinc-500"
      />
    </div>
  );
}
