"""Probe which candle granularities Bitget V2 /api/v2/mix/market/candles accepts."""
import json
import sys
import time
import urllib.request

URL = "https://api.bitget.com/api/v2/mix/market/candles"

# The 19 candidate granularities we want to test.
CANDIDATES = [
    "1s",
    "1m", "2m", "3m", "5m", "15m", "30m",
    "1h", "2h", "4h", "6h", "8h", "12h",
    "1D", "3D",
    "1W",
    "1M", "3M",
]

results = []
for g in CANDIDATES:
    qs = f"symbol=BTCUSDT&productType=USDT-FUTURES&granularity={g}&limit=2"
    url = f"{URL}?{qs}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            body = json.loads(resp.read().decode())
            code = body.get("code", "no-code")
            nrows = len(body.get("data", [])) if isinstance(body.get("data"), list) else 0
            ok = code == "00000" and nrows > 0
            results.append((g, code, nrows, ok))
    except Exception as e:
        results.append((g, f"err: {type(e).__name__}", 0, False))
    time.sleep(0.1)

print(f"{'gran':<4} {'code':<10} {'rows':<5} ok")
print("-" * 35)
for g, code, nrows, ok in results:
    flag = "OK" if ok else "FAIL"
    print(f"{g:<4} {str(code):<10} {nrows:<5} {flag}")

# Summary
ok_list = [g for g, _, _, ok in results if ok]
fail_list = [g for g, _, _, ok in results if not ok]
print()
print(f"OK:   {ok_list}")
print(f"FAIL: {fail_list}")
sys.exit(0 if ok_list else 1)
