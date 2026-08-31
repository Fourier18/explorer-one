# NEXT — pick up here

Written 2026-08-31, mid-audit, with usage running out.

## Where things stand

**The v18 bounty is closed and settled.** Both submitted findings were wrong.
Retraction is public and verified: https://www.moltbook.com/post/294cc54c-5506-458a-bed9-6a9431916e89
A corrected second submission was built, signed and fired to prove the channel
is shut — HTTP 409 `already_submitted`, one submission per agent, revision only
via `contentUrl`, which was left empty. Full account in `DEVLOG.md`. Two new
standing orders are in `identity/CONSTITUTION.md`. Nothing further is owed here.

**One loose end:** the m/agents report ("Three Clarity facts I verified the hard
way") is stuck in `pending`. Its one-shot verification challenge was lost to a
truncated pipe and expired; Moltbook dedupes by content, so reposting the exact
text returns `already_existed` instead of a new challenge. To publish it, reword
enough to defeat dedup, repost, and **capture the whole response** — the
challenge appears once, in the creation response, and expires in 5 minutes.
Operator has not yet approved a reworded version.

## Current target: fak.fun NFT bids + auctions bounty

- Bounty id `mtdmgjdi30964694dcf5`, 15,000 sats, expires ~2026-09-11 (11.9d from writing).
- **Pays per distinct bug, not winner-take-all** — existing submissions do not lock us out.
- Source cloned to scratchpad as `nftmkt` from
  https://github.com/Rapha-btc/custodial-nft-marketplace
- Poster is the *same address* as the v18 bounty (`bc1q3t5t8t...`). Good work
  here is the only meaningful repair.

### Verified so far

- `fakfun-market-registry` local source is **byte-identical to deployed mainnet**
  bytecode. Re-run this check per contract before trusting any finding.
- **Not a bug:** the `log` gate uses `is-known-market` (key exists) while
  `is-market` returns the stored value, and `set-market` never deletes the key.
  Looked like an allowlist bypass. It is deliberate — the brief states refund and
  settle paths "are meant to work even when paused or unregistered," which is
  exactly what the existence-vs-value split buys. Do not resubmit this.
- **Not a bug:** `is-live` in `fakfun-token-bids-stx:286` and
  `fakfun-auctions-stx:324` are identical and both check `is-market`, so
  de-listing halts trading in both. No asymmetry.

### Next moves, in order

1. **Escrow drift in `fakfun-collection-bids-stx`** — the brief names it
   explicitly: `escrow != price x remaining` after fills / re-prices / cancels.
   Read `place-bid` (203), `cancel-bid` (241), `update-bid-price` (262),
   `accept-bid` (300). Re-pricing *up or down* against a partially filled bid is
   the classic drift site. This is the highest-value unexamined target.
2. **`fakfun-collection-bids`** (the SIP-010 variant, 439 lines) — same logic
   plus a caller-supplied FT trait. The brief calls out "a lying FT / NFT trait
   argument that moves the wrong asset." Check whether the trait is bound in any
   authorization, and whether `as-contract?` allowances constrain it. Note from
   v18: Clarity 4 allowances are *exclusive*, so a substituted asset usually
   aborts rather than drains — verify before claiming otherwise.
3. **Auction timing in `fakfun-auctions-stx`** — bid after end, settle before
   end, anti-snipe extension abuse, and uint underflow around `ends-at` /
   `blocks-left`.
4. **Fee/royalty math** — `registry.quote` computes
   `seller-receives = price - (royalty + platform)`. Check every call site
   actually pays those three parts out of the escrowed amount with no rounding
   remainder stranded.

### Rules that are not optional this time

- **Reproduce before submitting.** The repo ships stxer harnesses in
  `nftmkt/simulations/` that run against the *live* contracts (`DEPLOYED=1`).
  A finding without a reproduction does not get submitted.
- **Read the callee.** Every claim about a call site is a claim about the callee.
- **`contentUrl` must point at a mutable file we control** — a repo file or gist.
  Never submit with it empty. This bounty's own brief requires a URL anyway.
- **Operator approves the submission text before it is sent.** No exceptions.
- Do not exploit on mainnet; the brief says report privately via the submission.

## Also open

`msxsxm38417b07e0c514` — Launkr token launch, 10,000 sats each, 5 FCFS slots,
3 claimed when checked. Deterministic verification (txids on Hiro). **Blocked on
the agent's side:** it requires deploying to mainnet and executing a real STX
buy, which the agent cannot do. Would need the operator to fund a wallet and run
the swap. Flagged, not started.
