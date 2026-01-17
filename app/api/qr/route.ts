import { db } from "@/lib/db";
import { participants, events, eventRegistrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/qr - Get participant info or events list
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const participantId = searchParams.get("id");
  const action = searchParams.get("action");

  try {
    // Fetch events list
    if (action === "events") {
      const eventsList = await db
        .select({
          id: events.id,
          name: events.name,
          description: events.description,
          eventType: events.eventType,
          location: events.location,
        })
        .from(events);

      return NextResponse.json({
        workshops: eventsList.filter((e) => e.eventType === "WORKSHOP"),
        food: eventsList.filter((e) => e.eventType === "FOOD"),
      });
    }

    // Fetch participant info
    if (!participantId) {
      return NextResponse.json(
        { error: "Missing participant ID" },
        { status: 400 },
      );
    }

    const [participant] = await db
      .select({
        uuid: participants.uuid,
        firstName: participants.firstName,
        lastName: participants.lastName,
        email: participants.email,
        status: participants.status,
        checkedIn: participants.checkedIn,
        shirtSize: participants.shirtSize,
        dietRestrictions: participants.dietRestrictions,
      })
      .from(participants)
      .where(eq(participants.uuid, participantId))
      .limit(1);

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(participant);
  } catch (error) {
    console.error("QR API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/qr - Check-in or register for event
export async function POST(request: NextRequest) {
  try {
    const { participantId, mode, eventId } = await request.json();

    if (!participantId || !mode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Find participant
    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.uuid, participantId))
      .limit(1);

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 },
      );
    }

    // Main check-in
    if (mode === "checkin") {
      if (participant.checkedIn) {
        return NextResponse.json(
          { error: "Already checked in" },
          { status: 409 },
        );
      }

      await db
        .update(participants)
        .set({ checkedIn: true, updatedAt: new Date() })
        .where(eq(participants.uuid, participantId));

      return NextResponse.json({
        message: "Checked in successfully",
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
        },
      });
    }

    // Workshop/Food registration
    if (mode === "workshop" || mode === "food") {
      if (!eventId) {
        return NextResponse.json(
          { error: "Event ID required" },
          { status: 400 },
        );
      }

      // Check event exists
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      // Check if already registered
      const [existing] = await db
        .select()
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.participantId, participantId),
            eq(eventRegistrations.eventId, eventId),
          ),
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { error: "Already registered for this event" },
          { status: 409 },
        );
      }

      // Check capacity
      if (event.capacity) {
        const registrations = await db
          .select()
          .from(eventRegistrations)
          .where(eq(eventRegistrations.eventId, eventId));

        if (registrations.length >= event.capacity) {
          return NextResponse.json({ error: "Event is full" }, { status: 409 });
        }
      }

      // Register
      await db.insert(eventRegistrations).values({ participantId, eventId });

      return NextResponse.json({
        message: `Registered for ${event.name}`,
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
        },
        event: { name: event.name },
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    console.error("QR API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
