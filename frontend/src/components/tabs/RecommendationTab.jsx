import { useState } from 'react';
import { useRecommendation, useSimulateRecommendation, useRecommendationVersions } from '../../hooks/useCompanyData.js';
import { LoadingState, ErrorState } from '../ui/States.jsx';
import DecisionBadge from '../DecisionBadge.jsx';
import ConfidenceBadge from '../ConfidenceBadge.jsx';

export default function RecommendationTab({ companyId }) {
  const { data, isLoading, isError, error } = useRecommendation(companyId);
  const versionsQuery = useRecommendationVersions(companyId);
  const simulate = useSimulateRecommendation(companyId);
  const [loanAmount, setLoanAmount] = useState(20);

  if (isLoading) return <LoadingState label="Loading recommendation…" />;
  if (isError) return <ErrorState message={error.message} />;

  const { recommendation, evidence } = data;
  const breakdown = recommendation.scoreBreakdown;

  const isApprove = recommendation.decision === 'APPROVE';
  const isDecline = recommendation.decision === 'DECLINE';

  const bannerColor = isApprove ? 'from-green-900/30 to-slate-900/40 border-green-500/30 shadow-green-900/20' 
    : isDecline ? 'from-red-900/30 to-slate-900/40 border-red-500/30 shadow-red-900/20' 
    : 'from-yellow-900/30 to-slate-900/40 border-yellow-500/30 shadow-yellow-900/20';

  const bannerText = isApprove ? '✅ GOOD FOR LOAN' : isDecline ? '❌ BAD FOR LOAN' : '⚠️ CONDITIONAL';
  const bannerTextColor = isApprove ? 'text-green-400' : isDecline ? 'text-red-400' : 'text-yellow-400';

  // Identify key drivers
  const drivers = [
    { label: 'Leverage Health', score: breakdown.leverage.score },
    { label: 'Liquidity & Cash Flow', score: breakdown.liquidityAndCash.score },
    { label: 'Debt Service Coverage', score: breakdown.dscr.score },
    { label: 'Risk/Opportunity Signals', score: breakdown.signals.score },
  ];
  
  const strongDrivers = drivers.filter(d => d.score >= 70).map(d => `Strong ${d.label.toLowerCase()}`);
  const weakDrivers = drivers.filter(d => d.score <= 40).map(d => `Poor ${d.label.toLowerCase()}`);

  return (
    <div className="space-y-6">
      <div className={`card border bg-gradient-to-br shadow-lg space-y-6 ${bannerColor}`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className={`text-3xl font-bold tracking-tight mb-2 ${bannerTextColor}`}>{bannerText}</h1>
            <div className="flex items-center gap-3">
              <ConfidenceBadge value={recommendation.overallConfidence} />
              <span className="text-sm text-slate-400 bg-white/5 px-2 py-1 rounded-md">
                v{recommendation.version} · Requested ₹{recommendation.loanAmountRequested} Cr
              </span>
            </div>
          </div>
          
          <div className="bg-black/20 p-4 rounded-xl border border-white/5 min-w-[250px]">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Key Drivers</h3>
            <ul className="text-sm space-y-1.5">
              {strongDrivers.map((d, i) => (
                <li key={`s-${i}`} className="text-green-400 flex items-center gap-2"><span className="text-xs">▲</span> {d}</li>
              ))}
              {weakDrivers.map((d, i) => (
                <li key={`w-${i}`} className="text-red-400 flex items-center gap-2"><span className="text-xs">▼</span> {d}</li>
              ))}
              {strongDrivers.length === 0 && weakDrivers.length === 0 && (
                <li className="text-slate-400 flex items-center gap-2"><span className="text-xs">▶</span> Average metrics across the board</li>
              )}
            </ul>
          </div>
        </div>
        
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detailed Narrative</h3>
          <p className="text-base text-slate-200 whitespace-pre-line leading-relaxed tracking-wide font-medium">
            {recommendation.narrative}
          </p>
        </div>
      </div>

      <div className="card bg-gradient-to-r from-slate-800/50 to-transparent border-l-4 border-l-blue-500">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🎛️</span>
          <p className="text-sm font-semibold text-slate-200">Interactive Loan Simulator</p>
          <span className="text-xs text-slate-400 ml-2">Re-scores instantly without re-running research</span>
        </div>
        <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            className="bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm w-36 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          />
          <span className="text-sm font-medium text-slate-400">₹ Cr</span>
          <button
            onClick={() => simulate.mutate(Number(loanAmount))}
            disabled={simulate.isPending}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm px-6 py-2 rounded-lg ml-auto shadow-md transition-all active:scale-95"
          >
            {simulate.isPending ? 'Re-scoring…' : `Simulate at ₹${loanAmount} Cr`}
          </button>
        </div>
        {simulate.isSuccess && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
            <p className="text-sm text-slate-300 flex-1">
              Simulation complete! New decision: 
            </p>
            <DecisionBadge decision={simulate.data.recommendation.decision} />
          </div>
        )}
      </div>

      <DecisionMatrixExplainer breakdown={breakdown} />

      <EvidenceTrace evidence={evidence} />

      {versionsQuery.data?.data?.length > 1 && (
        <div className="card">
          <p className="text-sm font-medium text-slate-300 mb-2">Recommendation history</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-white/10">
                <th className="py-1 pr-4">Version</th>
                <th className="py-1 pr-4">Loan amount</th>
                <th className="py-1 pr-4">Decision</th>
                <th className="py-1 pr-4">Confidence</th>
                <th className="py-1">Generated</th>
              </tr>
            </thead>
            <tbody>
              {versionsQuery.data.data.map((v) => (
                <tr key={v.id} className="border-b border-white/5">
                  <td className="py-1 pr-4">v{v.version}</td>
                  <td className="py-1 pr-4">₹{v.loanAmountRequested} Cr</td>
                  <td className="py-1 pr-4"><DecisionBadge decision={v.decision} /></td>
                  <td className="py-1 pr-4">{Math.round(v.overallConfidence * 100)}%</td>
                  <td className="py-1 text-xs text-slate-500">{new Date(v.generatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DecisionMatrixExplainer({ breakdown }) {
  const rows = [
    { label: 'Leverage (Debt/EBITDA, Debt/Equity)', score: breakdown.leverage.score, weight: breakdown.leverage.weight },
    { label: 'Liquidity & cash conversion', score: breakdown.liquidityAndCash.score, weight: breakdown.liquidityAndCash.weight },
    { label: `Debt-service coverage (this facility)`, score: breakdown.dscr.score, weight: breakdown.dscr.weight },
    { label: 'Risk/opportunity signals (net)', score: breakdown.signals.score, weight: breakdown.signals.weight },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
        <span className="text-xl">⚖️</span>
        <h3 className="text-sm font-semibold text-slate-200">Deterministic Score Breakdown</h3>
      </div>
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-4 group">
            <span className="text-sm text-slate-400 w-64 shrink-0 group-hover:text-slate-300 transition-colors">{r.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden relative shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" 
                style={{ width: `${r.score}%` }} 
              />
            </div>
            <div className="flex items-center gap-2 w-24 justify-end">
              <span className="text-sm font-semibold text-slate-200">{r.score}</span>
              <span className="text-xs text-slate-500 bg-white/5 px-1.5 rounded">×{r.weight}</span>
            </div>
          </div>
        ))}
      </div>
      {breakdown.dataQuality?.penalty > 0 && (
        <p className="text-xs text-conditions mt-3">
          Confidence reduced by {(breakdown.dataQuality.penalty * 100).toFixed(0)} points due to data-quality factors (open discrepancies and/or a
          low-confidence latest period).
        </p>
      )}
      {breakdown.overrideNotes?.length > 0 && (
        <p className="text-xs text-slate-500 mt-2">{breakdown.overrideNotes.join(' ')}</p>
      )}
    </div>
  );
}

function EvidenceTrace({ evidence }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
        <span className="text-xl">📜</span>
        <h3 className="text-sm font-semibold text-slate-200">Evidence Trace</h3>
        <span className="ml-auto bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full border border-white/5">{evidence.length} items evaluated</span>
      </div>
      <div className="grid gap-3 mt-4">
        {evidence.map((e) => (
          <div key={e.id} className="text-sm flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">{e.evidenceType}</span>
              <span className="text-slate-300 font-medium">
                {e.metric ? `${e.metric.metricName.replace(/_/g, ' ')} (${e.metric.periodLabel})` : e.signal ? e.signal.signalKey.replace(/_/g, ' ') : e.discrepancy ? `${e.discrepancy.metricKey.replace(/_/g, ' ')} conflict` : e.evidenceType}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
