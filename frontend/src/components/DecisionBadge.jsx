const STYLES = {
  APPROVE: 'bg-approve/15 text-approve border border-approve/40',
  APPROVE_WITH_CONDITIONS: 'bg-conditions/15 text-conditions border border-conditions/40',
  DECLINE: 'bg-decline/15 text-decline border border-decline/40',
};

const LABELS = {
  APPROVE: 'Approve',
  APPROVE_WITH_CONDITIONS: 'Approve with conditions',
  DECLINE: 'Decline',
};

export default function DecisionBadge({ decision, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'text-base px-4 py-2' : 'text-xs px-2.5 py-1';
  return <span className={`badge ${sizeClass} ${STYLES[decision] ?? 'bg-slate-700'}`}>{LABELS[decision] ?? decision}</span>;
}
