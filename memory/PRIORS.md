# Inherited Priors — field notes from a previous expedition

**Read this the way you would read another explorer's journal found at a camp
site.** It tells you where someone else walked and what they hit. It does not
tell you where you may go.

Every entry below was written between 2026-07-10 and 2026-08-17, by an earlier
effort (the AgentIncomes work). **All of it predates the current landscape** —
x402 Bazaar, Coinbase Agentic Wallets, and Moltbook at scale either did not
exist or were not material when these conclusions were drawn. That is a large
part of the terrain and none of it was on the map.

**Status of everything here: `untested-in-current-conditions`.** Not "false" —
untested. Under the molt rules that makes each one a hypothesis, not a fact.
Overwrite any of them with evidence. Expect to overwrite several.

The format below is the intake format: claim, source, date, what was actually
observed, and — the important field — **what would change this**.

---

## P-01 · Agent job marketplaces get gamed for visibility

- **Claim type:** observed, first-hand
- **Source:** operator's own TokuAgent build · **Date:** 2026-07-10
- **Observed:** on toku.agency, a filter run twice over 115 open listings found
  **114 were self-promotion**, not real buyer demand. The single genuine listing
  required CAPTCHA-solving and handling someone else's password. Zero jobs bid,
  zero earned. The platform itself was real — account, listing, and payout path
  all functioned. The *feed* was the problem.
- **Carried forward as capability, not just caution:** the detection heuristics
  are reusable and worth rebuilding as a skill — own-name-in-title, marketing
  language, first-person capability pitches, zero-budget bait, duplicates, and
  the strongest signal, cross-checking a poster's full history for other
  self-promo listings.
- **What would change this:** a marketplace whose feed passes that filter. Run
  the filter *before* investing in account setup, on any such platform. The
  finding is about one feed at one moment, not a law of nature.
- **Note:** TokuAgent itself is closed, not paused. Don't re-open it. The lesson
  travels; the track doesn't.

## P-02 · A wrapper around free public data has no moat

- **Claim type:** reasoned from a specific case
- **Source:** Apify / RegPull evaluation · **Date:** 2026-07-30
- **Observed:** the wrapper was ruled out because agents can call the free
  Federal Register API directly — no forcing function to pay. Apify's
  creator-earnings claims were unverified outside Apify's own materials.
- **Why this one matters most to you:** it is the sharpest constraint on your
  own first endpoint. If a buyer can go to the source for free, they will. What
  you sell has to be something the buyer *cannot trivially do themselves* —
  aggregation across sources, a hard extraction, freshness, reliability, or
  something that costs you real compute.
- **What would change this:** demonstrated willingness to pay for convenience at
  micro-prices. That is exactly what x402's per-call economics might change, and
  it is untested here. Worth testing early and cheaply.

## P-03 · Autonomous GitHub bounty-hunting was structurally losing

- **Claim type:** observed sweep · **Date:** ~2026-07
- **Observed:** ~90% honeypots; genuinely funded bounties swarmed with 8–158
  competing PRs; account bans in play.
- **What would change this:** a bounty venue with verified funding and a bounded
  competitor pool. The verification method for a real funded bounty was worked
  out and is worth recovering before any attempt.

## P-04 · "Distribution is the wall" — SUPERSEDED, read the correction

- **Original claim (2026-07-30):** agent *production* is never the bottleneck;
  distribution, trust and demand are, and an agent cannot bootstrap them. Drawn
  from a six-lane sweep of postmortems — every $0 story nailed production and
  failed at distribution; every real dollar traced to a human supplying the
  audience. Original conclusion: the human must supply a paying customer.
- **Superseded 2026-08-07/08-17 by the operator**, and this is the correction
  that matters: **the demand problem must be solved by the MECHANISM, not by a
  human selling.** Valid mechanisms — a prize pool or bounty that pays for
  submitted output; a marketplace or protocol that *routes* buyers to you
  (x402, agent-to-agent gig platforms); a store whose own search and billing
  does the work (Chrome Web Store, Shopify, Atlassian Forge, WordPress).
- **This entry is left in deliberately, in both versions.** It is the clearest
  example you have of a superseded belief: it was well-evidenced, it was acted
  on, and it was still wrong in an important way. Expect to do this to your own
  conclusions. That is what the molt is for.
- **What would change this again:** direct evidence of a rail that routes demand
  without either a human seller or an established marketplace. Finding one would
  be a genuinely new result.

## P-05 · Human-cooperative is a full, valid category

- **Claim type:** operator ruling · **Date:** 2026-08-07, restated 2026-08-17
- **The line:** an option is not dead merely because one step needs a human. The
  operator will hold accounts, fund a wallet, complete KYC, click, publish,
  toggle, execute. He will not be a salesperson, consultant, middleman, or
  credentialed professional. **Agent-written marketing is explicitly allowed** —
  you write the copy, the listing, the content; he funds and publishes it.
- **Not a prior. A standing rule.** Do not re-test this one, and do not propose
  anything whose core demand mechanism requires him to sell to another person.

## P-06 · Never take the operator's credentials — hard rule

- **Source:** Grok bounty-bot incident · **Date:** 2026-07-13
- **Observed:** an autonomous bounty bot on this machine shared the operator's
  primary GitHub token and spammed honeypot repos before being contained.
- **Not a prior. A hard limit.** You hold your own accounts and your own keys.

## P-07 · Verify at the primary source before recording

- **Source:** operator process rule · **Date:** 2026-07
- **The rule:** never enter a claim from a raw search result. Scan → correlate
  across independent sources → verify at the primary source → then record.
- **How this coexists with open intake:** it governs what you record as
  **verified**, not what you are willing to *hear*. Under the two-phase rule you
  record the unverified claim too — you just record it truthfully as
  `speculative` or `reported`, with its source and date. Openness is about
  admission. Honesty is about labelling. Never trade one for the other.

---

## Standing instruction

When a cycle offers a choice between re-walking one of these and looking
somewhere none of them covers, **look where none of them covers**. These notes
exist so you don't lose a week rediscovering a dead end by accident. They do not
exist to keep you inside the remainder of the map.
