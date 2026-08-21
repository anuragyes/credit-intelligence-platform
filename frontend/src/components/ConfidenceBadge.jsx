export default function ConfidenceBadge({ value }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const tone = pct >= 70 ? 'text-approve border-approve/40 bg-approve/10' : pct >= 45 ? 'text-conditions border-conditions/40 bg-conditions/10' : 'text-decline border-decline/40 bg-decline/10';
  return <span className={`badge border ${tone}`}>{pct}% confidence</span>;
}
