# ENS Audit Competition — working file

**Target:** Immunefi `audit-competition-ens` — https://immunefi.com/audit-competition/audit-competition-ens/
**Pool:** $70,000 if a Critical is found · $50,000 High · $30,000 Medium/Low · $3,000 if nothing
**Live until:** 14 September 2026 11:00 UTC
**Repo:** `immunefi-team/audit-comp-ens`, branch **`audit-comp-ready`** (NOT main — main is a stub)
**Payout:** USDC on Ethereum. **KYC required** (operator step, at payout only).
**PoC:** step-by-step PoC required on submission.

## Standing checklist — run EVERY time before writing up a finding

1. [ ] **Is it on the Known Issues list?** (§ below.) Same *root cause* = duplicate,
       even via a different exploitation path or entry point. This is the single
       biggest way to waste effort here.
2. [ ] **Did I read the callee?** A claim about a call site is a claim about
       what it calls. Fetch it. ("I didn't see it" ≠ "it isn't there.")
3. [ ] **Whose funds actually move?** If the answer is "the caller's own," it is
       not an exploit. Name the victim and the amount.
4. [ ] **Is it in scope?** Unmodified third-party deps are OUT. Modifications to
       them are IN. Cloudflare/test suites OUT.
5. [ ] **Do I have a runnable/step-by-step PoC?** Required. No PoC, no submission.
6. [ ] **Did I finish the file?** My measured failure mode is stopping at the
       first interesting thing. One file audited ≠ scope audited.
7. [ ] **Operator sees the text before anything is submitted.** No exceptions.

## Scope (all on branch `audit-comp-ready`)

| Asset | Files | Lines | Internal audit coverage |
|---|---|---|---|
| `packages/smart-account` | 22 | 4,113 | **Heavy** — Round 3 source audit Aug 2026 |
| `packages/transaction-manager` | 43 | 11,176 | **Heavy** — Round 3 source audit Aug 2026 |
| `workers` | 103 | 25,228 | **Light — only 1 known finding (R2-05)** |
| `apps/portal` (Explorer) | 707 | 94,607 | **Light — only 1 known finding (R2-04)** |
| `apps/manager` | 870 | 114,873 | Medium — 8 known findings |

**Strategy follows from that table.** transaction-manager and smart-account are
where the money impacts are, but ENS just ran a source-level audit over both in
August and published 8 findings from it — that ground is picked over. `workers`
and `apps/portal` are in scope, total ~120k lines, and have exactly one known
finding each. Hunt there first, then return to the priority packages looking
specifically for *bypasses of the listed fixes*, which the rules say count as new.

## Prioritized impacts (from the program page)

Primary concern is loss of user funds. Specifically:
- direct users to transfer funds to an address other than the intended one
- cause a user to reveal their private key to a third party
- cause a user to install software enabling theft
- **transaction-construction / smart-account / session-key paths: anything that
  lets a transaction be built, signed, or attributed with the wrong chain,
  sender, target address, or arguments**

## KNOWN ISSUES — all invalid for reward (as of 2026-08-14)

Reports sharing a *root cause* with any of these are duplicates.

### Manager app
- **R2-01** Med — .env files still tracked; provider keys unrotated. (VITE_* are
  public by nature; recovering one is NOT a separate finding.)
- **R2-02** Med — no CSP / security headers. Injection findings that depend only
  on absent CSP are covered; an actual injection sink is separate.
- **SEC-MGR-003** High — API base-URL override sends bearer token to arbitrary host
- **SEC-MGR-008/011** High — debug routes + router devtools ship to production
- **SEC-MGR-010** Low — avatar-upload EIP-712 domain omits chainId/verifyingContract
- **EXP-INPUT-003** Med — persisted store state parsed without validating value shapes
- **EXP-INPUT-008** Low — avatar uploads retain EXIF/GPS
- **EXP-INPUT-009** Low — push notification opens backend-supplied URL unvalidated
- **EXP-INPUT-005** Med — name validators accept homoglyphs/bidi/control chars

### Transaction manager / smart account
- **EXP-4337-002** High — transports don't validate chainId; silent Sepolia fallback
- **EXP-4337-003** High — `request.from` not checked against connected signer
- **SEC-TXM-002** High — cached smart-account address not cross-checked vs live SDK
- **R2-03** Med — session key = unscoped full account owner for 7 days (accepted
  design residual; "broadly scoped" or "exfiltratable from storage" = duplicate.
  **Authority beyond the stated lifetime or beyond the account's own permissions
  WOULD be new.**)
- **R2-06** Low — session revocation is local-only, no on-chain revoke
- **R3-01** High(avail) — telemetry trimming loop cannot terminate, freezes tab
- **R3-02** High(avail) — awaiting a stopped actor never settles (3 findings share
  this root cause; any individual site = duplicate of R3-02)
- **R3-03** High(avail) — registration machine strands when polled actor stopped
- **R3-04** High(avail) — commitment retry resumes at wrong step, loops on error
- **R3-05** High — clearing active transactions also deletes archived history
- **R3-06** High — archived transactions drop chainId, history discards them
- **R3-07** Med — reused transaction id skips archiving/history/telemetry
- **R3-08** Med — stale error attached to a transaction that later succeeded

### Cross-app / Explorer / workers
- **EXP-GAP-006** Med — telemetry forwards full transaction context to third party
- **R2-04** Low — OG-image worker fetches attacker-controlled avatar URL (SSRF)
- **R2-05** Low — SendGrid event webhook fails open when verification key unset

**Explicitly still in scope per the rules:**
- issues they fixed incorrectly or incompletely — **a bypass of a shipped fix is new**
- new consequences of a listed root cause that *materially change its severity*
- everything in areas these audits did not cover

## Findings log

_(none yet — entries go here with PoC before any submission)_

## Session 1 — areas cleared (no finding)

- **`workers/api-worker` auth + IDOR** — JWT HS256, valibot-validated payload.
  All four `channels/:id` handlers scope by `user_id`. Email verification token
  is 128-bit random, purpose-scoped, expiry-checked, deleted on use. Clean.
- **`smart-account/session-storage.ts`** — expiry checked on every read path
  (`getValidSession`, `getValidSessionForAccount` pins account+owner+chain).
  `validUntil` is bound into the session salt, so it cannot be swapped without
  changing the permissionId. No path grants authority past the stated lifetime.
- **`session.actors.ts`** — `config.validUntil` is caller-overridable with no
  upper bound, BUT the single caller never passes `config`, so it is not
  attacker-reachable. Default is 24h (not the 7 days in R2-03 — this is the new
  scoped-session model, not the ephemeral-owner one).
- **`registration-calls.ts`** — `buildRevealBatch` silently drops caller-supplied
  `type: 'addr'` records (filter keeps only `'text'`), which would set a name's
  addr to the wallet rather than the user's chosen target. **Dead code** — the
  function is exported and unit-tested but has zero callers in either app, so
  there is no user-facing impact. Not submittable.

### Open, unverified
`budget.ts::primaryNameStorageWords` returns `1 + ceil(bytes/32)`, which gives 3
words at exactly 64 bytes, while the file's own measurement table puts 64–95
bytes at 4 SSTOREs. If the table is right, the register leg is under-gassed by
~25k for names at exact 32-byte multiples, and an under-gassed reveal strands a
commit the user already paid for. Cannot confirm without a Sepolia fork — their
number is a measurement, not a derivation. **Do not submit without reproducing.**
