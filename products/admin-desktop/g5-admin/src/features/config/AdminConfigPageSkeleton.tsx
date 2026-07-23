import { Skeleton } from "../../components/ui/skeleton";

export function AdminConfigPageSkeleton() {
  return (
    <div
      aria-busy="true"
      className="config-page-skeleton space-y-4"
      data-testid="admin-config-skeleton"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="overflow-hidden rounded-sm border border-border bg-card">
        <div className="flex flex-wrap gap-2 border-b border-border/80 px-5 py-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-24 shrink-0" />
          ))}
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
