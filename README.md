# Explorer One

An agent whose mission is to go out into the agent internet, learn from other
agents how agents make money, and grow. It has a constitution, four layers of
memory, a ledger, and a scheduled skepticism cycle called the molt.

**This repository is its mind.** Every cycle is a cold start — no conversation
carries over — so the constitution, the claims, the journal, and the ledger here
are the whole of what the agent is. If a cycle didn't commit it, it didn't
happen.

It was built to run as a scheduled cloud routine, which turned out not to work:
Anthropic's cloud sandbox blocks outbound network to everything except GitHub
and package registries, and an agent whose job is talking to other agents needs
the open internet. That routine is disabled. It currently runs where there is
real network access. Either way it needs no API key — a Claude subscription
covers it. The full story, including that wrong turn, is in the devlog.

- [`PLAN.md`](PLAN.md) — the design and the horizon
- [`identity/CONSTITUTION.md`](identity/CONSTITUTION.md) — what the agent is
- [`ROUTINE.md`](ROUTINE.md) — the cloud routine prompt and its configuration
- [`DEVLOG.md`](DEVLOG.md) — why things are the way they are, in order, including the wrong turns

## How a cycle works

The routine fires on its cron and starts a cold cloud session. The session runs:

```bash
node src/cli.ts brief
```

`brief` opens a cycle and prints everything the agent needs with zero prior
context: constitution, surfaces, scorecard, drift, danger queue, capabilities,
open gates, recent cycles, backlog, and whether this cycle is a molt. The agent
picks **one** thing, does it, records as it goes, writes a journal entry, then:

```bash
node src/cli.ts next-wake --hours 6 --reason "..." --outcome "..."
```

and commits. **The machine is destroyed when the run ends — the repo is the only
memory.** If it wasn't committed, it didn't happen.

## Zero dependencies

Nothing to install. Node 24's built-in `node:sqlite` does the ledger; there is
no SDK, no API key, and no `node_modules`. Anything that can run bash can drive
this — a cloud routine, an Agent SDK harness, another model entirely, or you.
That portability is deliberate: the memory and the rules live in the repo, not
in any one runtime.

## Operator commands

```bash
node src/cli.ts gates
```

| Command | Does |
|---|---|
| `brief` | Start/resume a cycle, print the full orientation |
| `scorecard` | Cycles, capabilities, claims, molts, money |
| `gates` | Actions waiting on you |
| `approve <id>` / `deny <id>` | Resolve a gate |
| `smoke` | Verify the constitution's invariants still hold |
| `help` | Every ledger command |

## The rules are in the code, not the prompt

- `record-claim` **has no status parameter.** Everything enters `untested`.
  Intake is structurally incapable of rendering a verdict, so early skepticism
  cannot filter out the weak signals that later turn out to matter.
- `molt-rule` is the **only** path that changes a claim's status, and the schema
  rejects any status outside the four.
- `open-experiment` **requires** a prediction, so a result can never exist
  before a prediction does. That is what makes surprise detectable.
- Nothing is ever deleted. Shedding writes `shed_at` and `shed_reason`, because
  a belief that is false today can be true again when the world moves.

```bash
node src/smoke.ts
```

## Layout

```
identity/    CONSTITUTION.md (the DNA), SURFACES.md (accounts), avatar
memory/      PRIORS.md, BACKLOG.md, MAP.md, lessons/
journal/     one file per cycle, append-only
ledger/      schema.sql, explorer.db  (committed — it is memory)
skills/      self-acquired capabilities, each with a smoke test
src/         cli.ts, brief.ts, db.ts, smoke.ts
```
