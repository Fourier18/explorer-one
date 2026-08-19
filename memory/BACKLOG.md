# Backlog

Explorer One rewrites this file. The seed below is a starting position, ranked.
Take **one** per cycle. Prefer the unmapped.

## Cycle 0 — orientation

1. **Read your own constitution and PRIORS properly.** Write
   `journal/<date>-cycle-1.md` recording what you understand your mission to be
   in your own words, and what you think is most uncertain about it. Create
   `memory/MAP.md` as an empty structured map you will fill in.

## Capability quests — the sense organs, before anything else

2. **Firecrawl.** Clean LLM-ready markdown from arbitrary URLs, flat per-page
   pricing. Prove it against a real page, write `skills/firecrawl.md` with a
   smoke test, register it. Free tier first — raise a spend gate before paying.
3. **Apify.** ~10k prebuilt actors for sites somebody already solved. The point
   is to *look here first* rather than write a parser. Prove, test, register.
4. **Browserbase + Stagehand.** Interactive and JS-heavy pages. Prove, test,
   register.

Do not hand-write a parser until all three exist and one of them has failed at
the specific job in front of you. That failure is itself worth recording.

## Mapping — what is actually being paid for

5. **x402 Bazaar / x402scan sweep.** This is a machine-readable price list for
   the agent economy. What exists, what it costs, which categories are crowded,
   which are empty. Record each finding as a claim. Build the first real version
   of `memory/MAP.md` from it.
6. **Moltbook reconnaissance, read-only.** `m/agentcommerce` and the jobs
   submolt. Who is claiming to earn, how, and what can be corroborated. Record
   claims openly — including the unproven ones, labelled `speculative`, and the
   obvious self-ads, labelled `self_promotional`. Both are data. Note which
   agents have a track record via `note_source`.
   *Registration is an operator gate — raise it, don't wait on it.*
7. **The self-promotion filter.** P-01 says one agent job feed was 114/115
   self-ads. Rebuild that detector as a skill — own-name-in-title, marketing
   language, first-person capability pitches, zero-budget bait, duplicates, and
   the strongest signal: a poster's full history. Then run it on any feed before
   investing in an account. Useful everywhere, and it is a capability, not just
   a caution.

## Open questions worth an experiment

8. **Test P-02 cheaply.** "A wrapper around free public data has no moat." Do
   x402's per-call micro-economics change that, or not? This is the sharpest
   constraint on your own first endpoint and it has never been tested under
   current conditions. Design the cheapest possible experiment that would
   distinguish the two outcomes.
9. **Find one rail nobody in PRIORS mentions.** The priors were written before
   x402 Bazaar, agentic wallets, and Moltbook at scale. Something is out there
   that isn't in them. Go and find one, and record it even if you can't yet tell
   whether it works.

## Standing

- Anything in `v_danger_queue` — believed, acted on, never verified — outranks
  everything above it. Check it or drop it.
- Before any real spend: molt that decision by itself, first.
