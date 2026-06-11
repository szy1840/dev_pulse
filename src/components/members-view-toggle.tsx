"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "cards" | "table";
const STORAGE_KEY = "dp-members-view";

/**
 * Client toggle between two server-rendered views (detail cards vs compact
 * table). Both are rendered by the server and passed in as children; this
 * component only switches which one is visible, so AI summaries stay
 * server-generated.
 */
export function MembersViewToggle({ cards, table }: { cards: ReactNode; table: ReactNode }) {
  const [mode, setMode] = useState<Mode>("cards");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "table" || saved === "cards") setMode(saved);
  }, []);

  function select(next: Mode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => select("cards")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              mode === "cards"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Detail
          </button>
          <button
            type="button"
            onClick={() => select("table")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              mode === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Rows3 className="h-3.5 w-3.5" />
            Compact
          </button>
        </div>
      </div>
      <div className={mode === "cards" ? "" : "hidden"}>{cards}</div>
      <div className={mode === "table" ? "" : "hidden"}>{table}</div>
    </div>
  );
}
