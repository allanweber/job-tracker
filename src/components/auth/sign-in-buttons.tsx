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
    <div className={`flex flex-col gap-3 sm:flex-row ${className ?? ""}`}>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={loading !== null}
        onClick={() => handleSignIn("google")}
      >
        <GoogleIcon className="size-4" />
        {loading === "google" ? "Redirecting…" : "Continue with Google"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={loading !== null}
        onClick={() => handleSignIn("github")}
      >
        <GithubIcon className="size-4" />
        {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
      </Button>
    </div>
  );
}
