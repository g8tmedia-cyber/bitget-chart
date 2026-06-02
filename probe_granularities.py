"""Probe which candle granularities Bitget V2 /api/v2/mix/market/candles accepts.

The hour-based granularities use UPPERCASE H (1H, 4H, 6H, 12H), not
lowercase. The day/week/month ones are also uppercase (1D, 1W, 1M).
This script covers the full set Bitget documents as valid.
"""
import json
import sys
import time
import urllib.request
import urllib.error

URL = "https://api.bitget.com/api/v2/mix/market/candles"

# The 19 candidate granularities we want to test.
# NOTE: 1H/4H/6H/12H must be uppercase. The script used to test
# lowercase 'h' which is why hour-based ones used to look "unsupported".
CANDIDATES = [
    "1s",
    "1m", "2m", "3m", "5m", "15m", "30m",
    "1H", "2H", "4H", "6H", "8H", "12H",
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
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
            results.append((g, f"{body.get('code', e.code)}", 0, False))
        except Exception:
            results.append((g, f"HTTP {e.code}", 0, False))
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
