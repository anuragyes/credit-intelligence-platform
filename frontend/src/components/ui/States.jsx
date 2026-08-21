export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="card flex items-center gap-3 text-slate-400">
      <span className="h-3 w-3 rounded-full bg-blue-400 animate-pulse" />
      {label}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="card border-decline/40 bg-decline/10 text-red-200">
      <p className="font-medium">Couldn't load this section</p>
      <p className="text-sm text-red-300/80 mt-1">{message}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="card text-center py-10">
      <p className="font-medium text-slate-200">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
