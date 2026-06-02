"""Print one sample body per data shape from the test results."""
import json
from pathlib import Path

p = Path(__file__).with_name("test_results.json")
d = json.loads(p.read_text(encoding="utf-8"))
print(f"started:  {d['started']}")
print(f"finished: {d['finished']}")
print(f"total:    {len(d['results'])}\n")

samples = {
    "server-time":   next((r for r in d["results"] if "public/time" in r["label"]), None),
    "spot-ticker":   next((r for r in d["results"] if "ticker  BTC" in r["label"] and "spot" in r["label"]), None),
    "spot-orderbook":next((r for r in d["results"] if "orderbook BTC" in r["label"] and "spot" in r["label"]), None),
    "spot-fills":    next((r for r in d["results"] if "fills    BTC" in r["label"] and "spot" in r["label"]), None),
    "spot-candles":  next((r for r in d["results"] if "candles  BTC 1min" in r["label"]), None),
    "spot-history":  next((r for r in d["results"] if "history-candles" in r["label"] and "spot" in r["label"]), None),
    "mix-ticker":    next((r for r in d["results"] if "ticker  BTC PERP" in r["label"]), None),
    "mix-orderbook": next((r for r in d["results"] if "orderbook BTC PERP" in r["label"]), None),
    "mix-funding":   next((r for r in d["results"] if "funding-rate" in r["label"]), None),
    "mix-openint":   next((r for r in d["results"] if "open-interest" in r["label"]), None),
}

for name, r in samples.items():
    if r is None:
        print(f"-- {name}: NOT FOUND --"); continue
    print("=" * 72)
    print(f"SAMPLE: {name}  --  {r['label']}")
    qs = "&".join(f"{k}={v}" for k, v in r["params"].items())
    print(f"  GET https://api.bitget.com{r['path']}?{qs}")
    print(f"  status={r['status']}  elapsed={r['elapsed_ms']}ms  ok={r['ok']}")
    body = r["body"]
    if isinstance(body, dict) and "data" in body:
        sample = body["data"]
        if isinstance(sample, list):
            print("  data[] (first 1 entry):")
            print("   ", json.dumps(sample[:1], indent=2)[:600])
        else:
            print("  data:")
            print("   ", json.dumps(sample, indent=2)[:600])
    print()
