# Bitget Public API — Smoke Test

Verifies that the public (no-auth) Bitget V2 REST endpoints work for spot
and mix/futures, covering tickers, order book, recent trades, candles,
history candles, funding rate, and open interest.

## Files

- `test_public_api.py` — runs the smoke test, prints pass/fail per endpoint,
  writes `test_results.log` and `test_results.json`.
- `inspect_samples.py` — pretty-prints one sample body per data shape from
  the latest `test_results.json`.
- `test_results.json` — last run's full response bodies (per endpoint).
- `test_results.log` — last run's pass/fail line per endpoint.

## Run

```bash
pip install requests          # only external dep
python test_public_api.py
python inspect_samples.py     # peek at sample bodies
```

## Endpoints covered (24 total, all verified working)

Base URL: `https://api.bitget.com`

### Spot — public, no auth required

| Purpose           | Path                                  | Notes                              |
|-------------------|---------------------------------------|------------------------------------|
| Server time       | `GET /api/v2/public/time`             |                                    |
| All coins         | `GET /api/v2/spot/public/coins`       | 2 188 coins                        |
| All symbols       | `GET /api/v2/spot/public/symbols`     | 696 pairs; `?symbol=BTCUSDT` works |
| Tickers           | `GET /api/v2/spot/market/tickers`     | omit `symbol` for all, or pass 1   |
| Order book depth  | `GET /api/v2/spot/market/orderbook`   | `limit` ≤ 100                      |
| Recent trades     | `GET /api/v2/spot/market/fills`       | `limit` ≤ 500                      |
| Candles (latest)  | `GET /api/v2/spot/market/candles`     | granularity: `1min` `5min` `15min` `30min` `1h` `4h` `6h` `12h` `1day` `3day` `1week` `1M` |
| History candles   | `GET /api/v2/spot/market/history-candles` | needs `startTime` + `endTime` (ms) |

### Mix / Futures — public, no auth required

`productType` ∈ {`USDT-FUTURES`, `COIN-FUTURES`, `USDC-FUTURES`}.

| Purpose           | Path                                          | Notes                          |
|-------------------|-----------------------------------------------|--------------------------------|
| Tickers (all)     | `GET /api/v2/mix/market/tickers`              | needs `productType`            |
| Single ticker     | `GET /api/v2/mix/market/ticker`               | needs `productType`            |
| Order book        | `GET /api/v2/mix/market/orderbook`            |                                |
| Recent fills      | `GET /api/v2/mix/market/fills`                |                                |
| Candles (latest)  | `GET /api/v2/mix/market/candles`              | granularity: `1m` `5m` `15m` `30m` `1H` `4H` `6H` `12H` `1D` `1W` `1M` |
| History candles   | `GET /api/v2/mix/market/history-candles`      | needs `startTime` + `endTime` (ms) |
| Current funding   | `GET /api/v2/mix/market/current-fund-rate`    |                                |
| Open interest     | `GET /api/v2/mix/market/open-interest`        |                                |

## Gotchas found while testing

- **V2 server time** is at `/api/v2/public/time` (NOT `/api/v2/spot/public/time`).
- **Granularity strings differ** between spot and mix: spot uses `1min`/`1h`/`1day`,
  mix uses `1m`/`1H`/`1D`. Sending the wrong one returns HTTP 400.
- **`history-candles` requires `startTime` + `endTime`** (Unix-ms). `candles` does not.
- **Mix `fills` lives at `/api/v2/mix/market/fills`** with `productType=USDT-FUTURES`
  — the V1 path `BTCUSDT_UMCBL` style no longer works for V2.
- **Public IP rate limit** is 10–20 req/s per endpoint group. The test throttles to
  5 requests then sleeps 200 ms; staying well under the limit.

## Latencies (last run, Asia/Manila → Bitget)

Spot endpoints: 90–450 ms (median ~120 ms).
Mix endpoints:  90–200 ms (median ~115 ms).

## What's NOT covered (intentionally)

- **WebSocket public channels** (`ticker`, `candles`, `depth`, `trades`) — the ask
  was for public REST. WS can be added next.
- **Authenticated endpoints** (account, orders, transfers) — needs API key/secret.
- **V1 endpoints** — V2 is the current spec; V1 is being phased out.
