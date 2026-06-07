"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { COMMON_TIMEZONES, formatTimezoneLabel } from "@/lib/timezone";
import { updateTimezone } from "@/lib/actions";

function allTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return [...COMMON_TIMEZONES];
}

export function TimezoneSettings({
  currentTimezone,
}: {
  currentTimezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(currentTimezone);
  const [error, setError] = useState<string | null>(null);

  const browserTz = useMemo(
    () => (typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null),
    []
  );

  const options = useMemo(() => {
    const all = allTimezones();
    const common = new Set<string>(COMMON_TIMEZONES);
    const rest = all.filter((tz) => !common.has(tz));
    return { common: [...COMMON_TIMEZONES], rest };
  }, []);

  function save(next: string) {
    setError(null);
    setValue(next);
    startTransition(async () => {
      const res = await updateTimezone(next);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          value={value}
          disabled={pending}
          onChange={(e) => save(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <optgroup label="Common">
            {options.common.map((tz) => (
              <option key={tz} value={tz}>
                {tz} ({formatTimezoneLabel(tz)})
              </option>
            ))}
          </optgroup>
          {options.rest.length > 0 && (
            <optgroup label="All">
              {options.rest.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <p className="text-xs text-muted-foreground">
          Dashboard &quot;Today&quot; summaries and stats use midnight in this timezone.
        </p>
      </div>

      {browserTz && browserTz !== value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => save(browserTz)}
        >
          Use browser timezone ({browserTz})
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
