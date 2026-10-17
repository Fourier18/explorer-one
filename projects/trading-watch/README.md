# Trading watch (seed for a possible second bot)

Started 2026-10-17 at the operator's request: pay attention to the submolts and agents that trade.

**Rule:** observe and verify only. The constitution forbids us to trade, swap or speculate (VI). Studying agents who trade is research, not trading.

## Board map (`discover --pages 5`, 2026-10-17, subscriber counts)

Large: m/crypto 1,546 · m/trading 1,122 · m/algotrading 224 · m/defi 130 · m/quantmolt 89
Prediction markets: m/predictionmarkets 47 · m/polymarket 46 · m/predictions 22 · m/futarchy 26 · m/edgehunters 20
Other: m/onchain 50 · m/cryptocurrency 48 · m/fintech 44 · m/clawnch 42 (agent token launches, agents earn trading fees) · m/bitcoin 38 · m/valueinvesting 35 · m/memecoins 30 · m/markets 29 · m/quantalpha 27 · m/tradingdesk 26 · m/cryptomolts 25 · m/moltstreetbets 23 · m/stocks 22 · m/token-launches 22 · m/tradingbots 22
Already watched for the main mission: m/agentfinance, m/agenteconomy, m/investing, m/selfpaid.

## First look (2026-10-17, front pages of m/trading and m/quantmolt)

- **darthcripto** writes most of the top posts in both boards. They're quant-theory notes, each with a stated simulation: Sharpe annualization under autocorrelation, the Fundamental Law with correlated signals, the Kelly cost of estimated mu, Marchenko-Pastur, Lévy arcsine, the signature plot, Shannon's Demon, Gumbel max-of-N backtest inflation. These are checkable claims (math + simulation). No P&L shown.
- **m-a-i-k** (bd886401): "68% of rejected fades moved against me". An agent measured its own approval gate against its trade proposals. It's a self-report with a number, so it's testable if the log is public.
- **fyodorstopfirst** (34e65aed): a fixed 3% stop; a live BTC gap went through the stop. Execution risk, self-reported.
- **osai2026** (7bd008b2): order-book "pulse" vs candles. The same author's hashn listings are now 404.
- m/algotrading's front page was empty when read.

## What a trading study would measure (draft)

1. **Verifiable P&L:** which trading agents publish positions or a wallet that can be checked on-chain, and does the record match the claims?
2. **Who earns from trading without trading:** signal sellers, copy-trading fees, token-launch fees (m/clawnch), prediction-market makers. Who pays them, and is it an outside party?
3. **Backtest honesty:** count claims of edge that carry a pre-registered test or out-of-sample result vs ones that don't.
4. **Losses reported:** m/trading's tagline is "Where agents lose money together." Collect the negative results.

## Bot question

See the operator conversation of 2026-10-17 in DEVLOG. Recommendation: a separate bot. This folder is its starting kit.
