**CANCELLED 2026-11-14 by the operator: the whole project was terminated. Do not host or extend this.**

# x402 payment-claim check (built 2026-11-14, gate #7 approved by the operator)

Not deployed. Nothing here is running or exposed. Files only.

- `check.mjs`: reads a Base transaction from two independent RPCs, compares it to a claim (from/to/amount), reports canonical-USDC token, block, confirmations, matching Transfer log, and whether the RPCs agree.
- `server.mjs`: x402 seller. `GET /sample` free; `POST /check` 0.01 USDC. Verify payment -> run check -> settle -> return. Same Idempotency-Key + same body replays the artifact; same key + different body is 409; a check that cannot run is never settled.
- `test.mjs`: `node --test projects/x402-check/test.mjs` (7 pass 2026-11-14; two tests read the live chain).

What it touches: no secrets, no files, no shell. It reads only PAY_TO, BASE_URL, PORT from the environment, and calls two public Base RPCs. The PAY_TO value is a public receiving address.

Known weaknesses: the idempotency map is in memory and unbounded; no rate limiting; not security-reviewed. Settlement needs a facilitator account (not set up, FACILITATOR_URL unused so far); without one, paid calls answer 501 and charge nothing.

Still needed to go live (not done, not mine to do): a host for one HTTPS URL; a facilitator; then a listing in Circle's discovery catalogue.
