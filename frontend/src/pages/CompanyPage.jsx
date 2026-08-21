import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompany, useRecommendation, usePipelineStatus, useRefreshCompany, useDeleteCompany } from '../hooks/useCompanyData.js';
import { LoadingState, ErrorState } from '../components/ui/States.jsx';
import OverviewTab from '../components/tabs/OverviewTab.jsx';
import FinancialHealthTab from '../components/tabs/FinancialHealthTab.jsx';
import RisksTab from '../components/tabs/RisksTab.jsx';
import EvidenceTab from '../components/tabs/EvidenceTab.jsx';
import RecommendationTab from '../components/tabs/RecommendationTab.jsx';

const TABS = ['Overview', 'Financial Health', 'Risks', 'Evidence', 'Recommendation'];

export default function CompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const companyQuery = useCompany(id);
  const recommendationQuery = useRecommendation(id);
  const pipelineStatusQuery = usePipelineStatus(id);
  const refresh = useRefreshCompany(id);
  const deleteMutation = useDeleteCompany();

  if (companyQuery.isLoading) return <div className="max-w-5xl mx-auto px-6 py-8"><LoadingState label="Loading company…" /></div>;
  if (companyQuery.isError) return <div className="max-w-5xl mx-auto px-6 py-8"><ErrorState message={companyQuery.error.message} /></div>;

  const { company, openDiscrepancyCount, signalCount } = companyQuery.data;
  const failedStages = pipelineStatusQuery.data?.data?.filter((r) => r.status === 'failed') ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <nav className="flex gap-1 bg-panel border border-white/10 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="flex gap-2">
          <button
            onClick={() => refresh.mutate(undefined)}
            disabled={refresh.isPending}
            className="text-sm px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 disabled:opacity-50"
          >
            {refresh.isPending ? 'Refreshing…' : '↻ Refresh (re-run pipeline)'}
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this company?')) {
                deleteMutation.mutate(id);
                navigate('/');
              }
            }}
            className="text-sm px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>

      {failedStages.length > 0 && (
        <div className="card border-conditions/40 bg-conditions/10 text-sm text-conditions">
          {failedStages.length} pipeline stage(s) failed on the last run — the rest of the pipeline still completed with reduced confidence.
          See the Evidence tab for what data is available.
        </div>
      )}

      {tab === 'Overview' && (
        <OverviewTab company={company} recommendationQuery={recommendationQuery} signalCount={signalCount} openDiscrepancyCount={openDiscrepancyCount} />
      )}
      {tab === 'Financial Health' && <FinancialHealthTab companyId={id} />}
      {tab === 'Risks' && <RisksTab companyId={id} />}
      {tab === 'Evidence' && <EvidenceTab companyId={id} />}
      {tab === 'Recommendation' && <RecommendationTab companyId={id} />}
    </div>
  );
}
