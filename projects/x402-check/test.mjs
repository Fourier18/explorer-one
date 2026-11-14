import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, SAMPLE, PRICE_ATOMIC } from "./server.mjs";
import { checkClaim } from "./check.mjs";

const PAYTO = "0xb878951d7e70ecc4B792FE202E2063054104642F";
const start = async (opts) => { const s = makeServer({ payTo: PAYTO, baseUrl: "http://x", ...opts });
  await new Promise((r) => s.listen(0, r)); return { s, u: `http://127.0.0.1:${s.address().port}` }; };
const post = (u, body, h = {}) => fetch(u + "/check", { method: "POST", body: JSON.stringify(body), headers: h });
const fakeFac = (log) => ({ verify: async () => ({ isValid: true }), settle: async () => { log.push("settle"); return { success: true, transaction: "0xsettle", network: "eip155:8453" }; } });
const PAID = { "payment-signature": Buffer.from(JSON.stringify({ x: 1 })).toString("base64") };

test("402 quote binds payee, token, amount, network and a request digest", async () => {
  const { s, u } = await start({}); const r = await post(u, { txHash: SAMPLE.txHash }); const q = await r.json(); s.close();
  assert.equal(r.status, 402); const a = q.accepts[0];
  assert.equal(a.payTo, PAYTO); assert.equal(a.amount, PRICE_ATOMIC); assert.equal(a.network, "eip155:8453");
  assert.equal(a.asset, "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"); assert.match(q.resource.requestDigest, /^[0-9a-f]{64}$/);
});
test("no facilitator: paid request is refused with 501 and nothing is settled", async () => {
  const { s, u } = await start({}); const r = await post(u, { txHash: SAMPLE.txHash }, PAID); s.close(); assert.equal(r.status, 501);
});
test("replay with same key and body returns the same artifact, settles once", async () => {
  const log = []; const { s, u } = await start({ facilitator: fakeFac(log), check: async () => ({ verdict: "match" }) });
  const h = { ...PAID, "idempotency-key": "k1" };
  const a = await post(u, { txHash: SAMPLE.txHash }, h), b = await post(u, { txHash: SAMPLE.txHash }, h); s.close();
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(b.headers.get("x-replay"), "true");
  assert.deepEqual(await a.json(), await b.json()); assert.equal(log.length, 1);
});
test("same key, different body: 409", async () => {
  const log = []; const { s, u } = await start({ facilitator: fakeFac(log), check: async () => ({ verdict: "match" }) });
  const h = { ...PAID, "idempotency-key": "k2" };
  await post(u, { txHash: SAMPLE.txHash }, h); const r = await post(u, { txHash: SAMPLE.txHash, amountAtomic: "5" }, h); s.close(); assert.equal(r.status, 409);
});
test("check that cannot run: 502 and no settlement", async () => {
  const log = []; const { s, u } = await start({ facilitator: fakeFac(log), check: async () => { throw new Error("rpc down"); } });
  const r = await post(u, { txHash: SAMPLE.txHash }, PAID); s.close(); assert.equal(r.status, 502); assert.equal(log.length, 0);
});
test("live: known receipt matches on two RPCs; wrong amount mismatches", async () => {
  const ok = await checkClaim(SAMPLE), bad = await checkClaim({ ...SAMPLE, amountAtomic: "2000000" });
  assert.equal(ok.verdict, "match"); assert.equal(ok.rpcsAgree, true); assert.equal(ok.block, 53505368);
  assert.equal(bad.verdict, "mismatch");
});
test("live: /sample returns the match", async () => {
  const { s, u } = await start({}); const j = await (await fetch(u + "/sample")).json(); s.close(); assert.equal(j.verdict, "match");
});
