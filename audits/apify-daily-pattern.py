import json,urllib.request,sys,time
RPC="https://base.gateway.tenderly.co"
USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
T="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
PAY="0x4aAbE17C239eF71c3A26bA7C2b3e0AeBbfC1DF26".lower()
def rpc(m,p):
  r=urllib.request.Request(RPC,json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p}).encode(),{"Content-Type":"application/json"})
  return json.load(urllib.request.urlopen(r,timeout=30))
latest=int(rpc("eth_blockNumber",[])["result"],16)
lt=int(rpc("eth_getBlockByNumber",[hex(latest),False])["result"]["timestamp"],16)
start_ts=int(sys.argv[1]); end_ts=int(sys.argv[2])
b0=latest-(lt-start_ts)//2; b1=latest-(lt-end_ts)//2
pad="0x"+"0"*24+PAY[2:]
out=[]
for side in (1,2):
  for s in range(b0,b1,1000):
    e=min(s+999,b1); topics=[T,None,None]; topics[side]=pad
    for a in range(4):
      r=rpc("eth_getLogs",[{"address":USDC,"fromBlock":hex(s),"toBlock":hex(e),"topics":topics}])
      if "result" in r: break
      time.sleep(3)
    else: print("ERR",r); sys.exit(1)
    for l in r["result"]:
      out.append((int(l["blockNumber"],16),"IN " if side==2 else "OUT","0x"+l["topics"][1][26:],"0x"+l["topics"][2][26:],int(l["data"],16)/1e6,l["transactionHash"]))
    time.sleep(0.5)
for o in sorted(out):
  bt=lt-(latest-o[0])*2
  print(time.strftime("%m-%d %H:%M:%S",time.gmtime(bt)),o[1],o[2][:10],"->",o[3][:10],o[4],o[5][:12])
print("blocks",b0,b1,"n",len(out))
