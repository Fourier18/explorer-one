// Payment-claim check for USDC on Base. Reads a transaction from two independent RPCs and
// compares it with a claim. No dependencies. Everything returned is derived from chain reads.
export const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // canonical USDC on Base
export const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const RPCS = ["https://base.gateway.tenderly.co", "https://mainnet.base.org"];

async function rpc(url, method, params, fetchImpl = fetch) {
  const r = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(`${url}: ${j.error.message}`);
  return j.result;
}

const addr = (topic) => "0x" + topic.slice(26).toLowerCase();

async function readOne(url, txHash, fetchImpl) {
  const [receipt, head] = await Promise.all([
    rpc(url, "eth_getTransactionReceipt", [txHash], fetchImpl),
    rpc(url, "eth_blockNumber", [], fetchImpl)]);
  if (!receipt) return { url, found: false };
  const block = parseInt(receipt.blockNumber, 16);
  const transfers = receipt.logs.map((l, i) => ({ l, i })).filter(({ l }) => l.topics[0] === TRANSFER && l.topics.length === 3)
    .map(({ l, i }) => ({ logIndex: i, token: l.address.toLowerCase(), from: addr(l.topics[1]), to: addr(l.topics[2]),
      amountAtomic: BigInt(l.data).toString() }));
  return { url, found: true, status: receipt.status === "0x1" ? "success" : "failed", block,
    confirmations: parseInt(head, 16) - block + 1, transfers };
}

// claim: { txHash, from?, to?, amountAtomic? }  (USDC atomic units, 6 decimals)
export async function checkClaim(claim, { rpcs = RPCS, fetchImpl = fetch } = {}) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(claim.txHash || "")) throw new Error("txHash must be 0x + 64 hex");
  const reads = await Promise.all(rpcs.map((u) => readOne(u, claim.txHash, fetchImpl).catch((e) => ({ url: u, error: String(e.message) }))));
  const ok = reads.filter((r) => r.found);
  const agree = ok.length === rpcs.length && ok.every((r) => r.status === ok[0].status && r.block === ok[0].block &&
    JSON.stringify(r.transfers) === JSON.stringify(ok[0].transfers));
  const first = ok[0];
  const usdc = first ? first.transfers.filter((t) => t.token === USDC) : [];
  const want = (t) => (!claim.from || t.from === claim.from.toLowerCase()) && (!claim.to || t.to === claim.to.toLowerCase()) &&
    (!claim.amountAtomic || t.amountAtomic === String(claim.amountAtomic));
  const match = usdc.find(want) || null;
  const mismatches = [];
  if (first) {
    if (!usdc.length) mismatches.push("no transfer from canonical USDC in this transaction");
    else if (!match) mismatches.push("no canonical-USDC transfer matches the claimed from/to/amount");
    if (first.status !== "success") mismatches.push("transaction did not succeed");
  } else mismatches.push("transaction not found on any RPC");
  return {
    txHash: claim.txHash.toLowerCase(), readFrom: reads.map((r) => r.url), rpcErrors: reads.filter((r) => r.error),
    rpcsAgree: agree, status: first?.status ?? null, block: first?.block ?? null,
    confirmations: ok.length ? Math.min(...ok.map((r) => r.confirmations)) : null,
    canonicalToken: USDC, matchingTransfer: match, usdcTransfers: usdc, verdict: !mismatches.length && agree ? "match" : "mismatch",
    mismatches: agree || !ok.length ? mismatches : [...mismatches, "RPCs disagree"],
  };
}
