const SEVERITY_COLOR = {
  high: 'border-l-decline',
  medium: 'border-l-conditions',
  low: 'border-l-slate-500',
};

export default function SignalCard({ signal }) {
  const isRisk = signal.direction === 'risk';
  return (
    <div className={`card border-l-4 ${SEVERITY_COLOR[signal.severity] ?? 'border-l-slate-500'}`}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className={`badge ${isRisk ? 'bg-decline/15 text-decline' : 'bg-approve/15 text-approve'}`}>
          {isRisk ? 'Risk' : 'Opportunity'} · {signal.severity}
        </span>
        <span className="text-xs text-slate-500">{Math.round((signal.confidence ?? 0.7) * 100)}% confidence</span>
      </div>
      <p className="font-medium text-sm text-slate-100 mb-1">{signal.signalKey?.replace(/_/g, ' ') ?? signal.key?.replace(/_/g, ' ')}</p>
      <p className="text-sm text-slate-400">{signal.description}</p>
    </div>
  );
}
