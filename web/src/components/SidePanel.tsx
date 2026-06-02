/**
 * SidePanel — right-sidebar panel that hosts both the order book and
 * the market trades feed, with switchable tabs (mirrors the reference
 * layout). Each tab's content is a separate sub-component.
 *
 * Live data:
 *   - Order book: REST snapshot + books15 WS pushes
 *   - Market trades: REST snapshot + trade-channel WS pushes
 */

import { useState } from "react";
import { OrderBookView } from "./OrderBookView";
import { MarketTradesView } from "./MarketTradesView";

type Tab = "book" | "trades";

const TABS: { id: Tab; label: string }[] = [
  { id: "book", label: "Order book" },
  { id: "trades", label: "Market trades" },
];

export interface SidePanelProps {
  symbol: string;
}

export function SidePanel({ symbol }: SidePanelProps) {
  const [tab, setTab] = useState<Tab>("book");

  return (
    <section className="flex flex-col bg-zinc-950 border border-zinc-800 rounded overflow-hidden min-h-0 flex-1">
      <header className="flex items-center border-b border-zinc-800">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "px-4 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors",
                active
                  ? "text-zinc-100 border-b-2 border-zinc-100 -mb-px"
                  : "text-zinc-500 hover:text-zinc-200",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "book" ? (
          <OrderBookView symbol={symbol} />
        ) : (
          <MarketTradesView symbol={symbol} />
        )}
      </div>
    </section>
  );
}
