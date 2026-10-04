/** Loading placeholders that mirror the shape of the real content. */

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function ShelterCardSkeleton() {
  return (
    <div className="card p-4" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="mt-3 flex gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-3 h-2 w-full rounded-full" />
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-7 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="card p-4" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
    </div>
  );
}

export function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className="card p-4" aria-hidden="true">
      <Skeleton className="h-3 w-32" />
      <Skeleton className={`mt-4 w-full ${height}`} />
    </div>
  );
}

export default Skeleton;
