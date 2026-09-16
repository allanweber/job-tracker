import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Use in server components / actions that require a signed-in user.
 *
 * `redirectTo`, when given, is the path (including its query string, e.g.
 * `/quick-add?url=...`) to send the user back to once they've signed in —
 * threaded through `/login`'s `redirect` param into the OAuth callback URL
 * (see `LoginForm`). Without it, `/login` falls back to its default
 * post-login destination (the board), which is fine for most pages but
 * would silently strand something like the quick-add popup on the
 * dashboard instead of back at the job it was reviewing.
 */
export async function requireUser(redirectTo?: string) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login");
  }
  return session.user;
}
