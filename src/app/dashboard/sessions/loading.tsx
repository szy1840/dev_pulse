import {
  PageHeaderSkeleton,
  ChartCardSkeleton,
  TableSkeleton,
} from "@/components/dashboard-skeletons";

export default function SessionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height={180} />
        <ChartCardSkeleton height={180} />
      </div>
      <TableSkeleton />
    </div>
  );
}
