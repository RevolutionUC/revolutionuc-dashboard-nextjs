"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export function AuthHeader() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <header className="fixed top-0 right-0 z-50 p-4 flex items-center gap-3">
        <div className="h-10 w-20 bg-muted animate-pulse rounded-full" />
      </header>
    );
  }

  if (session) {
    return (
      <header className="fixed top-0 right-0 z-50 p-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {session.user.name || session.user.email}
        </span>
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="h-8 w-8 rounded-full"
          />
        )}
        <button
          type="button"
          onClick={() => authClient.signOut()}
          className="bg-secondary text-secondary-foreground rounded-full font-medium text-sm h-10 px-4 cursor-pointer hover:bg-secondary/80 transition-colors"
        >
          Sign Out
        </button>
      </header>
    );
  }

  return (
    <header className="fixed top-0 right-0 z-50 p-4 flex items-center gap-3">
      <Link href="/sign-in" className="text-sm font-medium hover:underline cursor-pointer">
        Sign In
      </Link>
      <Link
        href="/sign-up"
        className="bg-primary text-primary-foreground rounded-full font-medium text-sm h-10 px-4 flex items-center cursor-pointer hover:bg-primary/90 transition-colors"
      >
        Sign Up
      </Link>
    </header>
  );
}
