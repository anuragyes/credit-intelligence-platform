import { useMemo, useState } from 'react';
import { useDiscrepancies, useResolveDiscrepancy, useAgentRuns } from '../../hooks/useCompanyData.js';
import { LoadingState, ErrorState, EmptyState } from '../ui/States.jsx';

export default function EvidenceTab({ companyId }) {
  const discrepanciesQuery = useDiscrepancies(companyId);
  const agentRunsQuery = useAgentRuns(companyId);
  const resolveMutation = useResolveDiscrepancy(companyId);

  const sources = useMemo(() => {
    const researchRun = agentRunsQuery.data?.data?.find((r) => r.stage === 'research' && r.status === 'succeeded');
    return researchRun?.outputSnapshot?.sources ?? [];
  }, [agentRunsQuery.data]);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Sources used ({sources.length})</h3>
        {agentRunsQuery.isLoading && <LoadingState label="Loading sources…" />}
        <div className="grid gap-2">
          {sources.map((s) => (
            <div key={s.id} className="card flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-slate-500">{s.publisher} · {s.sourceType.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-500 mt-1">{s.trustRationale}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="badge bg-blue-500/15 text-blue-300">{Math.round(s.trustScore * 100)}% trust</span>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">
                    Open source →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Discrepancies</h3>
        {discrepanciesQuery.isLoading && <LoadingState label="Loading discrepancies…" />}
        {discrepanciesQuery.isError && <ErrorState message={discrepanciesQuery.error.message} />}
        {discrepanciesQuery.data?.data?.length === 0 && (
          <EmptyState title="No conflicting data detected" description="All sources agreed within tolerance for this run." />
        )}
        <div className="grid gap-3">
          {discrepanciesQuery.data?.data?.map((d) => (
            <DiscrepancyCard key={d.id} discrepancy={d} onResolve={resolveMutation.mutate} resolving={resolveMutation.isPending} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DiscrepancyCard({ discrepancy: d, onResolve, resolving }) {
  const [chosen, setChosen] = useState(null);
  const isOpen = d.status === 'open';

  return (
    <div className={`card border-l-4 ${isOpen ? 'border-l-conditions' : 'border-l-approve'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{d.metricKey.replace(/_/g, ' ')} — {d.periodLabel}</p>
        <span className={`badge ${isOpen ? 'bg-conditions/15 text-conditions' : 'bg-approve/15 text-approve'}`}>{d.status.replace(/_/g, ' ')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm mb-2">
        <div className={`rounded-lg border p-2 ${chosen === 'A' ? 'border-blue-400' : 'border-white/10'}`}>
          <p className="text-xs text-slate-500">{d.labelA}</p>
          <p className="font-medium tabular-nums">{d.valueA}</p>
        </div>
        <div className={`rounded-lg border p-2 ${chosen === 'B' ? 'border-blue-400' : 'border-white/10'}`}>
          <p className="text-xs text-slate-500">{d.labelB}</p>
          <p className="font-medium tabular-nums">{d.valueB}</p>
        </div>
      </div>
      {d.note && <p className="text-xs text-slate-500 mb-2">{d.note}</p>}
      {isOpen ? (
        <div className="flex items-center gap-2">
          <button onClick={() => setChosen('A')} className="text-xs px-2 py-1 rounded border border-white/10 hover:border-blue-400">Prefer A</button>
          <button onClick={() => setChosen('B')} className="text-xs px-2 py-1 rounded border border-white/10 hover:border-blue-400">Prefer B</button>
          <button
            disabled={!chosen || resolving}
            onClick={() => onResolve({ discrepancyId: d.id, resolvedValue: chosen === 'A' ? d.valueA : d.valueB, resolutionStrategy: 'manual', note: `Analyst chose source ${chosen}` })}
            className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white ml-auto"
          >
            {resolving ? 'Resolving…' : 'Resolve'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Resolved to {d.resolvedValue} ({d.resolutionStrategy})</p>
      )}
    </div>
  );
}
