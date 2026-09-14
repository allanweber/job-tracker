import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Use in server components / actions that require a signed-in user. */
export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session.user;
}
