"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";

export function ParticipantsSearchBox({
  initialQuery,
  debounceMs = 300,
}: {
  initialQuery: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = React.useState(initialQuery);
  const [isPending, startTransition] = React.useTransition();

  // Keep input in sync with back/forward navigation.
  React.useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const currentQs = searchParams.toString();
      const params = new URLSearchParams(currentQs);

      const next = value.trim();
      if (next.length > 0) params.set("q", next);
      else params.delete("q");

      // When the search changes, reset pagination back to page 1.
      params.delete("page");

      const nextQs = params.toString();
      if (nextQs === currentQs) return;

      startTransition(() => {
        router.replace(nextQs ? `${pathname}?${nextQs}` : pathname);
      });
    }, debounceMs);

    return () => window.clearTimeout(handle);
  }, [value, debounceMs, pathname, router, searchParams]);

  return (
    <div className="w-full sm:max-w-sm">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by first or last name..."
        autoComplete="off"
      />
      <p className="mt-1 text-xs text-muted-foreground">{isPending ? "Searching..." : " "}</p>
    </div>
  );
}
