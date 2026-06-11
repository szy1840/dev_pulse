import {
  PageHeaderSkeleton,
  StatCardsSkeleton,
  ChartCardSkeleton,
  TableSkeleton,
} from "@/components/dashboard-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function MemberDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <PageHeaderSkeleton />
      <ChartCardSkeleton height={72} />
      <StatCardsSkeleton />
      <ChartCardSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height={180} />
        <ChartCardSkeleton height={180} />
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}
