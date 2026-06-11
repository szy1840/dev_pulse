import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ bodyHeight = 96 }: { bodyHeight?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-2.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton style={{ height: bodyHeight }} className="w-full" />
      </CardContent>
    </Card>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-36" />
          ))}
        </div>
        <div className="space-y-6">
          <SectionSkeleton bodyHeight={64} />
          <SectionSkeleton bodyHeight={160} />
          <SectionSkeleton bodyHeight={64} />
        </div>
      </div>
    </div>
  );
}
