/**
 * Extraction Agent — turns each source's `extractedLineItems` into a flat,
 * uniformly-shaped list of line items tagged with provenance.
 *
 * Guardrail: a source with no extracted line items (see the CRISIL rating
 * rationale entry in the curated data, which was intentionally left empty
 * because it couldn't be safely fetched) is passed through as-is rather
 * than having values invented for it — "return null rather than estimate."
 */
export function runExtractionAgent({ sources }) {
  const lineItems = [];

  for (const source of sources) {
    for (const item of source.extractedLineItems ?? []) {
      lineItems.push({
        sourceId: source.id,
        sourceTitle: source.title,
        sourceUrl: source.url,
        sourceType: source.sourceType,
        trustScore: source.trustScore,
        metric: item.metric,
        period: item.period,
        periodEnd: item.periodEnd,
        value: item.value,
        unit: item.unit,
        confidenceNote: item.confidenceNote ?? null,
        // A period is treated as provisional/partial if either the source
        // data explicitly flagged it or the period label says so — this
        // keeps the "handle uncertainty" behaviour visible end-to-end.
        isPartialPeriod: /provisional/i.test(item.period),
      });
    }
  }

  return { lineItems };
}
