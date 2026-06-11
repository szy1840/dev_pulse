import {
  PageHeaderSkeleton,
  ChartCardSkeleton,
} from "@/components/dashboard-skeletons";

export default function MembersLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height={180} />
        <ChartCardSkeleton height={180} />
      </div>
      <ChartCardSkeleton height={140} />
      <ChartCardSkeleton height={140} />
    </div>
  );
}
