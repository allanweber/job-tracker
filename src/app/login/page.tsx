"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/server/auth/auth-client";

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);

  async function handleSignIn(provider: "google" | "github") {
    setLoading(provider);
    try {
      await authClient.signIn.social({ provider, callbackURL: "/board" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Job Tracker</CardTitle>
          <CardDescription>
            Sign in to track your applications through your own pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="outline"
            disabled={loading !== null}
            onClick={() => handleSignIn("google")}
          >
            {loading === "google" ? "Redirecting…" : "Continue with Google"}
          </Button>
          <Button
            variant="outline"
            disabled={loading !== null}
            onClick={() => handleSignIn("github")}
          >
            {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
