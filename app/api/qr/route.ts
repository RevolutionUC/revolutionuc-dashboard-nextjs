import { db } from "@/lib/db";
import { participants, events, eventRegistrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/qr
 * Retrieve participant information by QR code (participant UUID)
 * Query params:
 *   - id: participant UUID (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("id");

    if (!participantId) {
      return NextResponse.json(
        { error: "Missing participant ID" },
        { status: 400 },
      );
    }

    const participant = await db
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

    if (participant.length === 0) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: participant[0],
    });
  } catch (error) {
    console.error("Error fetching participant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/qr
 * Handle check-ins and event registrations
 * Body:
 *   - participantId: participant UUID (required)
 *   - mode: "checkin" | "workshop" | "food" (required)
 *   - eventId: event UUID (required for workshop/food modes)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, mode, eventId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: "Missing participant ID" },
        { status: 400 },
      );
    }

    if (!mode || !["checkin", "workshop", "food"].includes(mode)) {
      return NextResponse.json(
        {
          error:
            "Invalid or missing mode. Must be 'checkin', 'workshop', or 'food'",
        },
        { status: 400 },
      );
    }

    // Find the participant
    const existingParticipant = await db
      .select()
      .from(participants)
      .where(eq(participants.uuid, participantId))
      .limit(1);

    if (existingParticipant.length === 0) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 },
      );
    }

    const participant = existingParticipant[0];

    // Handle main event check-in (updates participants table)
    if (mode === "checkin") {
      // Check if already checked in
      if (participant.checkedIn) {
        return NextResponse.json(
          {
            success: false,
            message: "Participant already checked in",
            data: {
              uuid: participant.uuid,
              firstName: participant.firstName,
              lastName: participant.lastName,
              status: participant.status,
              checkedIn: participant.checkedIn,
            },
          },
          { status: 409 },
        );
      }

      // Update check-in status in participants table
      const updatedParticipant = await db
        .update(participants)
        .set({
          checkedIn: true,
          updatedAt: new Date(),
        })
        .where(eq(participants.uuid, participantId))
        .returning({
          uuid: participants.uuid,
          firstName: participants.firstName,
          lastName: participants.lastName,
          status: participants.status,
          checkedIn: participants.checkedIn,
        });

      return NextResponse.json({
        success: true,
        message: "Participant checked in successfully",
        data: updatedParticipant[0],
      });
    }

    // Handle workshop/food registration (uses eventRegistrations table)
    if (mode === "workshop" || mode === "food") {
      if (!eventId) {
        return NextResponse.json(
          { error: "Event ID is required for workshop/food registration" },
          { status: 400 },
        );
      }

      // Verify the event exists and matches the mode
      const event = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (event.length === 0) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      const eventData = event[0];
      const expectedEventType = mode === "workshop" ? "WORKSHOP" : "FOOD";

      if (eventData.eventType !== expectedEventType) {
        return NextResponse.json(
          {
            error: `Event type mismatch. Expected ${expectedEventType} but got ${eventData.eventType}`,
          },
          { status: 400 },
        );
      }

      // Check if participant is already registered for this event
      const existingRegistration = await db
        .select()
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.participantId, participantId),
            eq(eventRegistrations.eventId, eventId),
          ),
        )
        .limit(1);

      if (existingRegistration.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Participant already registered for this ${mode}`,
            data: {
              participant: {
                uuid: participant.uuid,
                firstName: participant.firstName,
                lastName: participant.lastName,
              },
              event: {
                id: eventData.id,
                name: eventData.name,
                eventType: eventData.eventType,
              },
              registeredAt: existingRegistration[0].registeredAt,
            },
          },
          { status: 409 },
        );
      }

      // Check event capacity if defined
      if (eventData.capacity !== null) {
        const registrationCount = await db
          .select()
          .from(eventRegistrations)
          .where(eq(eventRegistrations.eventId, eventId));

        if (registrationCount.length >= eventData.capacity) {
          return NextResponse.json(
            {
              success: false,
              message: "Event is at full capacity",
              data: {
                event: {
                  id: eventData.id,
                  name: eventData.name,
                  capacity: eventData.capacity,
                  currentRegistrations: registrationCount.length,
                },
              },
            },
            { status: 409 },
          );
        }
      }

      // Create the registration
      const newRegistration = await db
        .insert(eventRegistrations)
        .values({
          participantId: participantId,
          eventId: eventId,
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: `Successfully registered for ${eventData.name}`,
        data: {
          participant: {
            uuid: participant.uuid,
            firstName: participant.firstName,
            lastName: participant.lastName,
          },
          event: {
            id: eventData.id,
            name: eventData.name,
            eventType: eventData.eventType,
          },
          registeredAt: newRegistration[0].registeredAt,
        },
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    console.error("Error processing QR scan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/qr/events
 * Get all available events (for dropdown selection in scanner UI)
 * This is handled by a separate route file: /api/qr/events/route.ts
 */
