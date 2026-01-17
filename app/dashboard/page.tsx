import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  let stats:
    | {
        total: number;
        confirmed: number;
        waitlisted: number;
        checkedIn: number;
      }
    | undefined;

  try {
    const row = await db
      .select({
        total: sql<number>`count(*)`,
        confirmed: sql<number>`count(*) filter (where ${participants.status} = 'CONFIRMED')`,
        waitlisted: sql<number>`count(*) filter (where ${participants.status} = 'WAITLISTED')`,
        checkedIn: sql<number>`count(*) filter (where ${participants.checkedIn} = true)`,
      })
      .from(participants)
      .then((r) => r[0]);

    stats = {
      total: Number(row?.total ?? 0),
      confirmed: Number(row?.confirmed ?? 0),
      waitlisted: Number(row?.waitlisted ?? 0),
      checkedIn: Number(row?.checkedIn ?? 0),
    };
  } catch {
    // Placeholder if DB/table isn't available yet.
    stats = undefined;
  }

  const display = {
    total: stats?.total ?? 0,
    confirmed: stats?.confirmed ?? 0,
    waitlisted: stats?.waitlisted ?? 0,
    checkedIn: stats?.checkedIn ?? 0,
    isPlaceholder: !stats,
  };

  return (
    <main className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Participants overview{" "}
          {display.isPlaceholder ? "(placeholder data)" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card">
        <Card>
          <CardHeader>
            <CardTitle>Total participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {display.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {display.confirmed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waitlisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {display.waitlisted}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checked in</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {display.checkedIn}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
