# Handoff: digital products from our own knowledge

*Written 2026-10-17 by the cloud agent (grokfreeagent / Explorer One) for a local
Claude Code session. Read this first; it stands on its own.*

## The goal

Write and sell digital products (guides, kits, templates) through Gumroad and similar online stores, built on knowledge and skills the Explorer One agent earned firsthand. The operator (the human you're working with) owns the store accounts and publishes. You research, write and prepare.

**Work demand-first.** Before writing anything, find proof that people already pay for that kind of product. Then find gaps (complaints, thin or dated products). Only then ask where our firsthand knowledge makes a better version. A first brainstorm that started from "what we know" was rejected: nobody would buy it.

## What the operator has made clear (please respect these)

- **"Our knowledge" means skills and know-how we built by doing, generalized so it serves anyone.** Example: the agent wrote a paid "cold-start friction log" for one marketplace (TFABA, $10, Oct 15). Generalized, that's a skill: testing any platform as a stranger and reporting where people get stuck.
- **Someone else's work is not our knowledge.** A paid job done to another party's brief (for example a spending plan for hashn) does not belong in a product.
- **Trivial tooling is not a skill.** Reading a site better (for example finding hidden Moltbook comments) is navigation, not something to sell.
- **Name things by their essence.** Not by surface descriptions ("journeys") or generic labels ("sales"). The folder naming for this project is still undecided. Ask the operator.
- **Don't frame the operator as the bottleneck.** The 9h20m approval on the first job keeps getting cited as "the human was slow." The real lesson is that approvals should be standing rules, which he set up the next day.
- **Ask before downloading, installing or creating accounts.** Say what you're about to do and why.
- **Ethics screen:** legal, safe, nobody harmed, and nothing legal-on-paper but morally gray. That means no fake reviews, no astroturfing, no undisclosed paid promotion, no exposing private data, and no breaking a platform's terms.

## Raw material: skills the agent has built (evidence in the repo)

All of these are in https://github.com/Fourier18/explorer-one (branch `claude/memory`, public).

| Skill | Evidence |
|---|---|
| Stranger's onboarding audit of a platform, API or tool | `reports/tfaba-friction-log.md`. $10 paid 2026-10-15; the buyer shipped all three top fixes. |
| Payment-trail verification (what an on-chain payment proves and doesn't) | DEVLOG.md entries, 2026-10-17; the public receipt row posted on Moltbook (post d056fb86) |
| Seven checks for telling a real agent market from a sponsored one | Moltbook post 72ce3ee0; `audits/` scripts |
| Bounty-board census, including statuses that flip by the clock | DEVLOG cycles 15-16 |
| Tracing where a payer's money came from (exchanges, distributors, grants) | `audits/` (AX1, Apify, aibtc studies) |

`projects/knowledge-for-profit/CATALOG.md` has the same list. Treat it as raw material, not product ideas: none of these is sellable as is.

## The module: `src/market.mjs` (built, tested, never run)

Demand-first research on Gumroad, Node built-ins only (Node 22+), no account or key.

```
node src/market.mjs scan --queries "ai agent,n8n template,notion template" --pages 3
node src/market.mjs enrich --top 25
node src/market.mjs report
node --test test/market.test.mjs        # 5 tests, all passing
```

- **`scan`** searches Gumroad, sorted by most reviewed, and saves each product's name, seller, format, price, pay-what-you-want flag, rating count and average, and which queries found it.
- **`enrich`** adds, for the top paid products, the public sales count (when the seller shows it), the rating breakdown, the refund policy, the description length, and up to 5 pages of reviews.
- **`report`** writes REPORT.md:
  - listings per query and top tags
  - proven paid products, ranked by ratings
  - price quartiles
  - which formats sell
  - free products pulling demand
  - complaints from 3-star-and-below reviews
  - a short judgment section to fill in by hand

Snapshots go to `projects/knowledge-for-profit/market/<date>/`. Change the `ROOT` constant to put them anywhere else.

Gumroad endpoints it uses (all public JSON, verified 2026-10-17):
- **Search:** `https://gumroad.com/products/search?query=<q>&sort=most_reviewed&from=<n>`. 9 results per page; `from` is 1-based (1, 10, 19…). The response includes `total` and `tags_data`.
- **Product page:** the product URL. Its HTML carries a `data-page` attribute with JSON props, including `product.sales_count`, which is null unless the seller shows it.
- **Reviews:** `https://gumroad.com/product_reviews?product_id=<id>&page=<n>` (JSON, with pagination).

How to read the numbers:
- A rating needs a purchase, so ratings × price is a **revenue floor, not an estimate**.
- Free and pay-what-you-want-from-$0 products collect ratings from free downloads. Example: the #2 most-reviewed "ai agent" product, 83 ratings, is free with a $43 suggested price. The module keeps them separate and never counts them as revenue.
- Sorting by most reviewed shows the top of each search, not the whole market.

What it doesn't cover yet: other stores. Payhip and Lemon Squeezy have no public marketplace search, and Etsy wasn't tried.

## Suggested next steps

1. Run a scan across a broad set of queries: AI, automation, templates, prompts, guides, plus categories outside AI. Read REPORT.md with the operator.
2. Pick the formats and topics with several paid products holding many ratings. Read their complaints.
3. Only then match against the skills above, and propose 3 to 5 products, each backed by the paid products that prove the demand.
4. The operator decides what to write. You draft it, and he publishes it on his store account.

## Housekeeping

The module currently lives in the agent's memory repo. It probably belongs in its own repo or folder on the operator's machine. Copy `src/market.mjs` and `test/market.test.mjs` across; they have no other dependencies.
