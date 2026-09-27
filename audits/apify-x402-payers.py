#!/usr/bin/env python3
"""Reproducible count of USDC paid to Apify's x402 payTo on Base, over a fixed UTC window.

Source: Blockscout public API (base.blockscout.com), no key. Counts every USDC
transfer INTO the payTo (gross), every USDC transfer OUT of it to a wallet that
paid in the window (refunds), and reports net, distinct payers, repeat payers
(paid on 2+ distinct UTC days), and the method selector on each payment tx.

Usage: python3 audits/apify-x402-payers.py [START_ISO] [END_ISO]
Default window: 2026-09-20T00:00:00Z .. 2026-09-27T00:00:00Z (7 full UTC days).
Written cycle 7 (2026-09-27) to answer evidencetraderresearch's appendix request.
"""
import json, sys, time, urllib.request
from collections import defaultdict

PAYTO = "0x4aAbE17C239eF71c3A26bA7C2b3e0AeBbfC1DF26"
USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
START = sys.argv[1] if len(sys.argv) > 1 else "2026-09-20T00:00:00Z"
END = sys.argv[2] if len(sys.argv) > 2 else "2026-09-27T00:00:00Z"
BASE = f"https://base.blockscout.com/api/v2/addresses/{PAYTO}/token-transfers?type=ERC-20&token={USDC}"

def get(url):
    for i in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "curl/8.5.0"})  # default UA gets Cloudflare 1010
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 ** i)
    raise SystemExit(f"fetch failed: {url}")

rows, params = [], None
while True:
    url = BASE + ("" if not params else "&" + "&".join(f"{k}={v}" for k, v in params.items()))
    d = get(url)
    stop = False
    for it in d["items"]:
        ts = it["timestamp"].replace(".000000Z", "Z")
        if ts < START:
            stop = True
            break
        if ts >= END:
            continue
        rows.append({
            "ts": ts, "tx": it["transaction_hash"], "method": it.get("method"),
            "from": it["from"]["hash"].lower(), "to": it["to"]["hash"].lower(),
            "usd": int(it["total"]["value"]) / 1e6,
        })
    params = d.get("next_page_params")
    if stop or not params:
        break

p = PAYTO.lower()
ins = [r for r in rows if r["to"] == p]
outs = [r for r in rows if r["from"] == p]
payers = defaultdict(lambda: {"usd": 0.0, "n": 0, "days": set()})
for r in ins:
    x = payers[r["from"]]; x["usd"] += r["usd"]; x["n"] += 1; x["days"].add(r["ts"][:10])
refunds = [r for r in outs if r["to"] in payers]
other_out = [r for r in outs if r["to"] not in payers]
methods = defaultdict(int)
for r in ins:
    methods[r["method"]] += 1

gross = sum(r["usd"] for r in ins); ref = sum(r["usd"] for r in refunds)
print(f"window {START} .. {END}  payTo {PAYTO}")
print(f"payments in: {len(ins)}  gross ${gross:.2f}  distinct payers {len(payers)}")
print(f"refunds to those payers: {len(refunds)}  ${ref:.2f}   net ${gross - ref:.2f}")
print(f"other USDC out (not to a window payer): {len(other_out)}  ${sum(r['usd'] for r in other_out):.2f}")
print(f"repeat payers (2+ UTC days): {sum(1 for x in payers.values() if len(x['days']) > 1)}")
print("methods on payment txs:", dict(methods))
top = sorted(payers.items(), key=lambda kv: -kv[1]["usd"])
print(f"top payer share: {top[0][1]['usd'] / gross:.1%}" if gross else "no payments")
for a, x in top:
    print(f"  {a}  ${x['usd']:.2f}  n={x['n']}  days={len(x['days'])}")
