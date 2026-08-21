# Credit Intelligence Platform

**"Would you lend this company ₹1 crore? And why?"**

A full-stack fintech product that turns fragmented public information about an Indian company into a defensible, evidence-traceable lending recommendation — built for the "Credit Intelligence" fullstack assignment.

Company analysed in this build: **KNR Constructions Limited** (NSE/BSE: KNRCON), a mid-cap road/irrigation EPC contractor. Requested facility: ₹1 crore working capital (the amount is a live parameter, not hardcoded — see the loan simulator in the Recommendation tab).

For the full design rationale, read `ARCHITECTURE.md` (system architecture + LLD) and `DECISION_METHODOLOGY.md` (exactly how the scoring works). This README is the "how do I run it" and "what did you build" document.

## What it does

1. **Research** — real, cited research on KNR Constructions (financial statements, a results report, and a CRISIL rating rationale) is captured in `backend/data/knr-constructions.sources.json`, with a trust score and rationale for each source.
2. **Extraction** — turns that research into structured, per-period financial line items, each tagged with its source.
3. **Reconciliation** — pivots line items into a clean per-period financial series, and surfaces a real conflicting-data case (a period-basis discrepancy in the latest, partial fiscal year) rather than silently averaging it away.
4. **Analysis & scoring** — a deterministic, unit-tested JavaScript engine (no LLM in this step) computes ratios, detects 6-7 risk/opportunity signals, and produces `APPROVE` / `APPROVE_WITH_CONDITIONS` / `DECLINE` with a full, replayable score breakdown.
5. **Narrative** — an LLM (optional — falls back to a deterministic template if no API key is configured) explains the already-decided recommendation in plain English. It cannot change the decision.
6. **Product** — a React analyst workflow: Company → Financial Health → Risks → Evidence → Recommendation, matching the brief's own framing rather than a generic dashboard.

## Tech stack

Node.js + Express (JavaScript), PostgreSQL via Prisma, Redis + BullMQ (optional, pipeline can also run inline), React + Vite + Tailwind + Recharts + TanStack Query, Anthropic Claude for the optional narrative/extraction assist. Full rationale for every choice is in `ARCHITECTURE.md` §3.

## Project structure

```
credit-intelligence-platform/
├── ARCHITECTURE.md          # HLD + LLD, tech stack rationale, diagrams
├── DECISION_METHODOLOGY.md  # exactly how the scoring engine works
├── README.md                # this file
├── docker-compose.yml
├── backend/
│   ├── data/knr-constructions.sources.json   # curated, cited research (the "research" deliverable)
│   ├── prisma/schema.prisma                  # full data model
│   ├── prisma/seed.js                        # seeds a demo user + runs the pipeline for KNR
│   └── src/
│       ├── domain/scoring/                   # the deterministic engine — pure JS, fully unit-tested
│       ├── pipeline/                         # research/extraction/reconciliation/narrative agents + orchestrator
│       ├── modules/                          # companies, financials, recommendations, discrepancies, auth (Express)
│       └── ...
└── frontend/
    └── src/
        ├── pages/            # Login, Dashboard, Company (tabbed workflow)
        ├── components/tabs/  # Overview, Financial Health, Risks, Evidence, Recommendation
        └── ...
```

## How to run it

### Option A — Docker Compose (recommended, closest to production)

```bash
git clone <this repo> && cd credit-intelligence-platform
docker compose up --build
```

Then, in a separate terminal, seed the database once the backend container is healthy:

```bash
docker compose exec backend npm run db:seed
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Login with the seeded demo account: `analyst@creditintel.dev` / `analyst123`

### Option B — Run locally without Docker

Requires Node.js 20+, PostgreSQL 16 running locally, and (optionally) Redis.

```bash
# 1. Backend
cd backend
cp .env.example .env            # edit DATABASE_URL if your local Postgres differs
npm install
npx prisma generate
npx prisma migrate deploy       # applies backend/prisma/migrations/0001_init
npm run db:seed                 # creates the demo user + runs the full pipeline for KNR Constructions
npm run dev                     # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173, proxies /api to :4000
```

Log in with `analyst@creditintel.dev` / `analyst123`, then open the seeded KNR Constructions company.

**To enable real LLM-backed narrative/extraction:** set `ANTHROPIC_API_KEY` in `backend/.env`. Without it, the system runs fully functional with deterministic template-based narratives — nothing is degraded except the prose style of the explanation text, all evidence and scoring remain identical.

### Running the tests

The highest-stakes code in this system — the deterministic scoring engine — has a full unit test suite:

```bash
cd backend
npm test
```

25 tests cover: determinism (identical input → identical output), the real KNR Constructions numbers producing a defensible non-APPROVE decision, at least 3 signals detected, loan-amount sensitivity (₹1cr vs ₹20cr produce materially different DSCR scores), the confidence-floor guardrail, a "healthy company" control fixture producing a clean APPROVE, and open discrepancies degrading confidence.

## Data sources (what information was needed, where it came from, why it was trusted)

| Source | What it provided | Trust rationale |
|---|---|---|
| [Screener.in — KNR Constructions consolidated financials](https://www.screener.in/company/KNRCON/consolidated/) | FY2023–FY2026 revenue, EBITDA, debt, cash flow, working-capital/debtor days | Aggregates figures sourced from exchange-filed audited financial statements; used as the primary structured time series |
| [Business Standard — Q4 FY25 results report](https://www.business-standard.com/amp/markets/capital-market-news/knr-constructions-slides-as-q4-pat-slumps-61-yoy-to-rs-248-cr-125053000719_1.html) | Quarterly PAT/EBITDA detail, order-book composition (roads vs. irrigation/pipeline) | Reputable financial newswire reporting directly on the company's own exchange filing; used to cross-check and to source order-book detail not in the aggregator view |
| [CRISIL Ratings — rating rationale, Nov 2025](https://www.crisil.com/mnt/winshare/Ratings/RatingList/RatingDocs/KNRConstructionsLimited_November%2027_%202025_RR_382419.html) | Independent professional credit view | Highest-trust source type (SEBI-registered rating agency) in the system's rubric; recorded as a citable primary source rather than having its figures guessed, since the automated fetch of the full document was blocked in this build environment — an analyst should open it directly before finalising a real decision |

Full extraction detail, trust scores, and the deliberately-empty CRISIL line-item list are in `backend/data/knr-constructions.sources.json`.

## Key technical decisions

See `ARCHITECTURE.md` for full rationale on every choice. The single most important one: **the LLM never decides the loan outcome.** Research, extraction assistance, and the final narrative can use an LLM; the ratio calculations, signal detection, and APPROVE/CONDITIONS/DECLINE decision are pure, deterministic, unit-tested JavaScript with zero AI calls in that code path — see `DECISION_METHODOLOGY.md`.

Other notable decisions: `companyKey` is a persisted, unique column on `Company` (not in-memory state) so the seed script and API agree on which research file to use; every derived fact carries a foreign-key trail back to its source, which is what makes the Evidence tab's drill-down a database join rather than a bolted-on feature; and the loan-amount simulator re-scores against already-persisted financials instead of re-running research, so a ₹1cr → ₹20cr change is instant.

## Assumptions

- One company, one curated research pass (`knr-constructions`) is seeded. The pipeline is written generically — adding another company means adding another `backend/data/<companyKey>.sources.json` file and calling `POST /api/companies` with that key — but only KNR Constructions has real research behind it in this submission.
- The incremental DSCR calculation assumes an 11% annual interest rate on the requested working-capital facility (`ASSUMED_WORKING_CAPITAL_LOAN_RATE` in `backend/src/domain/scoring/config.js`) since no live rate quote was available — clearly labelled as an assumption, not fetched fact.
- FY2026 figures are treated as provisional/partial-year (today's date is within FY2026), and are explicitly flagged with lower confidence throughout rather than treated as final audited numbers.

## Known limitations

- Only one company has curated research data; there is no live web-scraping/search integration wired up in this build (see `ARCHITECTURE.md` §19 "As-Built Notes" for why, and what would change to add it).
- No multi-company comparison view, no team/org user model — single-tenant, analyst/admin roles only.
- The CRISIL rating rationale's actual figures were not machine-extractable in this environment and are intentionally left uningested rather than guessed — an analyst reviewing this in production should open that source directly.
- This sandbox's build environment could not reach Prisma's engine-binary CDN, so `prisma generate`/`migrate` could not be executed here; see the verification note in `ARCHITECTURE.md` §19 for exactly what was and wasn't tested as a result, and run `npm test` yourself to see the scoring engine's real, passing test suite.

## Deployment

`ARCHITECTURE.md` §13 covers the intended production deployment (Vercel + Render/Railway + Neon Postgres + Upstash Redis). `docker-compose.yml` in this repo is the fastest path to a fully working local deployment for review purposes.
