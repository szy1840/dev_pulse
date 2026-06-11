import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function MemberNotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <UserX className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          This member isn&apos;t on the current team, or the link is out of date.
        </p>
        <Link
          href="/dashboard/members"
          className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to members
        </Link>
      </CardContent>
    </Card>
  );
}
