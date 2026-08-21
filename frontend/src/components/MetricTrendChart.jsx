import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MetricTrendChart({ data, dataKey, label, color = '#60a5fa', formatValue }) {
  if (!data?.length) return null;
  return (
    <div className="card">
      <p className="text-sm font-medium text-slate-300 mb-3">{label}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ background: '#161c2c', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }}
            formatter={(v) => (formatValue ? formatValue(v) : v)}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
