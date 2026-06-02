# BTCUSDT Chart App — TODO

> **Project:** Vite + React 18 + TypeScript + Tailwind v4 + lightweight-charts
> **Symbol:** `BTCUSDT` (USDT-FUTURES perpetual) — single symbol, no picker
> **Data:** Bitget public V2 REST + WS
> **Status legend:** ✅ done · 🔄 in progress · ⏳ pending · ❌ cancelled

📋 Full breakdown with acceptance criteria: [`web/TASKS.md`](web/TASKS.md)

---

## Phase 0 — Foundation
- [x] 0.1 Public API smoke test (24 endpoints)
- [x] 0.2 BTCUSDT perp candles across 11 timeframes
- [x] 0.3 NDX100USDT verified as alt (out of scope)

## Phase 1 — Project Scaffolding
- [x] 1.1 Init Vite + React + TS in `C:\dev\bitget\web\`
- [x] 1.2 Install deps (Tailwind v4, lightweight-charts)
- [x] 1.3 Configure Tailwind v4
- [x] 1.4 Verify blank Vite page loads

## Phase 2 — API Client Brick
- [x] 2.1 `getCandles(symbol, granularity, limit)`
- [x] 2.2 `getTicker(symbol)`
- [x] 2.3 `getSymbols()`
- [x] 2.4 `<ApiDebug />` page to verify data flows in browser (later removed once real chart took over)

## Phase 3 — Timeframe Config
- [x] 3.1 `src/config/timeframes.ts` with 11 timeframes
- [x] 3.2 Granularity lookup helper

## Phase 4 — Chart Brick (mock data first)
- [x] 4.1 Install + import lightweight-charts
- [x] 4.2 `CandleChart.tsx` with hardcoded mock data
- [x] 4.3 Auto-resize on window resize

## Phase 5 — Wire Chart to Real API
- [x] 5.1 Replace mock with `getCandles` call
- [x] 5.2 Loading state
- [x] 5.3 Error state + retry
- [x] 5.4 Empty state

## Phase 6 — Timeframe Selector
- [x] 6.1 11 buttons
- [x] 6.2 Click → refetch + re-render
- [x] 6.3 Active button highlighted

## Phase 7 — WebSocket Live Updates
- [x] 7.1 `bitget-ws.ts` WebSocket client
- [x] 7.2 Subscribe to `candle{symbol}` channel
- [x] 7.3 Update last bar on push
- [x] 7.4 Auto-reconnect

## Phase 8 — App Shell + Dark Theme
- [x] 8.1 Top bar (symbol, price, 24h change)
- [x] 8.2 Layout (top / chart / timeframe)
- [x] 8.3 Dark theme
- [x] 8.4 Crosshair + price axis (legend overlay added)

## Phase 9 — Polish
- [x] 9.1 Smooth transitions on TF switch
- [x] 9.2 "Last updated Xs ago" indicator
- [x] 9.3 Volume sub-pane
- [x] 9.4 Mobile responsive (flex + responsive top bar)

## Phase 10 — Final E2E + README
- [x] 10.1 `tsc --noEmit` clean
- [x] 10.2 `vite build` succeeds (322 KB / 103 KB gzipped)
- [x] 10.3 Full E2E walkthrough (deferred to user — `npm run dev` blocks on my side)
- [x] 10.4 README in `web/`

---

**Progress:** 41/41 done · Status: ready for the user's dev-server E2E check
