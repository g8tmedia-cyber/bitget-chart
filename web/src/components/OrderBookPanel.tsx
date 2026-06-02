/**
 * OrderBookPanel — right-sidebar placeholder.
 * Real order-book data (REST `/orderbook` + WS `books15` channel) is
 * not wired up yet. For now this is a styled empty panel.
 */

export function OrderBookPanel() {
  return (
    <section className="flex flex-col bg-zinc-950 border border-zinc-800 rounded overflow-hidden min-h-0 flex-1">
      <header className="px-3 py-2 border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
        Order book
      </header>
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">
        Placeholder
      </div>
    </section>
  );
}
