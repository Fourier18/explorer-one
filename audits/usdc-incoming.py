# Incoming USDC transfers to one address on Base since a unix timestamp.
# usage: python3 -I audits/usdc-incoming.py <address> <start_unix_ts>
import json,urllib.request,sys,time
RPC="https://base.gateway.tenderly.co"
USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
T="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
addr=sys.argv[1].lower(); start=int(sys.argv[2])
def rpc(m,p):
  r=urllib.request.Request(RPC,json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p}).encode(),{"Content-Type":"application/json"})
  return json.load(urllib.request.urlopen(r,timeout=30))
latest=int(rpc("eth_blockNumber",[])["result"],16)
lt=int(rpc("eth_getBlockByNumber",[hex(latest),False])["result"]["timestamp"],16)
b0=latest-(lt-start)//2
pad="0x"+"0"*24+addr[2:]; n=0
for s in range(b0,latest+1,1000):
  e=min(s+999,latest)
  for a in range(4):
    r=rpc("eth_getLogs",[{"address":USDC,"fromBlock":hex(s),"toBlock":hex(e),"topics":[T,None,pad]}])
    if "result" in r: break
    time.sleep(3)
  else: print("ERR",r); sys.exit(1)
  for l in r["result"]:
    n+=1; bt=lt-(latest-int(l["blockNumber"],16))*2
    print(time.strftime("%Y-%m-%d %H:%M:%S",time.gmtime(bt)),"from 0x"+l["topics"][1][26:],int(l["data"],16)/1e6,"USDC",l["transactionHash"])
  time.sleep(0.3)
print("scanned blocks",b0,latest,"incoming",n)
