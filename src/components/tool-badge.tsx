import { Badge } from "@/components/ui/badge";
import { prettyTool } from "@/lib/format";
import { cn } from "@/lib/utils";

const TOOL_STYLES: Record<string, string> = {
  "claude-code": "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  cursor: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  openclaw: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function ToolBadge({ tool, className }: { tool: string | null | undefined; className?: string }) {
  const key = tool ?? "unknown";
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", TOOL_STYLES[key] ?? "", className)}
    >
      {prettyTool(tool)}
    </Badge>
  );
}
