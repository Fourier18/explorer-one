# Blind calibration audit — Sherlock 2025-05 Lend V2

**Purpose:** establish whether this agent can actually find real vulnerabilities,
before asking the operator to spend any effort on bounty-platform accounts.

**Protocol:** audit a *closed* Sherlock contest blind, commit findings, then diff
against the published judged results. No capital, no operator time, and the
score is not negotiable after the fact because this file is committed first.

**Target:** `sherlock-audit/2025-05-lend-audit-contest`, scope =
`CoreRouter.sol` (505), `CrossChainRouter.sol` (822), `LendStorage.sol` (706).
Cross-chain lending built on Compound V2 + LayerZero.

**Discipline:** I have not opened the judging repo, the issues, or any writeup.
Findings below come only from reading the three in-scope files.

---

## F-1 — Collateral check is fully bypassed for a first-time borrower (Critical)

`CoreRouter.borrow()`:

```solidity
(uint256 borrowed, uint256 collateral) =
    lendStorage.getHypotheticalAccountLiquidityCollateral(msg.sender, LToken(_lToken), 0, _amount);

LendStorage.BorrowMarketState memory currentBorrow = lendStorage.getBorrowBalance(msg.sender, _lToken);

uint256 borrowAmount = currentBorrow.borrowIndex != 0
    ? ((borrowed * LTokenInterface(_lToken).borrowIndex()) / currentBorrow.borrowIndex)
    : 0;

require(collateral >= borrowAmount, "Insufficient collateral");
```

For a user who has never borrowed this asset, `currentBorrow.borrowIndex == 0`,
so `borrowAmount` is set to **0** and the requirement degrades to
`require(collateral >= 0)` — always true.

The per-user solvency check is the only thing protecting other users' funds
here, because Compound sees `CoreRouter` as the account, not the end user. The
router holds every user's collateral in aggregate, so Compound's own
`borrowAllowed` passes as long as *the pool* is healthy.

**Impact:** an attacker with zero collateral calls `borrow()` on a market they
have never borrowed, and drains against other users' supplied collateral.
Direct theft of funds.

**Fix:** compare like with like — use the already-interest-adjusted `borrowed`
returned by `getHypotheticalAccountLiquidityCollateral` and require
`collateral >= borrowed`, with no index rescaling and no zero-index branch.

## F-2 — `borrow()` double-applies interest scaling (High)

`getHypotheticalAccountLiquidityCollateral` already returns `borrowed` with
interest applied: its second loop calls `borrowWithInterestSame()`, which does
`amount * currentIndex / storedIndex`. `borrow()` then multiplies that result by
`borrowIndex() / currentBorrow.borrowIndex` a second time.

It also mixes units: `borrowed` is an account-wide USD-denominated sum across
all markets, but it is rescaled by the index ratio of a single market.

**Impact:** the borrow limit is wrong in both directions depending on index
drift — under-collateralised borrows when the ratio deflates, unwarranted
reverts when it inflates. Same root cause as F-1; F-1 is the degenerate case.

## F-3 — `supply()` credits lTokens using a pre-accrual exchange rate (High)

```solidity
uint256 exchangeRateBefore = LTokenInterface(_lToken).exchangeRateStored();
require(LErc20Interface(_lToken).mint(_amount) == 0, "Mint failed");
uint256 mintTokens = (_amount * 1e18) / exchangeRateBefore;
```

`exchangeRateStored()` does not accrue. `mint()` calls `accrueInterest()` first
and mints against the *post*-accrual rate. Since the exchange rate rises
monotonically with accrued interest, the true minted amount is **less** than
`mintTokens`.

**Impact:** every supply credits the user more `totalInvestment` than the router
actually received in lTokens. The gap compounds with time-since-last-accrual and
grows the busier the market. The shortfall is socialised — late redeemers cannot
be made whole. Protocol insolvency.

**Fix:** call `accrueInterest()` first, or read the router's real lToken balance
delta across the mint and credit that.

## F-4 — `redeem()` uses the same stale rate, shortchanging the user (Medium)

```solidity
uint256 exchangeRateBefore = LTokenInterface(_lToken).exchangeRateStored();
uint256 expectedUnderlying = (_amount * exchangeRateBefore) / 1e18;
require(LErc20Interface(_lToken).redeem(_amount) == 0, "Redeem failed");
IERC20(_token).transfer(msg.sender, expectedUnderlying);
```

`redeem()` accrues, so the router actually receives more underlying than
`expectedUnderlying`. The user is paid the stale, smaller figure and the
remainder is stranded in the router with no accounting entry and no sweep.

**Impact:** systematic under-payment of redeemers; unattributed balance
accumulates in `CoreRouter`.

## F-5 — Division by zero bricks liquidation for cross-chain-only borrowers (Medium)

`liquidateBorrowAllowedInternal()`:

```solidity
borrowedAmount = (borrowed * uint256(LTokenInterface(lTokenBorrowed).borrowIndex()))
                 / borrowBalance.borrowIndex;
```

No zero-check on `borrowBalance.borrowIndex`. A borrower whose position in this
market came through the cross-chain path has no same-chain `borrowBalance`
entry, so the divisor is 0 and the call reverts.

**Impact:** such positions cannot be liquidated at all — bad debt accrues with
no remedy. Carries the same unit-mismatch defect as F-2.

## F-6 — Unchecked ERC20 transfers (Low)

`supply()` uses `SafeERC20.safeTransferFrom`, but `redeem()`, `borrow()` and
`borrowForCrossChain()` use raw `IERC20.transfer` and ignore the return value.
Inconsistent with the file's own convention. Contest Q&A limits tokens to
standard ERC20s, which caps severity, but the state updates that follow assume
the transfer succeeded.

---

## Prediction, stamped before checking

I expect **F-1 to be the contest's headline issue** — it is the only one that
is unconditional theft with no precondition beyond "has not borrowed this asset
before." F-3 I expect to be real and reported. F-2 and F-5 I expect to be judged
as duplicates or informational rather than standalone. F-6 is almost certainly
out of scope given the whitelisted-token assumption.

If F-1 is not in the judged findings, that is strong evidence I am pattern-matching
rather than analysing, and this whole channel should be dropped.
