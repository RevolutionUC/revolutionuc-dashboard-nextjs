import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/qr/events
 * Retrieve available events for the QR scanner
 * Query params:
 *   - type: "WORKSHOP" | "FOOD" | "all" (optional, defaults to "all")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("type");

    let eventsList;

    if (eventType && eventType !== "all") {
      // Filter by event type
      eventsList = await db
        .select({
          id: events.id,
          name: events.name,
          description: events.description,
          eventType: events.eventType,
          startTime: events.startTime,
          endTime: events.endTime,
          location: events.location,
          capacity: events.capacity,
        })
        .from(events)
        .where(eq(events.eventType, eventType.toUpperCase()));
    } else {
      // Get all events (workshops and food)
      eventsList = await db
        .select({
          id: events.id,
          name: events.name,
          description: events.description,
          eventType: events.eventType,
          startTime: events.startTime,
          endTime: events.endTime,
          location: events.location,
          capacity: events.capacity,
        })
        .from(events);
    }

    // Group events by type for easier consumption
    const groupedEvents = {
      workshops: eventsList.filter((e) => e.eventType === "WORKSHOP"),
      food: eventsList.filter((e) => e.eventType === "FOOD"),
      other: eventsList.filter(
        (e) => e.eventType !== "WORKSHOP" && e.eventType !== "FOOD",
      ),
    };

    return NextResponse.json({
      success: true,
      data: {
        events: eventsList,
        grouped: groupedEvents,
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
