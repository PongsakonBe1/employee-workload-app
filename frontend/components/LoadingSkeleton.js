"use client";

// Table loading skeleton
export function TableSkeleton({ rows = 5, columns = 8 }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 border-b border-slate-100 px-5 py-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 rounded bg-slate-200"
            style={{ width: `${Math.random() * 60 + 60}px` }}
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="flex gap-4 border-b border-slate-50 px-5 py-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={`cell-${rowIdx}-${colIdx}`}
              className="h-4 rounded bg-slate-100"
              style={{ width: `${Math.random() * 80 + 40}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card loading skeleton
export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="apple-panel animate-pulse p-6">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-32 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

// Chart loading skeleton
export function ChartSkeleton() {
  return (
    <div className="apple-panel animate-pulse p-6">
      <div className="h-5 w-32 rounded bg-slate-200" />
      <div className="mt-6 h-[250px] rounded bg-slate-100" />
    </div>
  );
}

// Form loading skeleton
export function FormSkeleton({ fields = 5 }) {
  return (
    <div className="animate-pulse space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="mt-2 h-10 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// Page loading skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-10 w-64 rounded bg-slate-200" />
        <div className="mt-2 h-4 w-full max-w-md rounded bg-slate-200" />
      </div>
      
      {/* Cards */}
      <CardSkeleton />
      
      {/* Table */}
      <div className="apple-panel overflow-hidden">
        <TableSkeleton />
      </div>
    </div>
  );
}
