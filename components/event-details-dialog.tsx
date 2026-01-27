"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, MapPin, Users, Calendar, Clock, User } from "lucide-react";

interface EventDetailsDialogProps {
  event: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    visibility: "internal" | "public";
    location?: string;
    capacity?: number;
    creatorEmail?: string;
    creatorName?: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventDeleted: () => void;
  canDelete: boolean;
}

export function EventDetailsDialog({
  event,
  open,
  onOpenChange,
  onEventDeleted,
  canDelete,
}: EventDetailsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!event) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/day-of-schedule?id=${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete event");
      }

      onOpenChange(false);
      onEventDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const isInternal = event.visibility === "internal";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isInternal
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isInternal ? "bg-red-500" : "bg-blue-500"
                }`}
              />
              {isInternal ? "Internal" : "Public"}
            </span>
          </div>
          <DialogDescription>Event details and information</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{formatDate(event.start)}</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(event.start)} - {formatTime(event.end)}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{event.location}</p>
              </div>
            </div>
          )}

          {/* Capacity */}
          {event.capacity && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Capacity</p>
                <p className="text-sm text-muted-foreground">
                  {event.capacity} attendees
                </p>
              </div>
            </div>
          )}

          {/* Created By */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Created By</p>
              <p className="text-sm text-muted-foreground">
                {event.creatorName || event.creatorEmail || "Unknown"}
                {event.creatorName && event.creatorEmail && (
                  <span className="text-muted-foreground/70">
                    {" "}
                    ({event.creatorEmail})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Timestamps</p>
              <p className="text-sm text-muted-foreground">
                Created: {formatTimestamp(event.createdAt)}
              </p>
              <p className="text-sm text-muted-foreground">
                Updated: {formatTimestamp(event.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <div>
            {canDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete Event"}
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
