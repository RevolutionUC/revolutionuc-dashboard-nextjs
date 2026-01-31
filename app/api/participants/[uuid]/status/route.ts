import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { isParticipantStatus } from "@/lib/participant-status";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ user_id: string }> },
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { user_id } = await params;
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { message: "Invalid JSON body" },
            { status: 400 },
        );
    }

    const nextStatus = (body as { status?: unknown } | null | undefined)
        ?.status;
    if (!isParticipantStatus(nextStatus)) {
        return NextResponse.json(
            { message: "Invalid status" },
            { status: 400 },
        );
    }

    const checkedIn = nextStatus === "CHECKED_IN";

    const updated = await db
        .update(participants)
        .set({
            status: nextStatus,
            checkedIn,
            updatedAt: new Date(),
        })
        .where(eq(participants.user_id, user_id))
        .returning({ user_id: participants.user_id })
        .then((r) => r[0]);

    if (!updated) {
        return NextResponse.json(
            { message: "Participant not found" },
            { status: 404 },
        );
    }

    return NextResponse.json({ ok: true });
}
