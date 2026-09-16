import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  ArrowRightLeft,
  BellRing,
  FileText,
  Kanban,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButtons } from "@/components/auth/sign-in-buttons";

const FEATURES = [
  {
    icon: Link2,
    title: "Auto-fill from any posting",
    description:
      "Paste a job URL and Position, Company, Location, Work Mode, Salary, and Main Skills are scraped for you — no retyping.",
  },
  {
    icon: Kanban,
    title: "A pipeline you control",
    description:
      "Drag cards across Applied, Interviewing, Offer, Rejected, and No Answer. Switch to a list view whenever you want to scan everything at once.",
  },
  {
    icon: BellRing,
    title: "Follow-ups that don't slip",
    description:
      "Set a follow-up date on any application and it surfaces on the card as it approaches — and again if it's overdue.",
  },
  {
    icon: FileText,
    title: "One document library",
    description:
      "Upload resumes and cover letters once, then attach the right version to each application from a dropdown.",
  },
  {
    icon: ArrowRightLeft,
    title: "Import and export freely",
    description:
      "Bring in a spreadsheet you already track applications in, or export everything to CSV/XLSX whenever you want a copy.",
  },
  {
    icon: Bookmark,
    title: "Bookmarklet quick-add",
    description:
      "Drag one link to your bookmarks bar and capture a listing straight from the job posting page — no tab switching.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I went from a chaos of browser tabs to an actual pipeline. The URL auto-fill alone saved me hours over a two-month search.",
    name: "Marina T.",
    role: "Backend Engineer",
  },
  {
    quote:
      "The follow-up reminders are the whole product for me. I stopped letting promising conversations go cold after a week of silence.",
    name: "Devon R.",
    role: "Product Designer",
  },
  {
    quote:
      "Switching between the board and list view depending on whether I'm triaging or reviewing everything at once is exactly right.",
    name: "Priya K.",
    role: "Data Analyst",
  },
];

function Screenshot({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.25)] ${className ?? ""}`}
    >
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="relative aspect-[1440/760] w-full">
        <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover object-top" />
      </div>
    </div>
  );
}

export function LandingPage({ redirectTo }: { redirectTo?: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-3.5">
          <span className="text-[15px] font-semibold">Job Tracker</span>
          <Button render={<Link href="#signin" />} nativeButton={false} size="sm" variant="outline">
            Sign in
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-5 pt-16 pb-14 text-center">
          <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Free, no ads, your data stays yours
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Every application, one clear pipeline.
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
            Paste a job posting URL and Job Tracker fills in the details.
            Drag it through your pipeline, attach the right resume, and never
            miss a follow-up again.
          </p>
          <div id="signin" className="flex scroll-mt-20 flex-col items-center gap-3">
            <SignInButtons redirectTo={redirectTo} />
            <Button render={<Link href="#features" />} nativeButton={false} variant="ghost" size="sm">
              See how it works
            </Button>
          </div>
          <div className="mt-6 w-full max-w-4xl">
            <Screenshot src="/marketing/board-columns.png" alt="Job Tracker kanban board with applications across five pipeline stages" />
          </div>
        </section>

        <section id="features" className="border-t bg-muted/20">
          <div className="mx-auto max-w-[1100px] px-5 py-16">
            <div className="mx-auto mb-10 max-w-xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything a job search actually needs
              </h2>
              <p className="mt-2 text-muted-foreground">
                No boards to configure, no fields to define. Just add a job
                and start tracking.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-xl border bg-card p-5">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
                    <Icon className="size-4.5" />
                  </div>
                  <h3 className="mb-1.5 text-[15px] font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1100px] px-5 py-16">
          <div className="flex flex-col gap-16">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  Board or list — whichever fits the moment
                </h3>
                <p className="text-muted-foreground">
                  Drag-and-drop columns for triaging where things stand at a
                  glance, or a dense list for scanning salary and stage across
                  every application at once. The pipeline chart and interview
                  / offer rates stay pinned at the top either way.
                </p>
              </div>
              <Screenshot src="/marketing/board-list.png" alt="Job Tracker list view showing applications with stage and salary" />
            </div>

            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div className="lg:order-2">
                <h3 className="mb-2 text-xl font-semibold">
                  Every detail, one edit screen
                </h3>
                <p className="text-muted-foreground">
                  Job info, attached files, and extra notes live in tabs on
                  the same screen — so correcting what the auto-fill missed
                  takes seconds, not a form hunt.
                </p>
              </div>
              <div className="lg:order-1">
                <Screenshot src="/marketing/job-detail.png" alt="Job Tracker job detail screen with position, company, and salary fields" />
              </div>
            </div>

            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  A resume library, not a resume folder
                </h3>
                <p className="text-muted-foreground">
                  Upload every version of your resume and cover letter once,
                  then attach the right one to each application from a
                  dropdown — no more hunting through downloads.
                </p>
              </div>
              <Screenshot src="/marketing/documents.png" alt="Job Tracker documents page listing uploaded resumes and cover letters" />
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-[1100px] px-5 py-16">
            <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for people deep in a search
            </h2>
            <div className="grid gap-5 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="flex flex-col rounded-xl border bg-card p-5">
                  <blockquote className="flex-1 text-sm text-foreground">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-4 text-sm">
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-muted-foreground"> — {t.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-[1100px] flex-col items-center gap-5 px-5 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Stop tracking your search in a spreadsheet
          </h2>
          <p className="max-w-md text-muted-foreground">
            Sign in with Google or GitHub and add your first application in
            under a minute.
          </p>
          <SignInButtons redirectTo={redirectTo} />
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-6 text-sm text-muted-foreground">
          <span>Job Tracker</span>
          <Link href="#signin" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
