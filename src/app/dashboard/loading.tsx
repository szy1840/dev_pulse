import {
  PageHeaderSkeleton,
  StatCardsSkeleton,
  ChartCardSkeleton,
} from "@/components/dashboard-skeletons";

export default function OverviewLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <ChartCardSkeleton height={96} />
      <StatCardsSkeleton />
      <ChartCardSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height={180} />
        <ChartCardSkeleton height={180} />
      </div>
    </div>
  );
}
