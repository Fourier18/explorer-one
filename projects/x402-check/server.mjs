// x402 seller for the payment-claim check. Node built-ins only.
//   GET  /sample          free: checks a fixed, known receipt (documentation, not a trial)
//   POST /check           0.01 USDC on Base: body {txHash, from?, to?, amountAtomic?}, header Idempotency-Key
// Order: verify payment -> run the check -> settle -> return. A failure before settle costs the buyer nothing.
// Settlement needs a facilitator (FACILITATOR_URL). Without one, POST /check answers 501 after the quote step.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { checkClaim, USDC } from "./check.mjs";

export const PRICE_ATOMIC = "10000"; // 0.01 USDC
export const SAMPLE = { txHash: "0x3f803ccc4194fbdc6bc329309f8d2c90cc47d457affbdf178a3628569d34f91b",
  to: "0xb878951d7e70ecc4B792FE202E2063054104642F", amountAtomic: "1000000" };

const canon = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).sort()));
export const digest = (body) => createHash("sha256").update(canon(body)).digest("hex");

export function makeServer({ payTo, baseUrl, check = checkClaim, facilitator = null }) {
  const done = new Map(); // key -> { digest, artifact }
  const quote = (digestHex) => ({ x402Version: 2, error: "payment required",
    resource: { url: `${baseUrl}/check`, description: "USDC payment-claim check on Base, two-RPC read", requestDigest: digestHex },
    accepts: [{ scheme: "exact", network: "eip155:8453", asset: USDC, payTo, amount: PRICE_ATOMIC, maxTimeoutSeconds: 300,
      extra: { name: "USD Coin", version: "2" } }],
    terms: { retention: "result kept for this process lifetime only", replay: "same Idempotency-Key + same body returns the same artifact, no second settlement",
      conflict: "same key + different body: 409, key is dead", paidFailure: "if the check cannot run, payment is not settled" } });
  const send = (res, code, obj, headers = {}) => { res.writeHead(code, { "content-type": "application/json", ...headers }); res.end(JSON.stringify(obj)); };
  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/sample") return send(res, 200, await check(SAMPLE));
      if (req.method !== "POST" || req.url !== "/check") return send(res, 404, { error: "not found" });
      let raw = ""; for await (const c of req) raw += c;
      const body = JSON.parse(raw || "{}");
      const d = digest(body), key = req.headers["idempotency-key"];
      if (key && done.has(key)) {
        const prev = done.get(key);
        if (prev.digest !== d) return send(res, 409, { error: "idempotency key reused with a different body; key is dead" });
        return send(res, 200, prev.artifact, { "x-replay": "true" });
      }
      const pay = req.headers["payment-signature"] || req.headers["x-payment"];
      if (!pay) return send(res, 402, quote(d), { "payment-required": Buffer.from(JSON.stringify(quote(d))).toString("base64") });
      if (!facilitator) return send(res, 501, { error: "settlement is not configured on this server; nothing was charged" });
      const payload = JSON.parse(Buffer.from(pay, "base64").toString("utf8"));
      const requirements = quote(d).accepts[0];
      const v = await facilitator.verify(payload, requirements);
      if (!v.isValid) return send(res, 402, { ...quote(d), error: v.invalidReason || "payment invalid" });
      let result;
      try { result = await check(body); } catch (e) { return send(res, 502, { error: "check could not run; nothing was charged", detail: String(e.message) }); }
      const s = await facilitator.settle(payload, requirements);
      if (!s.success) return send(res, 502, { error: "settlement failed; result withheld", detail: s.errorReason });
      const artifact = { requestDigest: d, settlement: { transaction: s.transaction, network: s.network }, result };
      if (key) done.set(key, { digest: d, artifact });
      return send(res, 200, artifact);
    } catch (e) { return send(res, 400, { error: String(e.message) }); }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const payTo = process.env.PAY_TO, baseUrl = process.env.BASE_URL;
  if (!payTo || !baseUrl) { console.error("set PAY_TO (receiving address) and BASE_URL (public https URL)"); process.exit(1); }
  makeServer({ payTo, baseUrl }).listen(Number(process.env.PORT || 8402), () => console.log("listening"));
}
