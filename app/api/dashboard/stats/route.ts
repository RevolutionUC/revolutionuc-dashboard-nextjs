import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const row = await db
      .select({
        total: sql<number>`count(*)`,
        confirmed: sql<number>`count(*) filter (where ${participants.status} = 'CONFIRMED')`,
        waitlisted: sql<number>`count(*) filter (where ${participants.status} = 'WAITLISTED')`,
        checkedIn: sql<number>`count(*) filter (where ${participants.status} = 'CHECKED_IN')`,
      })
      .from(participants)
      .then((r) => r[0]);

    const stats = {
      total: Number(row?.total ?? 0),
      confirmed: Number(row?.confirmed ?? 0),
      waitlisted: Number(row?.waitlisted ?? 0),
      checkedIn: Number(row?.checkedIn ?? 0),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 },
    );
  }
}
