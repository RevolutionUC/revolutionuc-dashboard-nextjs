"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-destructive">
            Authentication Error
          </h1>
          <p className="text-muted-foreground">
            {error || "Something went wrong during authentication. Please try again."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-lg font-medium text-sm h-10 px-4 hover:bg-primary/90 transition-colors"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
