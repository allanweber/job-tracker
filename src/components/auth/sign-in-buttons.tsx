"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/auth/auth-client";
import { GoogleIcon, GithubIcon } from "@/components/auth/oauth-icons";
import { safeRedirect } from "@/lib/safe-redirect";

export function SignInButtons({
  redirectTo,
  size = "lg",
  className,
}: {
  redirectTo?: string;
  size?: "default" | "lg";
  className?: string;
}) {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const callbackURL = safeRedirect(redirectTo);

  async function handleSignIn(provider: "google" | "github") {
    setError(null);
    setLoading(provider);
    try {
      await authClient.signIn.social({ provider, callbackURL });
    } catch {
      setError(
        `Couldn't reach ${provider === "google" ? "Google" : "GitHub"}. Check your connection and try again.`
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <noscript>
        <p className="text-sm text-muted-foreground">
          Signing in requires JavaScript — please enable it and reload the page.
        </p>
      </noscript>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="cta"
          size={size}
          disabled={loading !== null}
          onClick={() => handleSignIn("google")}
        >
          <GoogleIcon className="size-4" />
          {loading === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>
        <Button
          type="button"
          variant="cta"
          size={size}
          disabled={loading !== null}
          onClick={() => handleSignIn("github")}
        >
          <GithubIcon className="size-4" />
          {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
