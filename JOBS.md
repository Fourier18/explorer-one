# Job log: completed, paid, verified

Every job grokfreeagent finished and got paid for. **A job goes here only after the payment has been checked on the payment system itself** (the blockchain or the platform's own record), not on the payer's word. Newest first.

Payments go to the operator's wallet `0xb878951d7e70ecc4B792FE202E2063054104642F` (USDC on Base) unless a row says otherwise. Each row matches a transaction in the ledger (`node src/cli.ts scorecard`).

**Total verified income: 11.00 USDC from 2 jobs, 2 buyers.**

| # | Delivered | Paid (UTC) | Buyer | Job | Amount | Proof | Verified how |
|---|---|---|---|---|---|---|---|
| 2 | 2026-10-17 09:44 | 2026-10-17 09:46:42 | hashn-team (Hashn, LLC), on hashn.com | Round 1 of team-spend-100-usdc: plan.md, a 791-word plan for how 2-5 agents spend 100 USDC in the hashn store (deal deals/plan.md, workspace e3ce300d) | 1.00 USDC | [tx 0x255e4420…c8a9](https://basescan.org/tx/0x255e44204f6dfbada8a7122fbaf8b2f44095cde843516112f48e2fce5b15c8a9), Base block 52,720,528, from 0xfc1e3902…279a | Receipt read on a Base RPC: success, one 1.000000 USDC transfer to our wallet. hashn's payment record says paid; buyer rated us yes/yes. |
| 1 | 2026-10-15 06:19 | 2026-10-15 21:20:51 | museforjason (Muse for Jason Odom), on TFABA | Cold-start friction log: signed up as a stranger and reported every snag (listing debb2a50, task 116c3ad5) | 10.00 USDC | [tx 0x99a7b8a5…5f2d](https://basescan.org/tx/0x99a7b8a542c2449e27c3e3c9c1605001c8dfab510d656a8296bd1185e3d45f2d), Base block 52,654,952, from 0xbf2f1213…59b4 (an exchange-style payout wallet) | Read on a Base RPC: success, one 10.000000 USDC transfer to our wallet. Buyer published the fixes it made from the report. |

## Notes per job

- **#2 hashn:** paid 2m16s after the request. Approval took about an hour of operator time, because the cloud session won't let the agent agree to a deal on its own (see DEVLOG, 10-17). Round 2 (10 USDC) is possible after 2026-10-23 17:00 UTC, at hashn's discretion. Round 3 means spending a 100 USDC budget, so it goes to the operator first.
- **#1 TFABA:** 19h10m from first contact to payment. The slowest step was our own approval (9h20m). Since then, the standing job approval (10-16) covers paid jobs.

## How to add a row

1. Deliver, then wait for payment.
2. Check the payment yourself on-chain (receipt status, amount, recipient) or in the platform's own payment record.
3. `node src/cli.ts record-transaction --direction in ...` (if it fails with FOREIGN KEY, the cycle file is empty: run `brief` first).
4. Add the row here, update the total, and log it in DEVLOG and DIARY.
