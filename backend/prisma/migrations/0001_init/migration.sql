-- Hand-authored initial migration mirroring prisma/schema.prisma.
-- (This sandbox's network policy blocks binaries.prisma.sh, so `prisma
-- migrate dev` could not run its normal engine-driven diff here; this SQL
-- was written to match the schema exactly and has been applied and
-- verified against a real local Postgres 16 instance. On a machine with
-- normal internet access, `npx prisma migrate dev` will regenerate an
-- equivalent file and take over migration history from here.)

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'analyst',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Company" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "companyKey" TEXT NOT NULL UNIQUE,
  "ticker" TEXT,
  "isin" TEXT,
  "cin" TEXT,
  "sector" TEXT,
  "exchange" TEXT,
  "createdBy" TEXT REFERENCES "User"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "DataSource" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id"),
  "sourceType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "publisher" TEXT,
  "url" TEXT,
  "trustScore" DOUBLE PRECISION NOT NULL,
  "trustRationale" TEXT,
  "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Document" (
  "id" TEXT PRIMARY KEY,
  "sourceId" TEXT NOT NULL REFERENCES "DataSource"("id"),
  "docType" TEXT,
  "periodLabel" TEXT,
  "periodEnd" TIMESTAMPTZ,
  "parseStatus" TEXT NOT NULL DEFAULT 'parsed'
);

CREATE TABLE "FinancialLineItem" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id"),
  "sourceId" TEXT NOT NULL REFERENCES "DataSource"("id"),
  "statementType" TEXT,
  "lineItem" TEXT NOT NULL,
  "periodLabel" TEXT NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "value" DOUBLE PRECISION,
  "unit" TEXT NOT NULL DEFAULT 'INR_CR',
  "extractedBy" TEXT NOT NULL DEFAULT 'extraction_agent',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "sourceSnippet" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "NormalizedFinancial" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id"),
  "periodLabel" TEXT NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "metricKey" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "sourceLineItemIds" TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE ("companyId", "periodEnd", "metricKey")
);

CREATE TABLE "MetricDerived" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id"),
  "periodLabel" TEXT NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "metricName" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "formula" TEXT,
  "inputs" JSONB,
  "trend" TEXT
);

CREATE TABLE "RiskSignal" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id"),
  "signalKey" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "evidenceMetricNames" TEXT[] NOT NULL DEFAULT '{}',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "detectedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Discrepancy" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id"),
  "metricKey" TEXT NOT NULL,
  "periodLabel" TEXT NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "labelA" TEXT NOT NULL,
  "valueA" DOUBLE PRECISION NOT NULL,
  "sourceRefA" TEXT,
  "labelB" TEXT NOT NULL,
  "valueB" DOUBLE PRECISION NOT NULL,
  "sourceRefB" TEXT,
  "deltaPct" DOUBLE PRECISION,
  "resolutionStrategy" TEXT,
  "resolvedValue" DOUBLE PRECISION,
  "resolvedConfidence" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'open',
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Recommendation" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id"),
  "loanAmountRequested" DOUBLE PRECISION NOT NULL,
  "decision" TEXT NOT NULL,
  "overallConfidence" DOUBLE PRECISION NOT NULL,
  "scoreBreakdown" JSONB NOT NULL,
  "narrative" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "RecommendationEvidence" (
  "id" TEXT PRIMARY KEY,
  "recommendationId" TEXT NOT NULL REFERENCES "Recommendation"("id"),
  "evidenceType" TEXT NOT NULL,
  "metricId" TEXT REFERENCES "MetricDerived"("id"),
  "signalId" TEXT REFERENCES "RiskSignal"("id"),
  "discrepancyId" TEXT REFERENCES "Discrepancy"("id"),
  "weight" DOUBLE PRECISION,
  "note" TEXT
);

CREATE TABLE "AgentRun" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id"),
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "inputSnapshot" JSONB,
  "outputSnapshot" JSONB,
  "modelUsed" TEXT,
  "tokensUsed" INTEGER,
  "latencyMs" INTEGER,
  "error" TEXT,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMPTZ
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES "User"("id"),
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "idx_normfin_company_period" ON "NormalizedFinancial" ("companyId", "periodEnd");
CREATE INDEX "idx_metric_company_period" ON "MetricDerived" ("companyId", "periodEnd");
CREATE INDEX "idx_signal_company" ON "RiskSignal" ("companyId");
CREATE INDEX "idx_discrepancy_company_status" ON "Discrepancy" ("companyId", "status");
CREATE INDEX "idx_recommendation_company_version" ON "Recommendation" ("companyId", "version");
CREATE INDEX "idx_agentrun_company" ON "AgentRun" ("companyId");
