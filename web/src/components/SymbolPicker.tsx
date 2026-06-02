/**
 * SymbolPicker — top-left symbol selector with a TradingView-style
 * dropdown listing all tradeable USDT-M Futures perpetuals.
 *
 * Layout:
 *   [icon] [SYMBOL] [▾] [Perpetual]   <- trigger
 *   ...
 *   ┌──────────────────────────────────────┐
 *   │ [🔍 Search]                          │
 *   ├──────────────────────────────────────┤
 *   │ Coin / Volume       Vol    Last  24h│
 *   ├──────────────────────────────────────┤
 *   │ ⓑ BTCUSDT Perpetual   5.4B 67,840 -4.51%│
 *   │ ⓔ ETHUSDT Perpetual   2.6B  1,930 -1.95%│
 *   │ ...                                  │
 *   └──────────────────────────────────────┘
 *
 * Data flow:
 *   - Fetched on open from `/api/v2/mix/market/tickers`, filtered
 *     to perpetuals (no `deliveryTime`).
 *   - One fetch per open — no background polling. If the dropdown
 *     stays open for a while the numbers will go stale, but volume
 *     rankings are stable enough that it doesn't matter.
 *   - Selecting a row calls `onChange(symbol)` and closes.
 *   - Click outside or Escape closes.
 *
 * Sort:
 *   - Default: 24h quote volume descending
 *   - Click any column header to sort by it; click again to flip
 *   - Sort persists for the session (not saved)
 *
 * Search:
 *   - Substring match on `symbol` (case-insensitive)
 *   - Applied on top of the current sort
 *
 * No favorites (per requirements).
 */

import { useEffect, useRef, useState } from "react";
import {
  getUsdtFuturesPerpetualTickers,
  type FuturesTicker,
} from "../api/bitget";

type SortField = "symbol" | "quoteVolume" | "lastPr" | "change24h";
type SortDir = "asc" | "desc";

interface SortState {
  field: SortField;
  dir: SortDir;
}

const DEFAULT_SORT: SortState = { field: "quoteVolume", dir: "desc" };

export interface SymbolPickerProps {
  symbol: string;
  onChange: (symbol: string) => void;
}

export function SymbolPicker({ symbol, onChange }: SymbolPickerProps) {
  const [open, setOpen] = useState(false);
  const [tickers, setTickers] = useState<FuturesTicker[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Fetch on open. Cached for the session (no background poll).
  useEffect(() => {
    if (!open) return;
    // If we already have data (re-open), don't refetch.
    if (tickers.length > 0) {
      // Still re-focus the search box.
      searchRef.current?.focus();
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getUsdtFuturesPerpetualTickers()
      .then((rows) => {
        if (cancelled) return;
        setTickers(rows);
        setLoading(false);
        // Focus search after data loads so arrow-keys / typing
        // immediately work.
        requestAnimationFrame(() => searchRef.current?.focus());
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tickers.length]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const baseCoin = baseCoinFromSymbol(symbol);
  const current = tickers.find((t) => t.symbol === symbol);

  const filtered = tickers
    .filter((t) => t.symbol.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.field === "symbol") {
        return a.symbol.localeCompare(b.symbol) * dir;
      }
      return (a[sort.field] - b[sort.field]) * dir;
    });

  const handleSortClick = (field: SortField) => {
    if (sort.field === field) {
      setSort({ field, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      // Default direction: ascending for symbol, descending for
      // numeric (so the "biggest" comes first by default).
      setSort({ field, dir: field === "symbol" ? "asc" : "desc" });
    }
  };

  const handleRowClick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-1.5 py-1 -mx-1.5 rounded hover:bg-zinc-800/60 transition-colors"
      >
        <CoinIcon baseCoin={baseCoin} size="md" />
        <div className="flex items-center gap-1.5">
          <span className="text-base font-semibold text-zinc-100">{symbol}</span>
          <ChevronDown />
        </div>
        <span className="text-zinc-500 text-xs">Perpetual</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-[480px] max-h-[600px] flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
            <SortHeader
              field="symbol"
              current={sort}
              onClick={handleSortClick}
            >
              Coin / Volume
            </SortHeader>
            <SortHeader
              field="quoteVolume"
              current={sort}
              onClick={handleSortClick}
              className="text-right"
            >
              Vol
            </SortHeader>
            <SortHeader
              field="lastPr"
              current={sort}
              onClick={handleSortClick}
              className="text-right"
            >
              Last
            </SortHeader>
            <SortHeader
              field="change24h"
              current={sort}
              onClick={handleSortClick}
              className="text-right"
            >
              24h
            </SortHeader>
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto min-h-0">
            {loading && (
              <div className="p-4 text-center text-zinc-500 text-xs">
                Loading pairs…
              </div>
            )}
            {loadError && !loading && (
              <div className="p-4 text-center text-red-400 text-xs font-mono break-words">
                {loadError}
              </div>
            )}
            {!loading && !loadError && filtered.length === 0 && (
              <div className="p-4 text-center text-zinc-500 text-xs">
                No matches
              </div>
            )}
            {!loading && !loadError && filtered.map((t) => (
              <Row
                key={t.symbol}
                ticker={t}
                active={t.symbol === symbol}
                onClick={handleRowClick}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 text-[10px] text-zinc-600 text-right border-t border-zinc-800 tabular-nums">
            {filtered.length} of {tickers.length || "…"} USDT-M Futures
            {current && (
              <span className="ml-2 text-zinc-500">
                · sel {current.symbol}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---------------------------------------------------------

interface RowProps {
  ticker: FuturesTicker;
  active: boolean;
  onClick: (symbol: string) => void;
}

function Row({ ticker, active, onClick }: RowProps) {
  const isUp = ticker.change24h >= 0;
  return (
    <button
      onClick={() => onClick(ticker.symbol)}
      className={[
        "w-full grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-1.5 items-center text-left transition-colors",
        active ? "bg-zinc-800/60" : "hover:bg-zinc-800/40",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 min-w-0">
        <CoinIcon baseCoin={ticker.baseCoin} size="sm" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-zinc-100 truncate">
              {ticker.symbol}
            </span>
            <span className="text-[9px] uppercase tracking-wider px-1 py-px rounded bg-zinc-800 text-zinc-500 border border-zinc-700/50 leading-tight">
              Perp
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {humanVolume(ticker.quoteVolume)}
          </span>
        </div>
      </div>
      <span className="text-sm tabular-nums text-zinc-100 w-24 text-right">
        {formatPrice(ticker.lastPr)}
      </span>
      <span
        className={[
          "text-sm tabular-nums w-16 text-right",
          isUp ? "text-emerald-400" : "text-red-400",
        ].join(" ")}
      >
        {isUp ? "+" : ""}
        {ticker.change24h.toFixed(2)}%
      </span>
    </button>
  );
}

interface SortHeaderProps {
  field: SortField;
  current: SortState;
  onClick: (field: SortField) => void;
  className?: string;
  children: React.ReactNode;
}

function SortHeader({ field, current, onClick, className = "", children }: SortHeaderProps) {
  const active = current.field === field;
  return (
    <button
      onClick={() => onClick(field)}
      className={[
        "hover:text-zinc-300 transition-colors flex items-center gap-1",
        className,
        active ? "text-zinc-300" : "",
      ].join(" ")}
    >
      {children}
      <span className="text-zinc-600 text-[10px]">
        {active ? (current.dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

interface CoinIconProps {
  baseCoin: string;
  size: "sm" | "md";
}

function CoinIcon({ baseCoin, size }: CoinIconProps) {
  const dim =
    size === "sm"
      ? "w-5 h-5 text-[10px]"
      : "w-7 h-7 text-xs";
  return (
    <div
      className={[
        "rounded-full flex items-center justify-center font-semibold text-zinc-950 shrink-0 leading-none",
        dim,
      ].join(" ")}
      style={{ backgroundColor: coinColor(baseCoin) }}
      aria-hidden
    >
      {baseCoin.slice(0, 2).toUpperCase()}
    </div>
  );
}

// --- Helpers ----------------------------------------------------------------

/**
 * Deterministic coin color: BTC/ETH/USDT/SOL/XRP get brand colors,
 * everything else gets a stable hash → HSL. Two letters of the base
 * coin are shown inside the circle.
 */
function coinColor(s: string): string {
  const known: Record<string, string> = {
    BTC: "hsl(35, 90%, 50%)", // orange
    ETH: "hsl(220, 70%, 55%)", // blue
    USDT: "hsl(140, 60%, 45%)", // green
    SOL: "hsl(280, 70%, 60%)", // purple
    XRP: "hsl(220, 15%, 35%)", // dark
    BNB: "hsl(48, 90%, 55%)", // gold
    DOGE: "hsl(45, 80%, 50%)", // yellow
  };
  if (known[s]) return known[s];
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(h) % 360}, 55%, 50%)`;
}

function baseCoinFromSymbol(symbol: string): string {
  if (symbol.endsWith("USDT")) return symbol.slice(0, -4);
  if (symbol.endsWith("USDC")) return symbol.slice(0, -4);
  if (symbol.endsWith("USD")) return symbol.slice(0, -3);
  return symbol;
}

function humanVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

/**
 * Smart price formatter — picks decimal places based on magnitude.
 * Mirrors Bitget's `pricePlace` per contract for the most common
 * ranges without needing an extra API call.
 */
function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 100) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString(undefined, { maximumFractionDigits: 3 });
  if (price >= 0.01) return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (price >= 0.0001) return price.toLocaleString(undefined, { maximumFractionDigits: 5 });
  return price.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3 h-3 text-zinc-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6l5 5 5-5" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="7" cy="7" r="5" />
      <path d="m14 14-3-3" />
    </svg>
  );
}
