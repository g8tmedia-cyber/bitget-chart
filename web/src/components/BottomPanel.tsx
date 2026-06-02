/**
 * BottomPanel — tabbed panel below the 3-col main row.
 *
 * Part 1 wiring:
 *   - Positions tab     : open positions with live PnL + Close
 *   - Open orders tab   : empty placeholder (part 2)
 *   - Order history tab : all fills (opens, adds, closes)
 *   - Position history  : closed positions with realized PnL
 *
 * Positions + history are fed by the parent (App). Mark price for
 * live PnL comes in via `markPrice` and updates on every candle
 * tick — the list re-renders with the new numbers.
 */

import { useState } from "react";
import {
  formatUsdt,
  liquidationPrice,
  type Fill,
  type Position,
  unrealizedPnl,
  unrealizedRoiPct,
} from "../lib/types-demo";

type Tab = "positions" | "open_orders" | "order_history" | "position_history";

const TABS: { id: Tab; label: string }[] = [
  { id: "positions", label: "Positions" },
  { id: "open_orders", label: "Open orders" },
  { id: "order_history", label: "Order history" },
  { id: "position_history", label: "Position history" },
];

export interface BottomPanelProps {
  positions: Position[];
  history: Fill[];
  /** Latest chart close — used for live PnL on the Positions tab. */
  markPrice: number | null;
  /** Current symbol, used as a default filter for history. */
  symbol: string;
  onClosePosition: (positionId: string) => void;
  onReset: () => void;
}

export function BottomPanel({
  positions,
  history,
  markPrice,
  symbol,
  onClosePosition,
  onReset,
}: BottomPanelProps) {
  const [tab, setTab] = useState<Tab>("positions");
  const [showCurrent, setShowCurrent] = useState(true);

  // Filter history by symbol if "Show current" is on
  const filteredHistory = showCurrent
    ? history.filter((f) => f.symbol === symbol)
    : history;

  // A fill is a "close" → it counts as a position history entry.
  const closedFills = filteredHistory.filter((f) => f.note === "close");
  const openOrAddFills = filteredHistory.filter(
    (f) => f.note === "open" || f.note === "add",
  );

  return (
    <section className="bg-zinc-950 border border-zinc-800 rounded flex flex-col min-h-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center px-2 border-b border-zinc-800 text-[11px]">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "px-3 py-2 font-medium uppercase tracking-wider transition-colors",
                active
                  ? "text-zinc-100 border-b-2 border-zinc-100 -mb-px"
                  : "text-zinc-500 hover:text-zinc-200",
              ].join(" ")}
            >
              {t.label} ({countFor(t.id, positions, history, filteredHistory)})
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 text-zinc-500">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showCurrent}
              onChange={(e) => setShowCurrent(e.target.checked)}
              className="accent-cyan-500"
            />
            <span className="text-[10px]">Show current</span>
          </label>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-zinc-800 text-[11px] text-zinc-500">
        <button className="px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors">
          Detailed
        </button>
        <button className="px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors text-zinc-300">
          Lite
        </button>
        <span className="mx-1 text-zinc-700">|</span>
        <button className="px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors">
          Filter: All ⌄
        </button>
        <button className="px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors">
          Sort ⌄
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onReset}
            className="px-3 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
            title="Wipe the demo account back to $10,000"
          >
            Reset demo
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === "positions" && (
          <PositionsTable
            positions={positions}
            markPrice={markPrice}
            onClose={onClosePosition}
          />
        )}
        {tab === "open_orders" && (
          <EmptyState
            title="No open orders"
            body="Limit orders you place will appear here until they're filled or cancelled."
          />
        )}
        {tab === "order_history" && (
          <OrderHistoryTable fills={openOrAddFills} />
        )}
        {tab === "position_history" && (
          <PositionHistoryTable fills={closedFills} />
        )}
      </div>
    </section>
  );
}

// --- Tables ----------------------------------------------------------------

function PositionsTable({
  positions,
  markPrice,
  onClose,
}: {
  positions: Position[];
  markPrice: number | null;
  onClose: (id: string) => void;
}) {
  if (positions.length === 0) {
    return (
      <EmptyState
        title="No open positions"
        body="Place a market order using the form on the right to open a position."
      />
    );
  }
  return (
    <table className="w-full text-[11px] font-mono tabular-nums">
      <thead>
        <tr className="text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-800">
          <th className="text-left px-3 py-1.5">Symbol</th>
          <th className="text-right px-3 py-1.5">Side</th>
          <th className="text-right px-3 py-1.5">Size</th>
          <th className="text-right px-3 py-1.5">Entry</th>
          <th className="text-right px-3 py-1.5">Mark</th>
          <th className="text-right px-3 py-1.5">Liq. price</th>
          <th className="text-right px-3 py-1.5">Margin</th>
          <th className="text-right px-3 py-1.5">PnL</th>
          <th className="text-right px-3 py-1.5">ROI</th>
          <th className="text-right px-3 py-1.5"></th>
        </tr>
      </thead>
      <tbody>
        {positions.map((p) => {
          const mark = markPrice ?? p.entryPrice;
          const pnl = unrealizedPnl(p, mark);
          const roi = unrealizedRoiPct(p, mark);
          const liq = liquidationPrice(p);
          const up = pnl >= 0;
          return (
            <tr
              key={p.id}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/40"
            >
              <td className="px-3 py-1.5 text-zinc-100">{p.symbol}</td>
              <td
                className={[
                  "px-3 py-1.5 text-right",
                  p.side === "long" ? "text-emerald-400" : "text-red-400",
                ].join(" ")}
              >
                {p.side === "long" ? "Long" : "Short"} {p.leverage}x
              </td>
              <td className="px-3 py-1.5 text-right text-zinc-200">
                {p.size.toFixed(4)}
              </td>
              <td className="px-3 py-1.5 text-right text-zinc-300">
                {formatUsdt(p.entryPrice)}
              </td>
              <td className="px-3 py-1.5 text-right text-zinc-200">
                {markPrice == null ? "—" : formatUsdt(mark)}
              </td>
              <td className="px-3 py-1.5 text-right text-zinc-400">
                {formatUsdt(liq)}
              </td>
              <td className="px-3 py-1.5 text-right text-zinc-300">
                {formatUsdt(p.margin)}
              </td>
              <td
                className={[
                  "px-3 py-1.5 text-right",
                  up ? "text-emerald-400" : "text-red-400",
                ].join(" ")}
              >
                {up ? "+" : ""}
                {formatUsdt(pnl)}
              </td>
              <td
                className={[
                  "px-3 py-1.5 text-right",
                  up ? "text-emerald-400" : "text-red-400",
                ].join(" ")}
              >
                {up ? "+" : ""}
                {roi.toFixed(2)}%
              </td>
              <td className="px-3 py-1.5 text-right">
                <button
                  onClick={() => onClose(p.id)}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] transition-colors"
                >
                  Close
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function OrderHistoryTable({ fills }: { fills: Fill[] }) {
  if (fills.length === 0) {
    return (
      <EmptyState
        title="No order history"
        body="Filled and added-to positions will be listed here."
      />
    );
  }
  return (
    <table className="w-full text-[11px] font-mono tabular-nums">
      <thead>
        <tr className="text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-800">
          <th className="text-left px-3 py-1.5">Time</th>
          <th className="text-left px-3 py-1.5">Symbol</th>
          <th className="text-left px-3 py-1.5">Side</th>
          <th className="text-right px-3 py-1.5">Size</th>
          <th className="text-right px-3 py-1.5">Price</th>
          <th className="text-right px-3 py-1.5">Value</th>
        </tr>
      </thead>
      <tbody>
        {fills
          .slice()
          .reverse()
          .map((f) => (
            <tr
              key={f.id}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/40"
            >
              <td className="px-3 py-1.5 text-zinc-500">
                {formatTime(f.createdAt)}
              </td>
              <td className="px-3 py-1.5 text-zinc-200">{f.symbol}</td>
              <td
                className={[
                  "px-3 py-1.5",
                  f.side === "long" ? "text-emerald-400" : "text-red-400",
                ].join(" ")}
              >
                {f.side === "long" ? "Long" : "Short"}
              </td>
              <td className="px-3 py-1.5 text-right text-zinc-300">
                {f.size.toFixed(4)}
              </td>
              <td className="px-3 py-1.5 text-right text-zinc-300">
                {formatUsdt(f.price)}
              </td>
              <td className="px-3 py-1.5 text-right text-zinc-200">
                {formatUsdt(f.size * f.price)}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function PositionHistoryTable({ fills }: { fills: Fill[] }) {
  if (fills.length === 0) {
    return (
      <EmptyState
        title="No closed positions"
        body="Positions you close will appear here with their realized PnL."
      />
    );
  }
  return (
    <table className="w-full text-[11px] font-mono tabular-nums">
      <thead>
        <tr className="text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-800">
          <th className="text-left px-3 py-1.5">Closed at</th>
          <th className="text-left px-3 py-1.5">Symbol</th>
          <th className="text-left px-3 py-1.5">Side</th>
          <th className="text-right px-3 py-1.5">Size</th>
          <th className="text-right px-3 py-1.5">Entry</th>
          <th className="text-right px-3 py-1.5">Exit</th>
          <th className="text-right px-3 py-1.5">PnL</th>
        </tr>
      </thead>
      <tbody>
        {fills
          .slice()
          .reverse()
          .map((f) => {
            // For closed positions, PnL was realized at the exit
            // price. We don't have a stored "entry" here — just show
            // the fill's price (exit) and the PnL.
            const up = f.realizedPnl >= 0;
            return (
              <tr
                key={f.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-900/40"
              >
                <td className="px-3 py-1.5 text-zinc-500">
                  {formatTime(f.createdAt)}
                </td>
                <td className="px-3 py-1.5 text-zinc-200">{f.symbol}</td>
                <td
                  className={[
                    "px-3 py-1.5",
                    f.side === "long" ? "text-emerald-400" : "text-red-400",
                  ].join(" ")}
                >
                  {f.side === "long" ? "Long" : "Short"}
                </td>
                <td className="px-3 py-1.5 text-right text-zinc-300">
                  {f.size.toFixed(4)}
                </td>
                <td className="px-3 py-1.5 text-right text-zinc-500">—</td>
                <td className="px-3 py-1.5 text-right text-zinc-300">
                  {formatUsdt(f.price)}
                </td>
                <td
                  className={[
                    "px-3 py-1.5 text-right",
                    up ? "text-emerald-400" : "text-red-400",
                  ].join(" ")}
                >
                  {up ? "+" : ""}
                  {formatUsdt(f.realizedPnl)}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-center justify-center h-full p-4 text-zinc-500">
      <div className="text-center max-w-md">
        <div className="text-sm text-zinc-300 mb-1">{title}</div>
        <div className="text-[11px]">{body}</div>
      </div>
    </div>
  );
}

function countFor(
  tab: Tab,
  positions: Position[],
  history: Fill[],
  filteredHistory: Fill[],
): number {
  switch (tab) {
    case "positions":
      return positions.length;
    case "open_orders":
      return 0; // part 2
    case "order_history":
      return filteredHistory.filter(
        (f) => f.note === "open" || f.note === "add",
      ).length;
    case "position_history":
      return filteredHistory.filter((f) => f.note === "close").length;
    default:
      return history.length;
  }
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
