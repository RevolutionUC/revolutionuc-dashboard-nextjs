"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PARTICIPANT_STATUSES,
  type ParticipantStatus,
} from "@/lib/participant-status";

function labelForStatus(status: ParticipantStatus) {
  return status.replaceAll("_", "-");
}

export function ParticipantStatusMenu({
  participantId,
  currentStatus,
}: {
  participantId: string;
  currentStatus: ParticipantStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  async function setStatus(next: ParticipantStatus) {
    const res = await fetch(`/api/participants/${participantId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(data?.message || "Failed to update status");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          {labelForStatus(currentStatus)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {PARTICIPANT_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={(e) => {
              e.preventDefault();
              if (s === currentStatus) return;
              startTransition(async () => {
                await setStatus(s);
                router.refresh();
              });
            }}
          >
            {labelForStatus(s)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
