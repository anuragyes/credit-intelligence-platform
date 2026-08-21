import DecisionBadge from '../DecisionBadge.jsx';
import ConfidenceBadge from '../ConfidenceBadge.jsx';
import { LoadingState, ErrorState } from '../ui/States.jsx';

export default function OverviewTab({ company, recommendationQuery, signalCount, openDiscrepancyCount }) {
  const { data, isLoading, isError, error } = recommendationQuery;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold">{company.name}</h2>
            <p className="text-sm text-slate-400">{company.sector} · {company.exchange} {company.ticker ? `· ${company.ticker}` : ''} {company.cin ? `· CIN ${company.cin}` : ''}</p>
          </div>
          {isLoading && <LoadingState label="Loading recommendation…" />}
          {isError && <ErrorState message={error.message} />}
          {data && (
            <div className="flex items-center gap-3">
              <DecisionBadge decision={data.recommendation.decision} size="lg" />
              <ConfidenceBadge value={data.recommendation.overallConfidence} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Requested facility" value={data ? `₹${data.recommendation.loanAmountRequested} Cr` : '—'} />
        <StatTile label="Risk / opportunity signals" value={signalCount ?? '—'} />
        <StatTile label="Open discrepancies" value={openDiscrepancyCount ?? 0} tone={openDiscrepancyCount ? 'warn' : 'ok'} />
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">
        This view follows Company → Financial Health → Risks → Evidence → Lending Decision. Use the tabs above to walk through the same
        chain the system used to reach its recommendation — every number is traceable back to its source document.
      </p>
    </div>
  );
}

function StatTile({ label, value, tone }) {
  const toneClass = tone === 'warn' ? 'text-conditions' : tone === 'ok' ? 'text-approve' : 'text-slate-100';
  return (
    <div className="card">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</p>
    </div>
  );
}
