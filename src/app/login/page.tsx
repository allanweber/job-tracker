import { LoginForm } from "@/components/auth/login-form";

/**
 * A Server Component (not `useSearchParams`) reading the `redirect` param —
 * see the `searchParams` prop docs: preferred over the client hook when
 * you're already in a Page, and avoids needing a Suspense boundary just to
 * read a query param `requireUser()` (see server/auth/session.ts) put here
 * itself, e.g. `/login?redirect=%2Fquick-add%3Furl%3D...` from the
 * extension/bookmarklet's quick-add flow.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <LoginForm redirectTo={redirect} />
    </main>
  );
}
