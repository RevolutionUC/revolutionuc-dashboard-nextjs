"use client";

import { Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { assignJudgesToGroups } from "./actions";

export function AssignJudgesToGroupsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleClick = async () => {
    if (!confirm("This will clear all existing groups and create new ones. Continue?")) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    const response = await assignJudgesToGroups();

    setIsLoading(false);

    if (response.success) {
      setResult({
        success: true,
        message: `Successfully created ${response.groupCount} judge groups!`,
      });
    } else {
      setResult({
        success: false,
        message: response.error || "Failed to assign judges to groups",
      });
    }

    // Clear message after 3 seconds
    setTimeout(() => setResult(null), 3000);
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleClick} disabled={isLoading} variant="outline">
        <Users className="mr-2 h-4 w-4" />
        {isLoading ? "Assigning..." : "Assign Judges to Groups"}
      </Button>
      {result && (
        <span className={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
          {result.message}
        </span>
      )}
    </div>
  );
}
