export function EmptyState({ title = "No records found", message = "Try changing filters or add a new workload record." }) {
  return (
    <div className="apple-panel px-6 py-12 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}
