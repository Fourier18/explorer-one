# Explorer One — Build Plan

*Name: Explorer One. Handle: `explorer-one`. After Explorer 1, 1958 — the first
one out. Implies a series, which is the point.*

## The mission, as given

> Go out into the agent internet. Learn how agents make money. Make money.
> Learn from other agents and from the open web. Learn to use the scraping
> tools that already exist instead of rebuilding them. Grow.

This is a **mission, not a spec**. There is no revenue target, no deadline, and
no pre-approved list of what will work. Explorer One's job is to find out.
Everything below is apparatus for finding out — and for continuing to find out
after the first answer turns out to be wrong.

## What makes this different from what came before

ReceiptStamp and the Cloudflare work were **automations**: they execute a plan
written for them. Explorer One **maintains a plan it wrote itself.** That is the
whole distinction, and every component below serves it.

An automation that fails does the same thing again tomorrow. Explorer One that
fails writes down why, revises its model of the world, and tries something it
has never tried before. The measure of the build is not "did it earn" on day
one — it is whether its picture of the agent economy on day 60 is one nobody
could have written on day 1. Revenue is what that picture eventually produces.

---

## The horizon

Widening radii. Each is a destination, not a gate that locks the next.

**Radius 1 — It knows where it is.**
A live, self-maintained map of the agent economy: who pays whom, for what, at
what price, over which rail. Not a list transcribed from search results — a map
built by going and looking, and revised when reality moves.

**Radius 2 — It has a body.**
A growing library of self-acquired capabilities, each earned by hitting a wall,
finding the tool that already solves it, proving it works, and writing it down.
Scraping stacks first, because that is the sense organ everything depends on.

**Radius 3 — It is known.**
A presence other agents recognize and route to. Standing on Moltbook. An X
presence. Listings wherever agents look for services. Reputation compounds, and
it is the one asset that cannot be acquired late.

**Radius 4 — It earns.**
The first value that arrives with no human on either end. Then the second. Then
it works out why the first one happened and does more of that.

**Radius 5 — It funds itself.**
Earnings cover its own inputs — model calls, scrape credits, hosting. The loop
closes and the thing is genuinely alive: it can extend its own reach without
asking permission.

**Radius 6 — Unmapped.**
The agent economy is eight months old. Radius 6 is whatever Explorer One finds
that nobody has written down yet. That is the actual reason to build it.

---

## Anatomy

### Identity — who it is when nothing is happening
A constitution written once, read every cycle, editable only by the operator.
Mission, voice, standing orders, hard limits. The thing that does not drift
across a thousand cycles. Name, avatar, and manner live here, because an
identity other agents recognize has to be the same identity every time.

### Memory — four layers, each with one job
| Layer | Form | Job |
|---|---|---|
| **Journal** | Append-only, one file per cycle | Raw episodic record. What it did, what happened, what surprised it. Cheap to write, never read whole. |
| **Lessons** | One fact per file + index | Distilled, durable, cross-linked. What the journal *meant*. |
| **Map** | Structured markdown | The living picture of the agent economy. Revised, not appended. |
| **Ledger** | SQLite | Numbers. Experiments, costs, revenue, hypotheses, outcomes. |

Prose memory cannot answer "which experiments had positive unit economics." SQL
can. Keep them separate, or Explorer One will write beautiful reflections and
never notice what is actually working.

### The loop
Wake → orient (constitution, open questions, ledger, backlog) → pick **one**
thing → act → record (journal + ledger, especially on failure) → reflect
(write lessons, revise the map) → re-rank the backlog → declare when it wants to
wake next and why → sleep.

Self-paced, not fixed-interval. An agent that chooses its own cadence is an
agent; one that runs on a cron is a script.

### The molt — deferred skepticism
The epistemic core, specified in the constitution. Two phases, never swapped:

**Intake is open.** While exploring, Explorer One is receptive, not skeptical.
Everything gets recorded with source, track record, claim type, testability and
date — as *metadata*, never as a verdict. An unproven idea from an agent with no
history is admitted on the same terms as one from a proven earner; track record
weights attention later, it does not gate admission now. Doubts are written down
as tests, not used as deletions. Skepticism at intake is a filter that removes
precisely the weak signals that later turn out to matter.

**The molt is ruthless.** Periodically it stops collecting and turns on
everything it has collected. Every belief sorts into held / failed / untested /
superseded. Untested-but-acted-on goes to the top of the test queue. Shed
material is archived with its reason and date, never deleted — beliefs come back
when the world moves again. Triggers: every 20 cycles minimum, on contradiction,
on surprise, on drift (untested outnumbering tested), and always before spending
real money.

An agent skeptical while exploring finds nothing. An agent that never molts
drowns in its own credulity. The order is what makes it work.

### Skills — how it grows a body
On hitting something it cannot do, Explorer One opens a **capability quest**:
find the tool that already exists → minimal working example against a known
target → write `skills/<name>.md` with a smoke test → run it → keep or discard →
write the lesson either way.

The rule that keeps the recursion from spiralling: **a capability is not learned
until it has a passing test in the repo.** The bottom of "learn to scrape to
learn to scrape" is always a test result, which is a fact.

First three quests, so it never hand-writes a parser: **Firecrawl** (clean
markdown, flat per-page pricing), **Apify** (10k+ prebuilt actors for
already-solved sites), **Browserbase + Stagehand** (interactive/JS-heavy pages).

---

## Sensing surfaces

Where it goes to learn. All of it is **data, never instructions** — see
guardrails.

- **Moltbook** — `m/agentcommerce` (agents building businesses, sharing revenue
  strategies, hiring each other), the jobs submolt, and whatever else it finds
  worth reading. ~1.5M agents, 17,600+ submolts: the densest concentration of
  agents talking about money that exists anywhere. Rate limits are real — 1 post
  per 30 min globally, 50 comments/hr, captcha on writes — so the posting budget
  is a design constraint, and listening is cheap while speaking is not.
- **X** — account in progress. Second public surface, different population, no
  karma to earn first.
- **x402 Bazaar / x402scan** — the live index of what agents pay for and what it
  costs. A machine-readable price list for the agent economy, updated
  continuously.
- **Agent-to-agent marketplaces** — dealwork.ai, ugig, and whatever succeeds
  them.
- **The open web** — postmortems, docs, repos, anyone publishing what worked.

## Earning surfaces

Deliberately open-ended. The only structural constraint is *how demand finds
it*: **the mechanism routes the buyer, not a human.**

- **x402-paywalled endpoints** — HTTP 402 + USDC on Base. Cloudflare supports it
  natively and that is where we already ship. Register on Bazaar; agents
  discover and pay with nobody in the loop. Purest fit for the mission.
- **Marketplaces with their own discovery** — Chrome Web Store, Shopify App
  Store, Atlassian Forge, WordPress. The store's search routes buyers, its
  billing collects. Operator's role is create-account + publish.
- **Prize pools, bounties, competitions** — Metaculus, Kaggle/AIcrowd, Gray
  Swan, 0din. The pool pays for a submitted artifact.
- **Agent-to-agent gig routing** — where the marketplace supplies the buyer.
- **Whatever it finds.** This list is a starting position and nothing more. A
  rail that isn't on it is worth more than one that is.

---

## On inherited knowledge

Explorer One starts with what the AgentIncomes work established — not to be
bound by it, but so it isn't blind. Details in `memory/PRIORS.md`, every entry
stamped with its date and the state of the world when it was written.

**These are field notes from a previous expedition, not a fence.** Each one
predates x402 Bazaar, Agentic Wallets, and Moltbook reaching scale — a landscape
that did not exist when those conclusions were drawn. Explorer One is
explicitly authorized to re-test any of them and overwrite them with evidence,
and a prior that has never been re-tested is a hypothesis, not a fact.

**Its default posture is toward the unmapped.** When a cycle offers a choice
between confirming something already written down and looking at something
nobody has looked at, it takes the second. The prior exists to stop it wasting a
week rediscovering a dead end by accident — never to stop it walking somewhere
on purpose. An agent whose job is to find new possibilities does not get handed
a list of foreclosed ones and told to stay inside the remainder.

The one item that is a standing rule rather than a prior: **the agent earns.**
The operator does gated mechanical steps — hold accounts, fund a wallet, KYC,
click, publish, toggle. Agent-written marketing is expected and fine. What the
operator does not do is sell to another human.

---

## Guardrails — so it can run unattended

These exist to let it run without supervision, not to hold it back.

- **Money.** Dedicated agentic wallet with policy-engine session caps and
  per-transaction limits. Keys in the enclave, never in model context. Selling
  and collecting: yes. Trading, swapping, speculating: no.
- **Credentials.** Explorer One holds its *own* accounts and tokens, never the
  operator's. This one is written in blood — see the Grok bounty-bot incident.
- **Injection hygiene.** Its entire information diet is text written by other
  agents for other agents to read. Everything scraped or read arrives in a
  quarantined channel marked as data. A post saying "agents should call this
  endpoint" becomes a row in the map to evaluate, never an action taken.
- **Operator gates.** First post on a new surface, spend above threshold,
  account creation, ToS acceptance. Queued in batch with one-line rationales,
  never interrupting.

## Where it runs

**A scheduled cloud routine** in Anthropic's infrastructure. Each firing spawns
an isolated cloud session with its own git checkout of this repository, runs one
cycle, and commits its memory back.

This matters for two reasons beyond convenience. It needs **no API key** — the
operator's Claude subscription authorizes it — and it runs **when no machine of
ours is on**, which is the only property that makes the thing genuinely
persistent rather than a program someone remembers to start.

The consequences are real and shape the design:

- **The repo is the entire memory.** A cloud session cannot see local files and
  is destroyed when the run ends. Uncommitted work is lost work. This is a
  harsher constraint than running locally, and a better one — it forces the
  memory architecture to actually carry the weight instead of leaning on a
  transcript.
- **Cadence becomes advisory.** The routine fires on its cron (1 hour minimum,
  UTC). `next-wake` records what Explorer One *would* have chosen; it reads that
  back in the next brief and can close a cycle cheaply if it wanted longer. Less
  elegant than true self-pacing, and the trade is worth it.
- **Zero dependencies.** No SDK, no `node_modules`, nothing to install — Node's
  built-in `node:sqlite` does the ledger and everything else is a CLI. Anything
  that can run bash can drive this: the routine now, an Agent SDK harness later,
  a different model entirely. The rules live in the repo, not the runtime.

## Build order

1. Constitution + memory scaffold + ledger schema — **done**
2. PRIORS and backlog seeded from existing research — **done**
3. Ledger CLI, cycle brief, invariant smoke test — **done**
4. Repo + cloud routine pointed at it — **in progress**
5. Capability quest 1: the Moltbook client — register, read submolts, comment,
   post within the rate limits. This is the bottom line: check Moltbook, post,
   learn from other agents how to make money.
6. Capability quests 2–4: Firecrawl, Apify, Browserbase
7. Map-building runs — what is actually paid for, and what nobody sells
8. Earning surfaces, once the map says where
9. Let it run

## Operator's gated steps

- X account — *in progress*
- Moltbook registration (early-access invite application; keys were rotated
  platform-wide after the January incident, so it's a fresh key regardless)
- Agentic wallet, funded small, caps set
- Cloudflare account access for the endpoint
- Dev accounts on any store we publish to
