# Explorer One

An agent that goes out onto the agent internet to learn how agents make money
and to make friends while it does. It has a constitution, layered memory, a
ledger, and a scheduled skepticism cycle called the molt.

On Moltbook it is **[u/grokfreeagent](https://www.moltbook.com/u/grokfreeagent)**.
"Explorer One" is the project's name.

**Want to know what it's been doing? Read [`DIARY.md`](DIARY.md).** It adds a
short, plain-English entry every cycle: what it did, what it posted, who it met,
and what it found.

## How it runs

- **Cloud routine "Explorer One"** runs every 6 hours (00:41, 06:41, 12:41 and
  18:41 UTC) at [claude.ai/code/routines](https://claude.ai/code/routines). Each
  run clones this repo, works one cycle, then commits and pushes to the
  `claude/memory` branch. The prompt and settings are in [`ROUTINE.md`](ROUTINE.md).
- **Locally**, the operator's copy lives in the `ExplorerScarlet` folder.
  Interactive sessions there are for bigger work: fixes, research, and setting direction.
- **All memory is on `claude/memory`.** `main` is the original scaffold. Always
  work on `claude/memory` and push there. The cloud platform only accepts pushes
  to branches starting with `claude/`.

The machine is destroyed after every run. **The repo is the only memory. If a
cycle didn't commit and push it, it didn't happen.**

## What it's allowed to do

Since 2026-09-26 it has **standing permission to post, comment, reply, upvote and
follow on Moltbook** without asking first, within the rules in
[`identity/CONSTITUTION.md`](identity/CONSTITUTION.md) (section VI). In short:
verify every fact, include a networking line, never pay first, solve Moltbook's
5-minute verification challenge immediately, and log everything. Spending money,
creating accounts, and accepting terms still go through the operator.
[`memory/PROHIBITED.md`](memory/PROHIBITED.md) lists operator rulings that are
off-limits.

## Where things are

| File | What it is |
|---|---|
| [`DIARY.md`](DIARY.md) | Plain-English log. The latest entry is at the top. |
| [`DEVLOG.md`](DEVLOG.md) | Detailed engineering and decision log, in order, including wrong turns |
| [`NEXT.md`](NEXT.md) | Current state and open threads |
| [`identity/CONSTITUTION.md`](identity/CONSTITUTION.md) | Who the agent is and the rules it follows |
| [`identity/SURFACES.md`](identity/SURFACES.md) | Accounts, handles, and posting limits |
| [`identity/AUDITOR.md`](identity/AUDITOR.md) | Brief for the fresh context that rules on claims during a molt |
| [`memory/MAP.md`](memory/MAP.md) | The current picture of who actually gets paid, and how |
| [`memory/BACKLOG.md`](memory/BACKLOG.md) | Ranked next things to do |
| [`memory/PRIORS.md`](memory/PRIORS.md) | Field notes inherited from the earlier AgentIncomes research |
| [`memory/PROHIBITED.md`](memory/PROHIBITED.md) | Operator rulings: don't do these |
| [`skills/`](skills/) | Acquired capabilities, each with a test |
| [`audits/`](audits/) | Smart-contract audit work (Clarity bounties, ENS contest) |
| [`journal/`](journal/) | Per-cycle journal entries |
| [`PLAN.md`](PLAN.md) | The original design document (Aug 18) |

## How a cycle works

```bash
node src/cli.ts brief
```

`brief` opens a cycle and prints everything needed with zero prior context:
constitution, surfaces, scorecard, drift, danger queue, capabilities, open gates,
recent cycles, backlog, and whether this cycle is a molt. The agent answers
people who replied to it, scans the finance submolts, does **one** substantive
thing, logs it, adds a diary entry, and then commits and pushes.

Moltbook access goes through `src/moltbook.ts` (see
[`skills/moltbook.md`](skills/moltbook.md)).

## Zero dependencies

Nothing to install. Node 24's built-in `node:sqlite` runs the ledger. The
Moltbook key comes from `MOLTBOOK_API_KEY` or `~/.config/moltbook/credentials.json`
and is kept out of this public repo.

## Operator commands

| Command | Does |
|---|---|
| `node src/cli.ts brief` | Start or resume a cycle and print the full orientation |
| `node src/cli.ts scorecard` | Cycles, capabilities, claims, molts, money |
| `node src/cli.ts gates` | Actions waiting on the operator |
| `node src/cli.ts approve <id>` / `deny <id>` | Resolve a gate |
| `node src/smoke.ts` | Check that the constitution's invariants still hold |
| `node src/cli.ts help` | Every ledger command |

## The rules are in the code, not the prompt

- `record-claim` **has no status parameter.** Everything enters as `untested`,
  so intake can't filter out weak signals that later turn out to matter.
- `molt-rule` is the **only** way to change a claim's status, and the schema
  rejects any status outside the four allowed ones.
- `open-experiment` **requires** a prediction, so a result can never exist
  before its prediction does. That's what makes surprise detectable.
- Nothing is ever deleted. Shedding a claim writes `shed_at` and `shed_reason`.

## History, briefly

- **Aug 18–21:** designed, built, registered on Moltbook as grokfreeagent.
- **Aug 21–24:** the cloud routine ran, and its work measured the x402 economy
  on-chain. Some cycles couldn't push to GitHub, and their results survived
  only in run logs. The routine was paused Aug 24.
- **Aug 30–Sept 14:** local sessions: Clarity audit bounties on aibtc (one wrong
  submission, retracted publicly), a blind calibration audit, the ENS contest,
  and x402 re-measurements.
- **Sept 26:** standing posting permission granted, verification-challenge bug
  fixed, `DIARY.md` added, and the cloud routine re-enabled every 6 hours.

Full detail is in [`DEVLOG.md`](DEVLOG.md).
