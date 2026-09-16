"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/server/auth/auth-client";

// Only ever follow a same-origin relative path: guards against `redirect`
// being turned into an open redirect (e.g. `//evil.com` or `/\evil.com`,
// both of which browsers can treat as protocol-relative absolute URLs).
function safeRedirect(redirectTo: string | undefined): string {
  if (!redirectTo) return "/board";
  if (!redirectTo.startsWith("/")) return "/board";
  if (redirectTo.startsWith("//") || redirectTo.startsWith("/\\")) return "/board";
  return redirectTo;
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const callbackURL = safeRedirect(redirectTo);

  async function handleSignIn(provider: "google" | "github") {
    setLoading(provider);
    try {
      await authClient.signIn.social({ provider, callbackURL });
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Job Tracker</CardTitle>
        <CardDescription>
          Sign in to track your applications through your own pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button variant="outline" disabled={loading !== null} onClick={() => handleSignIn("google")}>
          {loading === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>
        <Button variant="outline" disabled={loading !== null} onClick={() => handleSignIn("github")}>
          {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
        </Button>
      </CardContent>
    </Card>
  );
}
