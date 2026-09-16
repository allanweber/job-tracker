import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { LandingPage } from "@/components/marketing/landing-page";
import { safeRedirect } from "@/lib/safe-redirect";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(safeRedirect(redirectTo));
  return <LandingPage redirectTo={redirectTo} />;
}
