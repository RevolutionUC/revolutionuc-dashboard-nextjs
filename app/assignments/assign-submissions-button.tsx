"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { assignSubmissionsToJudgeGroups } from "./actions";

export function AssignSubmissionsButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    assignSubmissionsToJudgeGroups,
    null,
  );
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (state?.error || state?.success) {
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
        if (state?.success) {
          setOpen(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Assign Projects to Judge Groups
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Assign Projects to Judge Groups</DialogTitle>
          <DialogDescription>
            This will automatically assign all project submissions to judge
            groups based on categories. Each project will be assigned to at
            least 6 judges total.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="mt-4 space-y-4">
          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Assignment Logic:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Projects are assigned to judge groups of matching categories
              </li>
              <li>Sponsor projects: 1 judge group</li>
              <li>Inhouse projects: 2 judge groups</li>
              <li>General projects: 1 judge group</li>
              <li>
                Additional General judges added to reach minimum of 6 judges per
                project
              </li>
            </ul>
          </div>

          {showMessage && state?.error && (
            <div className="text-sm text-red-500">{state.error}</div>
          )}
          {showMessage && state?.success && (
            <div className="text-sm text-green-500">
              Successfully created {state.count} assignment(s) for{" "}
              {state.projectsAssigned} project(s)!
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogTrigger>
            <Button type="submit" disabled={pending}>
              {pending ? "Assigning..." : "Assign Projects"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
