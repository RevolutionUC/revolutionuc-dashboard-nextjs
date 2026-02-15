"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateRandomScores } from "./actions";

export function GenerateScoresButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await generateRandomScores();
        router.refresh();
      }}
    >
      Generate Random Scores
    </Button>
  );
}
