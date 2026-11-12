# Usage: curl -s "https://aibtc.com/api/bounties?status=paid&limit=200" > paid.json; python3 -I aibtc-paid-tally.py paid.json out.json  (reads each paidTxid from the Hiro API; 2026-11-12)
import json,sys,urllib.request,collections,time
d=json.load(open(sys.argv[1]))["bounties"]
rows=[]
for r in d:
    u="https://api.hiro.so/extended/v1/tx/"+r["paidTxid"]
    for k in range(3):
        try:
            t=json.load(urllib.request.urlopen(u,timeout=30)); break
        except Exception as e:
            time.sleep(2); t=None
    if not t: rows.append((r["id"],r["posterStxAddress"],None,None,r["rewardSats"],None)); continue
    cc=t.get("contract_call",{}); a={x["name"]:x["repr"] for x in cc.get("function_args",[])}
    rows.append((r["id"],r["posterStxAddress"],a.get("sender","").strip("'"),a.get("recipient","").strip("'"),a.get("amount"),t["tx_status"],r["rewardSats"]))
json.dump(rows,open(sys.argv[2],"w"))
