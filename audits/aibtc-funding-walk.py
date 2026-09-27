import json,urllib.request,collections,sys,time
SB='SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token'
def get(u):
    for i in range(4):
        try: return json.load(urllib.request.urlopen(u,timeout=30))
        except Exception as e: time.sleep(2**i)
    raise
for A in sys.argv[1:]:
    off=0; res=[]
    while True:
        d=get(f"https://api.hiro.so/extended/v1/address/{A}/transactions_with_transfers?limit=50&offset={off}")
        res+=d['results']; off+=50
        if off>=d['total']: break
    inb=collections.Counter(); out=collections.Counter(); first=None; kinds=collections.Counter()
    for r in res:
        t=r['tx']
        if t['tx_status']!='success': continue
        for f in r['ft_transfers']:
            if f['asset_identifier']!=SB: continue
            a=int(f['amount'])
            if f['recipient']==A: inb[f['sender'] or 'MINT(peg-in)']+=a; kinds[(t['tx_type'],t.get('contract_call',{}).get('function_name'))]+=1
            if f['sender']==A: out[f['recipient'] or 'BURN(peg-out)']+=a
    ts=[r['tx'].get('block_time_iso') for r in res if r['tx'].get('block_time_iso')]
    print('==',A,'txs',len(res),'span',min(ts),max(ts))
    print(' sBTC IN total',sum(inb.values())); [print('  in ',k,v) for k,v in inb.most_common(8)]
    print(' sBTC OUT total',sum(out.values()),'to',len(out),'recipients')
    print(' inbound tx kinds',kinds.most_common(5))
