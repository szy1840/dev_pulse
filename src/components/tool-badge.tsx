import { Badge } from "@/components/ui/badge";
import { normalizeToolSlug, prettyTool } from "@/lib/format";
import { cn } from "@/lib/utils";

const TOOL_STYLES: Record<string, string> = {
  "claude-code": "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  codex: "border-teal-600/35 bg-teal-500/15 text-teal-800 dark:border-teal-400/40 dark:bg-teal-500/20 dark:text-teal-300",
  cursor: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  openclaw: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function ToolBadge({ tool, className }: { tool: string | null | undefined; className?: string }) {
  const slug = normalizeToolSlug(tool);
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex min-w-[5.75rem] justify-center text-center font-medium leading-tight",
        TOOL_STYLES[slug] ?? "border-border bg-muted/40 text-foreground",
        className
      )}
    >
      {prettyTool(tool)}
    </Badge>
  );
}
