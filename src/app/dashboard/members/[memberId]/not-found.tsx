import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function MemberNotFound() {
  const t = await getTranslations("members");
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <UserX className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("notFound.message")}
        </p>
        <Link
          href="/dashboard/members"
          className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("notFound.back")}
        </Link>
      </CardContent>
    </Card>
  );
}
