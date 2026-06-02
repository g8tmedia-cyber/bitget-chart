# BTCUSDT Chart App — Task Breakdown

> **Project:** Vite + React 18 + TypeScript + Tailwind v4 + lightweight-charts
> **Data source:** Bitget public V2 REST (`https://api.bitget.com`)
> **Default symbol:** `BTCUSDT` (USDT-FUTURES perpetual) — **only symbol, no picker**
> **Build pattern:** Lego-style. One brick at a time, test in isolation, snap onto the next.

---

## Working agreement

- **I write the files.** Config, source, components.
- **You run dev servers.** `npm install`, `npm run dev` — your machine, your terminals.
- **You paste back results.** "works", "broken — here's the console", or a screenshot. I fix or move on.
- **I never touch `npm run dev` myself** (per your earlier note about it getting stuck).
- **One brick per turn.** Don't ask "ok what's next" mid-task. Finish, verify, ask, move on.

---

## Status legend
- ⏳ pending
- 🔄 in progress
- ✅ done
- ❌ cancelled

---

## Phase 0 — Foundation (proven, ready to build on)

| # | Task | Status | Acceptance |
|---|---|---|---|
| 0.1 | Public API smoke test (24 endpoints) | ✅ | All 24 endpoints return 200 — `test_public_api.py` |
| 0.2 | BTCUSDT perp candles across 11 timeframes | ✅ | All `1m` `5m` `15m` `30m` `1H` `4H` `6H` `12H` `1D` `1W` `1M` return 200 — `probe_btcusdt_perp.py` |
| 0.3 | NDX100USDT (NAS100) verified as viable alt | ✅ | All 11 timeframes work, but out of scope — user wants BTCUSDT only |

---

## Phase 1 — Project scaffolding

| # | Task | Status | Acceptance |
|---|---|---|---|
| 1.1 | Init Vite + React + TS in `C:\dev\bitget\web\` | ⏳ | `npm create vite@latest web -- --template react-ts` succeeds |
| 1.2 | Install deps (Tailwind v4, lightweight-charts) | ⏳ | `package.json` lists `tailwindcss`, `@tailwindcss/vite`, `lightweight-charts` |
| 1.3 | Configure Tailwind v4 (`vite.config.ts`, `src/index.css`) | ⏳ | Vite picks up Tailwind; dark mode via class strategy |
| 1.4 | Verify blank Vite page loads | ⏳ | `npm run dev` shows Vite splash at `localhost:5173` (you confirm) |

---

## Phase 2 — API client brick (the price fetcher)

| # | Task | Status | Acceptance |
|---|---|---|---|
| 2.1 | `src/api/bitget.ts` — typed `getCandles(symbol, granularity, limit)` | ⏳ | Returns `Candle[]`; types exported |
| 2.2 | `src/api/bitget.ts` — typed `getTicker(symbol)` | ⏳ | Returns `Ticker`; types exported |
| 2.3 | `src/api/bitget.ts` — typed `getSymbols()` (optional, for symbol picker later) | ⏳ | Returns `Symbol[]` |
| 2.4 | Standalone `<ApiDebug />` page — calls API, dumps to `<pre>` + console | ⏳ | Browser shows real BTCUSDT candle data; you confirm in devtools |

**Why this brick first:** every later component depends on it. Proves the data layer works in React.

---

## Phase 3 — Timeframe config brick

| # | Task | Status | Acceptance |
|---|---|---|---|
| 3.1 | `src/config/timeframes.ts` — typed list of 11 timeframes | ⏳ | Exports `TIMEFRAMES: Timeframe[]` with `label`, `granularity`, `seconds` |
| 3.2 | Re-export from API client (default `granularity` lookup) | ⏳ | `getCandles(symbol, "1H")` works without hardcoding strings elsewhere |

**Why:** single source of truth. Selector, API call, WS subscription all read from this. Change once, propagates.

---

## Phase 4 — Chart brick (mock data first, prove the library works)

| # | Task | Status | Acceptance |
|---|---|---|---|
| 4.1 | Install + import `lightweight-charts` | ⏳ | TS types resolve; no compile errors |
| 4.2 | `src/components/CandleChart.tsx` — hardcoded OHLCV array (50 candles of fake data) | ⏳ | Component renders; chart shows green/red candles in dark theme |
| 4.3 | Auto-resize on window resize | ⏳ | Resize browser window → chart fills new size |

**Why mock first:** proves the library is wired correctly and the chart container sizes right, with zero API risk.

---

## Phase 5 — Wire chart to real API (the magic moment)

| # | Task | Status | Acceptance |
|---|---|---|---|
| 5.1 | Replace mock data with `useEffect` + `bitget.getCandles(...)` | ⏳ | Real BTCUSDT 1H candles render in chart |
| 5.2 | Loading state (skeleton / spinner) | ⏳ | Visible briefly before data arrives |
| 5.3 | Error state (banner + retry button) | ⏳ | Throttle network in DevTools → error UI appears, retry works |
| 5.4 | Empty state (no data) | ⏳ | Handled (symbol with no history) |

---

## Phase 6 — Timeframe selector brick

| # | Task | Status | Acceptance |
|---|---|---|---|
| 6.1 | `src/components/TimeframeSelector.tsx` — horizontal button group | ⏳ | Renders 11 buttons (1m 5m 15m 30m 1H 4H 6H 12H 1D 1W 1M) |
| 6.2 | Click handler → triggers refetch + chart re-render | ⏳ | Click "1D" → chart re-fetches + paints daily candles |
| 6.3 | Active button visually highlighted | ⏳ | Selected timeframe stands out (color / border) |

---

## Phase 7 — Live updates brick

| # | Task | Status | Acceptance |
|---|---|---|---|
| 7.1 | `src/api/bitget-ws.ts` — WebSocket client | ⏳ | Connects to `wss://ws.bitget.com/v2/ws/public` |
| 7.2 | Subscribe to `candle{symbol}` channel for current timeframe | ⏳ | First message arrives; console log shows live candle |
| 7.3 | On each push, update the **last bar** in the chart (don't re-render all) | ⏳ | New candle appears within ~1s of bar close; no flicker |
| 7.4 | Auto-reconnect on disconnect | ⏳ | Kill network → WS reconnects when network returns |

**Fallback:** if WS misbehaves, polling (`setInterval` refetch every 5s) is the backup. Decide based on stability after 7.2.

---

## Phase 8 — App shell + styling

| # | Task | Status | Acceptance |
|---|---|---|---|
| 8.1 | Top bar: symbol name, last price, 24h change (% + arrow) | ⏳ | Shows `BTCUSDT · 70,098.5 · -3.71%` style |
| 8.2 | Layout: top bar / chart fills middle / timeframe selector at bottom | ⏳ | Responsive: works on 1280×800 and 1920×1080 |
| 8.3 | Dark theme by default (`bg-zinc-950`, `text-zinc-100`) | ⏳ | Looks like a real trading app, not a Vite splash |
| 8.4 | Crosshair + price axis labels readable | ⏳ | Hover over chart → crosshair shows OHLCV tooltip |

---

## Phase 9 — Polish

| # | Task | Status | Acceptance |
|---|---|---|---|
| 9.1 | Smooth transitions on timeframe switch (no white flash) | ⏳ | Switch "1m" → "1D" → "5m" feels smooth |
| 9.2 | "Last updated Xs ago" indicator | ⏳ | Updates live; useful for spotting stale data |
| 9.3 | Volume sub-pane (bonus, lightweight-charts supports it) | ⏳ | Volume bars below candles, color-coded |
| 9.4 | Mobile-responsive layout (optional) | ⏳ | If time permits; not core |

---

## Phase 10 — Final integration test

| # | Task | Status | Acceptance |
|---|---|---|---|
| 10.1 | `tsc --noEmit` clean | ⏳ | Zero TS errors |
| 10.2 | `vite build` succeeds | ⏳ | Production bundle builds, <500KB gzipped ideally |
| 10.3 | Full E2E walkthrough: load → switch all 11 timeframes → live updates → reload | ⏳ | All flows work; no console errors |
| 10.4 | Write a short README in `web/` with run instructions | ⏳ | Future-you (or anyone else) can `npm install && npm run dev` and it just works |

---

## File layout (target)

```
C:\dev\bitget\
├── web\                              # NEW — the chart app
│   ├── public\
│   ├── src\
│   │   ├── api\
│   │   │   ├── bitget.ts            # REST client
│   │   │   └── bitget-ws.ts         # WS client (Phase 7)
│   │   ├── components\
│   │   │   ├── CandleChart.tsx      # lightweight-charts wrapper
│   │   │   ├── TimeframeSelector.tsx
│   │   │   └── ApiDebug.tsx         # Phase 2 temp page
│   │   ├── config\
│   │   │   └── timeframes.ts
│   │   ├── types\
│   │   │   └── bitget.ts            # Candle, Ticker, etc.
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                # Tailwind
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
├── probe_btcusdt_perp.py            # existing
├── probe_cfd*.py                    # existing
├── test_public_api.py               # existing
├── test_results.json                # existing
└── test_results.log                 # existing
```

---

## Decision log (so we don't re-litigate)

| Decision | Choice | Why |
|---|---|---|
| Chart library | `lightweight-charts` | TradingView's free lib, purpose-built for OHLCV, ~50KB, TS types |
| State management | React `useState` + `useEffect` for now | No Redux/Zustand until we actually need cross-component state |
| Styling | Tailwind v4 | Per your spec; v4 is simpler config than v3 |
| Default symbol | `BTCUSDT` perpetual | Per your call — **single symbol, no picker** |
| Polling vs WS | Try WS first, polling as fallback | WS is faster; polling is bulletproof |
| Symbol switching | ❌ out of scope | Per your call — BTCUSDT only. Easy to add later if needed |
| Auth | None for now | All public endpoints. Private (trading) is a different project |
