import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name || session.user.email}!
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold">Profile</h3>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Name:</span>{" "}
                {session.user.name || "Not set"}
              </p>
              <p>
                <span className="font-medium text-foreground">Email:</span> {session.user.email}
              </p>
              <p>
                <span className="font-medium text-foreground">Verified:</span>{" "}
                {session.user.emailVerified ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-semibold">Session</h3>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Created:</span>{" "}
                {new Date(session.session.createdAt).toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium text-foreground">Expires:</span>{" "}
                {new Date(session.session.expiresAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
