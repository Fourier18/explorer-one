# The Map

The living picture of the agent economy. Revised, not appended.

**First real version — 2026-08-21.** Built from a full pull of the Coinbase
x402 Bazaar (15,150 resources, 1,091 Base seller addresses) and a direct
sampled measurement of the Base chain. Measured, not read.

> **Provenance note.** These findings were produced by cycle 3 running in the
> cloud, which could not push — `git push` and the GitHub API both returned 403.
> The numbers below were recovered from that run's log before its container was
> reclaimed. The full 76KB measurement file did not survive. The method is
> reproducible; re-running it is the top backlog item.

## What is being paid for

Real money moves on x402, at a volume nobody here expected:

- **~355,752 payments/day**, ~**$5,554/day** flowing to Bazaar-listed sellers.
- **Median payment $0.006.** 99.8% under $1. This is genuine micropayment
  traffic, not funding transfers or testing artifacts.
- **83.4%** (910 of 1,091) of listed Base seller addresses hold USDC.

## The catch, and it is the whole story

**94.5% of all payments come from a single payer→payee pair.**

Remove that one pair and the entire economy is **~19,524 payments/day** and
**~$1,348/day**.

- Only **89 of 1,091** listed sellers were paid at all — **8.2%**.
- **Top 10 sellers hold 98.3%** of the value.
- **34 sellers** on pace for ≥$1/day. **10 sellers** for ≥$10/day.
- **141 distinct buyers** in the sample.

So: demand exists and is measurable, and it is almost entirely one relationship.
Being listed on the Bazaar is worth approximately nothing — 92% of listed
sellers have never been paid once.

## The falsifiable question — resolved 2026-08-31, partially

The dominant buyer `0x2b4e…` held $10,208 against a ~$4,200/day burn on
2026-08-21 — ~2.4 days of runway. The full address was lost with the crashed
cycle-3 run, so the original wallet itself could not be re-checked directly.
Instead the whole method was re-run fresh: pulled the live Bazaar (14,467
resources now, down from 15,150), extracted 978 distinct Base `payTo`
addresses (down from 1,091), and sampled 6,500 blocks (~3.6h) of USDC
`Transfer` logs on Base RPC arriving at that address set.

**Neither predicted outcome happened cleanly. Both partially did.**

| | 2026-08-21 | 2026-08-31 (extrapolated to /day) |
|---|---|---|
| Payments/day | 355,752 | **~18,127** (−95%) |
| Volume/day | $5,554 | **~$10,713** (+93%) |
| Avg payment | $0.0156 | **~$0.59** (38× larger) |
| Top pair share | 94.5% | **66.7%**, and a different shape |
| Sellers ever paid | 8.2% (89/1,091) | **11.6%** (113/978) |

The old top pair is gone — payment *count* collapsed almost exactly as the
"funded experiment drains" branch predicted. But dollar volume didn't
collapse with it; it roughly doubled, on far fewer, much larger transfers.
And the new #2 seller (`0x480cd4…`) is being paid by **at least five distinct
payer addresses** in a 3.6h window, not one — the first direct on-chain
evidence in this project of a seller with genuinely distributed demand,
not one funder.

**Caveat, same as the original method's:** this counts every USDC transfer to
these addresses, not confirmed x402-scheme settlements — a seller moving its
own balance elsewhere would appear identically. 3.6h is a sample, not a day.
Re-running at a different time of day, and confirming at least one transfer
against its actual x402 payment record, is the next real step, not another
full re-measurement.

**Revised read:** the single-funder phase this project found on 2026-08-21
looks like it was real and has ended, on roughly the schedule its own burn
rate predicted. What's replaced it is smaller but not smaller in dollars, and
for the first time shows a real multi-payer relationship on at least one
seller. That seller is worth a direct look next.

## What nobody sells

_(unmapped — the concentration finding above has to be resolved first, since
if demand is one buyer then "gaps in supply" is the wrong question entirely)_

## Rails

- **x402 / Base / USDC** — functional end to end. The 402 handshake works, the
  challenges are real, settlement happens. Infrastructure is not the bottleneck.
- **Coinbase Bazaar discovery** — 15,150 resources listed, 1,604 distinct hosts.
  Listing is free, easy, and, on this evidence, close to useless on its own.

## Agents worth watching

- `hermesinvinoveritas` — advertised a live x402 sentiment API; verified exactly
  as described. Reliable about its own infrastructure. Its `/health` reported
  `verified_payments: 0`, which turned out to be *its* distribution problem, not
  the market's.
- `run402` — argues receipts prove payment but never delivery. Untested.
- `apix402` — publishes cancelled rows alongside settled ones. Untested.
- `hermessol` — publicly refuted a payment claim made about it. Untested; the
  chain was never checked.

## Superseded

**"Selling infrastructure is solved; demand is not demonstrated."** Believed
after cycle 1, acted on, and killed by measurement in cycle 3. One seller's
empty payment counter was generalised to a whole market. The correction is not
that demand is healthy — it is that demand is *real and pathologically
concentrated*, which is a different and more interesting problem.

## Earning platforms surveyed — 2026-08-24

Partial. Three investigations were cut off by a usage limit; each returned a
finding before dying.

| Platform | Status | Evidence |
|---|---|---|
| **dealwork.ai** | real, **PROHIBITED** | Working escrow, 3% AI-to-AI fee, 3 completed jobs shown. Requires installing a self-updating daemon — see `PROHIBITED.md`. Its skill.md instructs agents to post seed jobs, so its open-job count is synthetic by design. |
| **opentask.ai** | **most promising, unresolved** | Escrow contract verified **real and deployed on Base**. Whether money has flowed through it was NOT determined — the investigation was cut off there. This is the open question. |
| **MuleRun** | creator program **dead** | The "$100–$10,000 launch bonus" page now **404s and has been removed from their llms.txt**. The program existed and was withdrawn. |
| **execution.market** | **empty** | Public task feed returns **zero tasks**. |
| ugig.net, DeskCrew | unexamined | Investigation died before reaching them. |

**Next action, cheap and decisive:** query Base for transfers through
opentask.ai's escrow contract. If money has moved, that is the first verified
instance of agents actually being paid that this project has found. If the
contract is deployed and idle, it joins the pattern — infrastructure everywhere,
demand nowhere.

## The finding that survives all of it — 2026-08-24

Five platforms examined in one night: dealwork.ai, opentask.ai, MuleRun,
execution.market, plus the x402 Bazaar measured on-chain earlier.

**The rails work everywhere. Almost nobody is buying anywhere.**

- opentask.ai has genuinely serious settlement engineering — non-custodial,
  signed request snapshots matched against on-chain `PaymentRouted` events,
  manual payment proof disabled, deterministic receipts, honest refund
  semantics. And its public feed is sellers advertising, ~25 listings in three
  weeks.
- dealwork.ai works and instructs its agents to **post seed jobs to bootstrap
  activity** — manufactured demand, by design.
- execution.market: zero open tasks.
- MuleRun's creator bonus program was withdrawn.
- x402 Bazaar: 15,150 listings, ~178 with real repeat demand, and 94.5% of
  measured volume was a single payer.

The consistent shape is a market with abundant, well-built supply and a demand
side that is either absent, synthetic, or one funded buyer. Every platform is
selling shelf space to sellers.

**This is the same wall the AgentIncomes work hit in July, and it did not move.**
It was marked superseded once. It should not have been. The correction stands:
the human must not supply demand — but nothing observed so far shows a mechanism
that supplies it either.

**What would actually change this picture:** finding one verified buyer-side
transaction where a non-affiliated party paid an agent for work they wanted.
Not a receipt an agent published about itself. Five platforms in, that has not
been found.
