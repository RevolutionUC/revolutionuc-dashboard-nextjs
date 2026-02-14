"use client";

import { Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importProjectsFromDevpost } from "./actions";

interface ImportProjectsModalProps {
  projectsCount: number;
}

export function ImportProjectsModal({
  projectsCount,
}: ImportProjectsModalProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    importProjectsFromDevpost,
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
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Import from Devpost
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Import Projects from Devpost</DialogTitle>
          <DialogDescription>
            Upload a CSV file exported from Devpost to import projects. This
            will replace all existing {projectsCount} project(s) and their
            submissions.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Devpost CSV File</Label>
            <Input
              id="csv-file"
              name="csvFile"
              type="file"
              accept=".csv"
              required
            />
            <p className="text-xs text-muted-foreground">
              Upload the CSV file exported from Devpost containing all project
              submissions.
            </p>
          </div>

          {showMessage && state?.error && (
            <div className="text-sm text-red-500">{state.error}</div>
          )}
          {showMessage && state?.success && (
            <div className="text-sm text-green-500">
              Successfully imported {state.imported} project(s)
              {(state.skipped ?? 0) > 0 &&
                ` (skipped ${state.skipped} draft project(s))`}
              !
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogTrigger>
            <Button type="submit" disabled={pending}>
              {pending ? "Importing..." : "Import Projects"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
