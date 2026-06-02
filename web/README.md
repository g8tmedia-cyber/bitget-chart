# BTCUSDT Chart — Bitget

A single-page dark-theme candlestick chart for the BTCUSDT perpetual futures
contract on Bitget. Vite + React 18 + TypeScript + Tailwind v4 +
[lightweight-charts](https://github.com/tradingview/lightweight-charts) v4.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run typecheck   # tsc -b --noEmit
npm run build       # tsc -b && vite build → dist/
npm run preview     # serve the built bundle
```

## What it does

- Pulls 200 candles of BTCUSDT perp from Bitget V2 public REST
  (`/api/v2/mix/market/candles`, `productType=USDT-FUTURES`).
- Subscribes to the matching public WebSocket channel
  (`wss://ws.bitget.com/v2/ws/public`, `candle{granularity}`) and merges live
  ticks into the last bar (or appends a new one on rollover).
- Auto-reconnects the WS with exponential backoff (1s → 30s cap).
- Polls the 24h ticker every 15s for the top bar (price, 24h change,
  high/low, volume, funding rate).
- Crosshair-following OHLC legend overlay; volume sub-pane.
- 11 timeframes: 1m · 5m · 15m · 30m · 1H · 4H · 6H · 12H · 1D · 1W · 1M.

## Project layout

```
src/
├── api/
│   ├── bitget.ts       REST client (typed)
│   ├── bitget-ws.ts    Public WS client with reconnect + ping
│   ├── raw-types.ts    Wire-format types (strings)
│   └── types.ts        App-facing types (numbers, seconds)
├── components/
│   ├── CandleChart.tsx    lightweight-charts wrapper
│   ├── CandleLegend.tsx   OHLC overlay
│   ├── ChartPane.tsx      loading/error/empty + crosshair wiring
│   ├── LastUpdated.tsx    "updated Xs ago" indicator
│   ├── TimeframeSelector.tsx
│   └── TopBar.tsx
├── config/
│   └── timeframes.ts   The 11 supported TFs (label / granularity / ws / seconds)
├── hooks/
│   ├── useChartData.ts   REST snapshot + WS live merge
│   └── useTicker.ts      24h ticker poll
├── App.tsx
├── index.css
└── main.tsx
```

## Bitget specifics worth knowing

- **Granularity strings differ** between spot and mix: spot uses
  `1min` / `1h` / `1day`; mix uses `1m` / `1H` / `1D`. This app uses mix.
- The V2 server-time endpoint is `/api/v2/public/time`, **not**
  `/api/v2/spot/public/time`.
- Public REST rate limit is 10–20 req/s per group; the app fires at most one
  candle fetch per timeframe switch and a 15s ticker poll, well under the cap.
- WS doesn't require auth for the public candle channel; just subscribe
  with `op: "subscribe"` and the right `channel` (`candle1m` … `candle1M`).

## What's not in scope

- Authenticated endpoints (account, orders, transfers) — needs an API key/secret.
- A symbol picker — BTCUSDT perp only.
- Drawing tools / indicators — out of scope for the MVP.
- V1 endpoints — V2 is the current spec.
