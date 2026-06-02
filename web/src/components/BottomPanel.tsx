/**
 * BottomPanel — full-width panel below the chart and order book.
 * Visual-only for now: tabbed (Positions / Open orders / Order
 * history / Position history), each with an empty state.
 *
 * Engine lands in a later commit; this commit ships the layout
 * shell so we can iterate on visuals.
 */

import { useState } from "react";

type Tab = "positions" | "open_orders" | "order_history" | "position_history";

const TABS: { id: Tab; label: string }[] = [
  { id: "positions", label: "Positions" },
  { id: "open_orders", label: "Open orders" },
  { id: "order_history", label: "Order history" },
  { id: "position_history", label: "Position history" },
];

export function BottomPanel() {
  const [tab, setTab] = useState<Tab>("positions");
  const [showCurrent, setShowCurrent] = useState(true);

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
              {t.label} (0)
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
        <div className="ml-auto">
          <button className="px-3 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
            Close all
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center min-h-[120px] p-4">
        <EmptyState tab={tab} />
      </div>
    </section>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { title: string; body: string }> = {
    positions: {
      title: "No open positions",
      body: "Place an order using the form on the right to open a position. The demo engine lands in a later build.",
    },
    open_orders: {
      title: "No open orders",
      body: "Limit orders you place will appear here until they're filled or cancelled.",
    },
    order_history: {
      title: "No order history",
      body: "Filled and cancelled orders will be listed here.",
    },
    position_history: {
      title: "No closed positions",
      body: "Positions you close will appear here with their realized PnL.",
    },
  };
  const m = messages[tab];
  return (
    <div className="text-center text-zinc-500 max-w-md">
      <div className="text-sm text-zinc-300 mb-1">{m.title}</div>
      <div className="text-[11px]">{m.body}</div>
    </div>
  );
}
