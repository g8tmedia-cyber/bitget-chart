"""
Bitget Public API Smoke Test (v2)
=================================
Exercises every documented V2 public endpoint for spot + mix/futures.
No auth, uses `requests`. Prints a one-line pass/fail per endpoint and
writes a JSON report to ./test_results.json.

Run:  python test_public_api.py
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = "https://api.bitget.com"
UA = "bitget-public-smoketest/2.1 (+local)"

# Reusable session with retry/backoff for transient SSL/connection errors
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": UA, "Accept": "application/json"})
RETRY = Retry(
    total=3,
    backoff_factor=0.4,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=frozenset(["GET"]),
    raise_on_status=False,
)
ADAPTER = HTTPAdapter(max_retries=RETRY, pool_connections=10, pool_maxsize=10)
SESSION.mount("https://", ADAPTER)
SESSION.mount("http://", ADAPTER)


def _now_ms() -> int:
    return int(time.time() * 1000)


# 24h window for any *-candles that need start/end
NOW_MS = _now_ms()
DAY_AGO_MS = NOW_MS - 24 * 60 * 60 * 1000


# Granularity strings accepted by V2 (different per product!):
#   spot candles / history-candles: "1min", "5min", "15min", "30min", "1h", "4h", "6h", "12h", "1day", "3day", "1week", "1M"
#   mix  candles: "1m", "5m", "15m", "30m", "1H", "4H", "6H", "12H", "1D", "1W", "1M"
SPOT_GRAN = "1min"
SPOT_GRAN_DAY = "1day"
MIX_GRAN = "1m"
MIX_GRAN_DAY = "1D"

ENDPOINTS = [
    # ---------------- Spot public ----------------
    ("spot  / public/time",                       "/api/v2/public/time",                              {}),
    ("spot  / public/coins",                      "/api/v2/spot/public/coins",                         {}),
    ("spot  / public/symbols",                    "/api/v2/spot/public/symbols",                       {}),
    ("spot  / market/tickers (all)",              "/api/v2/spot/market/tickers",                       {}),
    ("spot  / market/ticker  BTC",                "/api/v2/spot/market/tickers",                       {"symbol": "BTCUSDT"}),
    ("spot  / market/ticker  ETH",                "/api/v2/spot/market/tickers",                       {"symbol": "ETHUSDT"}),
    ("spot  / market/ticker  SOL",                "/api/v2/spot/market/tickers",                       {"symbol": "SOLUSDT"}),
    ("spot  / market/orderbook BTC",              "/api/v2/spot/market/orderbook",                     {"symbol": "BTCUSDT", "limit": "15"}),
    ("spot  / market/orderbook ETH",              "/api/v2/spot/market/orderbook",                     {"symbol": "ETHUSDT", "limit": "15"}),
    ("spot  / market/fills    BTC",               "/api/v2/spot/market/fills",                         {"symbol": "BTCUSDT", "limit": "5"}),
    ("spot  / market/candles  BTC 1min",          "/api/v2/spot/market/candles",                       {"symbol": "BTCUSDT", "granularity": SPOT_GRAN, "limit": "3"}),
    ("spot  / market/candles  ETH 1h",            "/api/v2/spot/market/candles",                       {"symbol": "ETHUSDT", "granularity": "1h", "limit": "3"}),
    ("spot  / market/history-candles BTC 1day",   "/api/v2/spot/market/history-candles",
        {"symbol": "BTCUSDT", "granularity": SPOT_GRAN_DAY, "startTime": str(DAY_AGO_MS), "endTime": str(NOW_MS), "limit": "3"}),
    # ---------------- Mix / Futures public ----------------
    ("mix   / market/tickers (USDT-FUT all)",     "/api/v2/mix/market/tickers",                        {"productType": "USDT-FUTURES"}),
    ("mix   / market/ticker  BTC PERP",           "/api/v2/mix/market/ticker",                         {"symbol": "BTCUSDT", "productType": "USDT-FUTURES"}),
    ("mix   / market/ticker  ETH PERP",           "/api/v2/mix/market/ticker",                         {"symbol": "ETHUSDT", "productType": "USDT-FUTURES"}),
    ("mix   / market/orderbook BTC PERP",         "/api/v2/mix/market/orderbook",                      {"symbol": "BTCUSDT", "productType": "USDT-FUTURES", "limit": "15"}),
    ("mix   / market/fills    BTC PERP",          "/api/v2/mix/market/fills",                          {"symbol": "BTCUSDT", "productType": "USDT-FUTURES", "limit": "5"}),
    ("mix   / market/candles  BTC 1m",            "/api/v2/mix/market/candles",                        {"symbol": "BTCUSDT", "productType": "USDT-FUTURES", "granularity": MIX_GRAN, "limit": "3"}),
    ("mix   / market/candles  ETH 1H",            "/api/v2/mix/market/candles",                        {"symbol": "ETHUSDT", "productType": "USDT-FUTURES", "granularity": "1H", "limit": "3"}),
    ("mix   / market/history-candles BTC 1D",     "/api/v2/mix/market/history-candles",
        {"symbol": "BTCUSDT", "productType": "USDT-FUTURES", "granularity": MIX_GRAN_DAY, "startTime": str(DAY_AGO_MS), "endTime": str(NOW_MS), "limit": "3"}),
    # ---------------- Market context (public) ----------------
    ("mix   / market/funding-rate BTC",           "/api/v2/mix/market/current-fund-rate",              {"symbol": "BTCUSDT", "productType": "USDT-FUTURES"}),
    ("mix   / market/open-interest BTC",          "/api/v2/mix/market/open-interest",                  {"symbol": "BTCUSDT", "productType": "USDT-FUTURES"}),
    # V2 mix mark-price is at /api/v2/mix/market/mark-price; some V1 docs list it under ticker.
    # ---------------- Extra spot symbol info ----------------
    ("spot  / public/symbols?BTCUSDT",            "/api/v2/spot/public/symbols",                       {"symbol": "BTCUSDT"}),
]


def http_get(path: str, params: dict, timeout: float = 10.0) -> tuple[int, float, dict | str]:
    """Return (http_status, elapsed_ms, body). Retries via the session adapter."""
    url = BASE + path
    t0 = time.perf_counter()
    try:
        r = SESSION.get(url, params=params, timeout=timeout)
        elapsed = (time.perf_counter() - t0) * 1000.0
        text = r.text
        try:
            return r.status_code, elapsed, json.loads(text)
        except Exception:
            return r.status_code, elapsed, text[:500]
    except requests.exceptions.SSLError as e:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return 0, elapsed, f"SSLError: {str(e)[:200]}"
    except requests.exceptions.ConnectionError as e:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return 0, elapsed, f"ConnectionError: {str(e)[:200]}"
    except requests.exceptions.Timeout as e:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return 0, elapsed, f"Timeout: {str(e)[:200]}"
    except requests.exceptions.RequestException as e:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return 0, elapsed, f"RequestException: {type(e).__name__}: {str(e)[:200]}"


def summarize(label: str, status: int, elapsed_ms: float, body) -> str:
    ok = (status == 200) and isinstance(body, dict) and body.get("code") == "00000"
    flag = "OK  " if ok else "FAIL"
    hint = ""
    if isinstance(body, dict):
        if "data" in body:
            data = body["data"]
            if isinstance(data, list):
                hint = f"data=list[{len(data)}]"
                if data and isinstance(data[0], dict):
                    keys = list(data[0].keys())[:6]
                    hint += f" keys={keys}"
            elif isinstance(data, dict):
                keys = list(data.keys())[:8]
                hint = f"data=dict keys={keys}"
                if "lastPr" in data:
                    hint += f" lastPr={data['lastPr']}"
                if "asks" in data and "bids" in data:
                    a0 = data["asks"][0] if data["asks"] else ["-", "-"]
                    b0 = data["bids"][0] if data["bids"] else ["-", "-"]
                    hint += f" best_bid={b0[0]} best_ask={a0[0]}"
                if "openInterestList" in data:
                    oi = data["openInterestList"]
                    if oi:
                        hint += f" oi_size={oi[0].get('size')}"
        if body.get("code") and body.get("code") != "00000":
            hint = f"errCode={body.get('code')} msg={body.get('msg')}"
    elif isinstance(body, str):
        hint = body[:80].replace("\n", " ")
    return f"[{flag}] {status:>3} {elapsed_ms:6.1f}ms  {label:<48}  {hint}"


def main() -> int:
    out_dir = Path(__file__).resolve().parent
    log_path = out_dir / "test_results.log"
    json_path = out_dir / "test_results.json"

    started = datetime.now(timezone.utc).isoformat()
    results = []
    print("=" * 100)
    print(f"Bitget Public API Smoke Test v2  -  {started}")
    print(f"Base: {BASE}")
    print("=" * 100)
    with log_path.open("w", encoding="utf-8") as logf:
        logf.write(f"Bitget Public API Smoke Test v2  -  {started}\nBase: {BASE}\n\n")

        for i, (label, path, params) in enumerate(ENDPOINTS, 1):
            status, elapsed, body = http_get(path, params)
            line = summarize(label, status, elapsed, body)
            print(line)
            logf.write(line + "\n")
            logf.flush()
            results.append({
                "label": label,
                "path": path,
                "params": params,
                "status": status,
                "elapsed_ms": round(elapsed, 2),
                "ok": (status == 200) and isinstance(body, dict) and body.get("code") == "00000",
                "body": body if not isinstance(body, str) else {"_raw": body},
            })
            # Small throttle to stay well under the 10-20 req/s IP rate limit
            if i % 5 == 0:
                time.sleep(0.2)

    ok_count = sum(1 for r in results if r["ok"])
    fail_count = len(results) - ok_count
    summary_line = f"\nDone. {ok_count} passed / {fail_count} failed / {len(results)} total."
    print(summary_line)
    with log_path.open("a", encoding="utf-8") as logf:
        logf.write(summary_line + "\n")

    json_path.write_text(json.dumps({
        "started": started,
        "finished": datetime.now(timezone.utc).isoformat(),
        "base": BASE,
        "results": results,
    }, indent=2), encoding="utf-8")

    print(f"Logs:  {log_path}")
    print(f"JSON:  {json_path}")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
