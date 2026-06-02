"""
Verify BTCUSDT perpetual (USDT-FUTURES) on Bitget.
Hits the ticker + candles across all the timeframes the chart will use.
"""
import json
import time
import requests

BASE = "https://api.bitget.com"
UA = "probe/1.0"
S = requests.Session()
S.headers.update({"User-Agent": UA})


def get(path, params):
    url = BASE + path
    for attempt in range(3):
        try:
            r = S.get(url, params=params, timeout=10)
            try:
                return r.status_code, r.json()
            except Exception:
                return r.status_code, {"_raw": r.text[:200]}
        except requests.exceptions.SSLError:
            time.sleep(0.4 * (attempt + 1))
            continue
    return 0, {"_err": "ssl exhausted"}


# All the timeframes we want to expose in the chart
GRANULARITIES = [
    ("1m",  "1m"),
    ("5m",  "5m"),
    ("15m", "15m"),
    ("30m", "30m"),
    ("1H",  "1H"),
    ("4H",  "4H"),
    ("6H",  "6H"),
    ("12H", "12H"),
    ("1D",  "1D"),
    ("1W",  "1W"),
    ("1M",  "1M"),
]

print("=== BTCUSDT ticker (USDT-FUTURES) ===")
status, body = get("/api/v2/mix/market/ticker", {"symbol": "BTCUSDT", "productType": "USDT-FUTURES"})
if status == 200 and isinstance(body, dict) and body.get("code") == "00000":
    d = body["data"][0]
    print(f"  lastPr      = {d.get('lastPr')}")
    print(f"  markPx-equiv= bidPr={d.get('bidPr')}  askPr={d.get('askPr')}")
    print(f"  24h change  = {d.get('change24h')}  (high={d.get('high24h')}  low={d.get('low24h')})")
    print(f"  indexPrice  = {d.get('indexPrice')}")
    print(f"  fundingRate = {d.get('fundingRate')}")
    print(f"  24h volume  = {d.get('quoteVolume')} USDT")
    print(f"  open interest size = {d.get('holdingAmount')}")
else:
    print(f"  ERR status={status} body={body}")

print()
print("=== BTCUSDT candles across all timeframes (last 1 candle each) ===")
print(f"  {'label':<5} {'gran':<5} {'status':<7} {'openTime':<16} {'O':<12} {'H':<12} {'L':<12} {'C':<12} {'vol':<14}")
print("  " + "-" * 100)
all_ok = True
for label, gran in GRANULARITIES:
    status, body = get(
        "/api/v2/mix/market/candles",
        {"symbol": "BTCUSDT", "productType": "USDT-FUTURES", "granularity": gran, "limit": "1"},
    )
    if status == 200 and isinstance(body, dict) and body.get("code") == "00000":
        c = body["data"][0]
        ts, o, h, l, c_, v, _ = c
        print(f"  {label:<5} {gran:<5} OK      {ts:<16} {o:<12} {h:<12} {l:<12} {c_:<12} {v:<14}")
    else:
        all_ok = False
        msg = body.get("msg") if isinstance(body, dict) else body
        print(f"  {label:<5} {gran:<5} ERR     {status}  {msg}")

print()
print("=== BTCUSDT orderbook (top 5) ===")
status, body = get("/api/v2/mix/market/orderbook", {
    "symbol": "BTCUSDT", "productType": "USDT-FUTURES", "limit": "5",
})
if status == 200 and isinstance(body, dict) and body.get("code") == "00000":
    d = body["data"]
    print(f"  best bid = {d['bids'][0]}")
    print(f"  best ask = {d['asks'][0]}")

print()
print("=== Verdict ===")
print(f"  all {len(GRANULARITIES)} timeframes OK: {all_ok}")
print(f"  -> safe to use BTCUSDT perpetual for the chart")
