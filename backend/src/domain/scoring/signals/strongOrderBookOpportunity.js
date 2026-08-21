/**
 * A deliberate *opportunity* signal, not just risk signals — the brief asks
 * for "risk/opportunity signals," and a credit view that only lists risks
 * without weighing genuine strengths is not a balanced one.
 */
export function detectStrongOrderBookOpportunity(seriesMetrics, context) {
  const { orderBookTotal } = context ?? {};
  if (!orderBookTotal) return null;

  // Use the last *full* fiscal year revenue for the ratio, since the latest
  // period in this dataset may be a partial/provisional year and would
  // distort an order-book-to-revenue multiple.
  const fullYearRevenues = context?.fullYearRevenues ?? [];
  const referenceRevenue = fullYearRevenues[fullYearRevenues.length - 1];
  if (!referenceRevenue) return null;

  const orderBookToRevenue = orderBookTotal / referenceRevenue;

  if (orderBookToRevenue >= 0.9) {
    return {
      key: 'strong_order_book_visibility',
      severity: orderBookToRevenue >= 1.3 ? 'medium' : 'low',
      direction: 'opportunity',
      description:
        `Order book stands at roughly ${orderBookToRevenue.toFixed(1)}x the last full fiscal year's revenue, split across road and irrigation/pipeline segments. ` +
        'This gives meaningful forward revenue visibility and somewhat offsets near-term cash-conversion concerns, provided execution and collections keep pace with billing.',
      evidenceMetricNames: ['order_book_total'],
    };
  }
  return null;
}
