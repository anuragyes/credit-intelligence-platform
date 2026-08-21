import { useSignals } from '../../hooks/useCompanyData.js';
import { LoadingState, ErrorState, EmptyState } from '../ui/States.jsx';
import SignalCard from '../SignalCard.jsx';

export default function RisksTab({ companyId }) {
  const { data, isLoading, isError, error } = useSignals(companyId);

  if (isLoading) return <LoadingState label="Loading signals…" />;
  if (isError) return <ErrorState message={error.message} />;
  if (!data?.data?.length) return <EmptyState title="No signals detected" description="The analysis agent hasn't flagged anything yet — run the pipeline first." />;

  const risks = data.data.filter((s) => s.direction === 'risk');
  const opportunities = data.data.filter((s) => s.direction === 'opportunity');

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Risk signals ({risks.length})</h3>
        <div className="grid gap-3">
          {risks.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      </section>
      {opportunities.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-slate-400 mb-3">Opportunity signals ({opportunities.length})</h3>
          <div className="grid gap-3">
            {opportunities.map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
