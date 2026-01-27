"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { EventDetailsDialog } from "@/components/event-details-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { CalendarDays } from "lucide-react";

interface DbEvent {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  capacity: number | null;
  visibility: "internal" | "public";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  creatorEmail: string | null;
  creatorName: string | null;
}

interface CalendarEvent {
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
}

// March 28-29, 2026
const EVENT_DAY = new Date(2026, 2, 28);
const localizer = momentLocalizer(moment);

export default function Plan() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(EVENT_DAY);
  const { data: session } = authClient.useSession();

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/day-of-schedule");
      if (response.ok) {
        const data: DbEvent[] = await response.json();
        const calendarEvents: CalendarEvent[] = data
          .filter((event) => event.startTime && event.endTime)
          .map((event) => ({
            id: event.id,
            title: event.name,
            start: new Date(event.startTime!),
            end: new Date(event.endTime!),
            visibility: event.visibility,
            location: event.location || undefined,
            capacity: event.capacity || undefined,
            creatorEmail: event.creatorEmail || undefined,
            creatorName: event.creatorName || undefined,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
          }));
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Color-coded event styling based on visibility
  const eventStyleGetter = (event: CalendarEvent) => {
    const isInternal = event.visibility === "internal";

    return {
      style: {
        backgroundColor: isInternal ? "#ef4444" : "#3b82f6", // red-500 for internal, blue-500 for public
        borderColor: isInternal ? "#dc2626" : "#2563eb", // red-600 for internal, blue-600 for public
        color: "#ffffff",
        borderRadius: "4px",
        border: "none",
        padding: "2px 5px",
        cursor: "pointer",
      },
    };
  };

  // Custom event component to show visibility indicator
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    return (
      <div className="flex items-center gap-1">
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  // Handle event click to show details
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
  };

  // Handle calendar navigation
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  // Go to event day (March 28, 2026)
  const goToEventDay = () => {
    setCurrentDate(EVENT_DAY);
  };

  return (
    <div className="flex flex-col h-screen pt-14">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Event Schedule</h1>
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              <span>Public</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span>Internal</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Go to Event Day Button */}
          <Button variant="outline" onClick={goToEventDay}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Go to Event Day
          </Button>

          {/* Create Event Button - only shown when logged in */}
          {session && <CreateEventDialog onEventCreated={fetchEvents} />}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading events...</div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView="day"
            views={["day", "agenda"]}
            date={currentDate}
            onNavigate={handleNavigate}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
            }}
            onSelectEvent={handleSelectEvent}
            tooltipAccessor={(event) =>
              `${event.title}${event.location ? ` - ${event.location}` : ""} (Click for details)`
            }
            style={{ height: "100%" }}
          />
        )}
      </div>

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEvent}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEventDeleted={fetchEvents}
        canDelete={!!session}
      />
    </div>
  );
}
