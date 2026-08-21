# Decision Methodology

This is the short, explicit explanation the assignment brief asks for under "Decision Methodology": which signals/metrics were chosen, how they're calculated, how they influence the decision, and how conflicting data is handled. Everything here is implemented in `backend/src/domain/scoring/` and is pure, deterministic, unit-tested JavaScript — no LLM call happens anywhere in this document's code path.

## Company & loan context

**Company:** KNR Constructions Limited (NSE/BSE: KNRCON) — a mid-cap road and irrigation/pipeline EPC contractor.
**Requested facility:** ₹1 crore working-capital loan (parameterized — the system re-scores instantly for any amount via the loan simulator).
**Why this company:** see the chat history / cover note — in short, it's a real company with genuine, non-trivial credit tension (strong reported profit growth alongside deteriorating operating cash flow and ballooning working-capital days across FY23–FY26) and active public CRISIL rating coverage to sanity-check this system's output against.

## Metrics computed (`backend/src/domain/scoring/metrics.js`)

| Metric | Formula | What it's for |
|---|---|---|
| EBITDA margin | `ebitda / revenue` | Core operating profitability |
| Interest coverage ratio | `ebitda / interest_expense` | Existing debt-service comfort |
| Debt / EBITDA | `total_debt / ebitda` | Overall leverage relative to earnings capacity |
| Debt / Equity | `total_debt / (equity_capital + reserves)` | Balance-sheet leverage |
| Cash conversion ratio | `cash_from_ops / ebitda` | Is profit actually turning into cash? The single most important ratio for this company's story |
| Incremental DSCR | `ebitda / (interest_expense + loan_amount × assumed_rate)` | Debt-service coverage **for the specific facility being requested** — this is the one ratio that changes when the loan amount changes |
| Revenue / EBITDA / net-profit YoY growth | `(current - previous) / previous` | Growth trajectory and earnings-quality checks |
| Working-capital days, debtor days | as reported | Working-capital intensity trend |

All thresholds (what counts as "healthy" vs "watch" for each ratio) live in one file, `backend/src/domain/scoring/config.js`, so they're auditable and tunable in one place rather than scattered through the codebase.

## Signals detected (`backend/src/domain/scoring/signals/`)

Each signal is an independent, pure function of the financial time series — adding a new one means adding one file, not touching the engine. Seven are implemented; on KNR's real data, six fire:

1. **Profit/cash divergence** (risk, high) — net profit grew in the latest full fiscal year, but operating cash flow was negative in most of the observed periods. This is the textbook signal named directly in the assignment brief.
2. **Rising working-capital requirement** (risk, high) — working-capital days rose from 77 to 345 across the observed periods.
3. **Rising receivable days** (risk, high) — debtor days rose from 56 to 109.
4. **Rising leverage** (risk, medium) — Debt/EBITDA trended up as debt nearly quadrupled (₹652cr → ₹2,444cr) over the period.
5. **Weakening interest coverage** (risk, medium) — interest coverage trended down as interest expense rose faster than EBITDA in the most recent periods.
6. **Earnings-quality concern** (risk, medium, conditional) — fires when net-profit growth materially outpaces EBITDA growth or other income is a large share of pre-tax profit, flagging that some reported profit improvement may be non-operating.
7. **Strong order-book visibility** (**opportunity**, low–medium) — the ₹5,051.8cr order book is worth roughly 1x+ the last full year's revenue, which is a genuine, real offsetting strength and is scored as such — not every signal is a red flag.

## How signals and metrics combine into a decision (`decisionEngine.js`)

1. **Leverage sub-score** (30% weight) — averages the Debt/EBITDA and Debt/Equity bands.
2. **Liquidity & cash sub-score** (30% weight) — from the cash-conversion-ratio band. This is deliberately the highest-weighted single ratio for this company, because cash conversion is the crux of its story.
3. **DSCR sub-score** (25% weight) — from the incremental-DSCR band, computed against the *specific requested loan amount*.
4. **Signals sub-score** (15% weight) — starts at a neutral 60/100, then risk signals subtract points (weighted by severity) and opportunity signals add back a smaller amount (weighted 0.6x, since a strong order book shouldn't be treated as fully cancelling a cash-conversion problem).

The four sub-scores combine into a 0–100 composite score, which maps to a decision:

- **≥ 70 → APPROVE**
- **45–69 → APPROVE WITH CONDITIONS**
- **< 45 → DECLINE**

**Confidence floor guardrail:** even if the composite score alone would qualify for a clean APPROVE, the engine will not return APPROVE if the overall confidence (see below) is below 0.55 — it downgrades to APPROVE WITH CONDITIONS instead, with an explicit note in `scoreBreakdown.overrideNotes`. This is the code-level implementation of "do not pretend uncertain information is certain."

**On the real KNR data at ₹1cr requested:** the engine returns **APPROVE WITH CONDITIONS**, composite score ~58/100, confidence ~40%. Leverage and DSCR sub-scores are actually comfortable for a facility this size (₹1cr is small relative to KNR's balance sheet), but the cash-conversion and working-capital signals pull the composite down, and the low confidence in the latest (partial/provisional) period keeps the guardrail engaged. Re-running the same data at a ₹20cr request materially lowers the DSCR sub-score, since incremental interest burden scales with the loan amount while EBITDA does not — this is verified directly in the unit test suite (`decisionEngine.test.js`, "loan amount sensitivity").

## Handling conflicting/uncertain data

- Every period carries a `confidence` score, derived from the trust score of the source(s) it was extracted from. KNR's FY2026 figures are marked as **provisional/partial-year** and given a lower confidence — see `isPartialPeriod` in the data model.
- The profit-growth check for the profit/cash-divergence signal deliberately compares the **latest full fiscal year** rather than the raw latest (possibly partial) period, specifically to avoid a period-basis mismatch producing a misleading "profit fell" reading.
- A real discrepancy is modeled for FY2026 working-capital days: the as-reported figure (345 days, computed against a partial-year, un-annualised revenue base) versus a trend-extrapolated estimate (231 days, linear continuation of the FY23–FY25 trend). This is surfaced as an open `Discrepancy` row in the Evidence tab rather than silently resolved — an analyst can review both values and choose one, which is audit-logged.
- Every open discrepancy reduces `overallConfidence` by a fixed penalty (`DATA_QUALITY.perOpenDiscrepancyPenalty` in config.js), capped at a maximum total penalty so one unresolved item can't single-handedly zero out confidence.
- One source (the CRISIL rating rationale) intentionally contributes **zero** extracted line items, because it could not be safely machine-fetched in this build — the system does not guess its figures, it cites the URL and leaves it for an analyst to open directly.

## What would change under the live-round scenarios

See ARCHITECTURE.md §15 for the full mapping — in short: a new filing triggers `/refresh` (new pipeline run, new recommendation version); a new cross-source disagreement becomes another `Discrepancy` row automatically; a data-provider outage degrades confidence rather than crashing (see the resilience notes in ARCHITECTURE.md §8.3); and a changed loan amount (₹1cr → ₹20cr) is a single call to `/recommendation/simulate`, which re-scores instantly against the already-persisted financials without re-running research.
