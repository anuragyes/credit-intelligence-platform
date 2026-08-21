import { useMemo } from 'react';
import { useMetrics } from '../../hooks/useCompanyData.js';
import { LoadingState, ErrorState, EmptyState } from '../ui/States.jsx';
import MetricTrendChart from '../MetricTrendChart.jsx';

const PCT_METRICS = new Set(['ebitda_margin', 'cash_conversion_ratio', 'revenue_growth_yoy', 'ebitda_growth_yoy', 'net_profit_growth_yoy']);

function pivotByMetric(metrics, name) {
  return metrics
    .filter((m) => m.metricName === name)
    .sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd))
    .map((m) => ({ periodLabel: m.periodLabel, value: m.value, formula: m.formula, trend: m.trend }));
}

export default function FinancialHealthTab({ companyId }) {
  const { data, isLoading, isError, error } = useMetrics(companyId);
  const grouped = useMemo(() => {
    if (!data?.data) return {};
    const names = [...new Set(data.data.map((m) => m.metricName))];
    return Object.fromEntries(names.map((n) => [n, pivotByMetric(data.data, n)]));
  }, [data]);

  if (isLoading) return <LoadingState label="Loading financial metrics…" />;
  if (isError) return <ErrorState message={error.message} />;
  if (!data?.data?.length) return <EmptyState title="No financial metrics yet" description="Run the pipeline for this company first." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <MetricTrendChart
          data={grouped.cash_conversion_ratio}
          dataKey="value"
          label="Cash conversion (CFO / EBITDA) — the key 'is profit turning into cash?' check"
          color="#f87171"
          formatValue={(v) => v.toFixed(2)}
        />
        <MetricTrendChart data={grouped.working_capital_days} dataKey="value" label="Working-capital days" color="#fbbf24" formatValue={(v) => `${v.toFixed(0)} days`} />
        <MetricTrendChart data={grouped.debt_to_ebitda} dataKey="value" label="Debt / EBITDA" color="#60a5fa" formatValue={(v) => `${v.toFixed(2)}x`} />
        <MetricTrendChart data={grouped.interest_coverage_ratio} dataKey="value" label="Interest coverage (EBITDA / interest)" color="#4ade80" formatValue={(v) => `${v.toFixed(2)}x`} />
      </div>

      <div className="card overflow-x-auto">
        <p className="text-sm font-medium text-slate-300 mb-3">All derived metrics by period</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-white/10">
              <th className="py-2 pr-4">Metric</th>
              {Object.values(grouped)[0]?.map((p) => (
                <th key={p.periodLabel} className="py-2 pr-4">{p.periodLabel}</th>
              ))}
              <th className="py-2">Formula</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([name, points]) => (
              <tr key={name} className="border-b border-white/5">
                <td className="py-2 pr-4 text-slate-300">{name.replace(/_/g, ' ')}</td>
                {points.map((p) => (
                  <td key={p.periodLabel} className="py-2 pr-4 tabular-nums">
                    {p.value == null ? '—' : PCT_METRICS.has(name) ? `${(p.value * 100).toFixed(1)}%` : p.value.toFixed(2)}
                  </td>
                ))}
                <td className="py-2 text-xs text-slate-500">{points[0]?.formula}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
