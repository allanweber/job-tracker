/**
 * Seeds a batch of jobs, spread across every board stage, for one existing
 * user — useful for populating the kanban board / pipeline stats locally
 * without clicking through the UI.
 *
 * Usage:
 *   pnpm db:seed <userId>
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { user, jobs, jobStageHistory } from "../src/server/db/schema";
import type { Stage } from "../src/lib/constants";

type SeedJob = {
  positionName: string;
  companyName: string;
  sourceUrl: string;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  salaryPeriod: "year" | "hour";
  skills: string[];
  notes?: string;
  contactPerson?: string;
  /** Ordered path through stages this job actually took, always starting
   * with "applied" — mirrors what `recordStageChange` would have written
   * to `job_stage_history` as the job moved forward. The final entry is
   * the job's current `stage`. */
  path: Stage[];
};

const SEED_JOBS: SeedJob[] = [
  {
    positionName: "Frontend Engineer",
    companyName: "Northwind Software",
    sourceUrl: "https://boards.greenhouse.io/northwind/jobs/1000001",
    location: "Remote",
    workMode: "remote",
    salaryMin: 95000,
    salaryMax: 120000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["React", "TypeScript", "Next.js"],
    path: ["applied"],
  },
  {
    positionName: "Product Designer",
    companyName: "Wren Studio",
    sourceUrl: "https://jobs.lever.co/wren/1000002",
    location: "Austin, TX",
    workMode: "hybrid",
    salaryMin: 85000,
    salaryMax: 105000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Figma", "Design Systems"],
    path: ["applied"],
  },
  {
    positionName: "Backend Engineer",
    companyName: "Fathom Data",
    sourceUrl: "https://boards.greenhouse.io/fathom/jobs/1000003",
    location: "New York, NY",
    workMode: "onsite",
    salaryMin: 110000,
    salaryMax: 140000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Node.js", "PostgreSQL", "Drizzle"],
    contactPerson: "Priya Nair — recruiter",
    path: ["applied", "interviewing"],
  },
  {
    positionName: "Staff Software Engineer",
    companyName: "Cobalt Systems",
    sourceUrl: "https://jobs.lever.co/cobalt/1000004",
    location: "Remote",
    workMode: "remote",
    salaryMin: 150000,
    salaryMax: 180000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Go", "Kubernetes", "Distributed Systems"],
    notes: "Recruiter screen went well, onsite loop scheduled next.",
    path: ["applied", "interviewing"],
  },
  {
    positionName: "Engineering Manager",
    companyName: "Meridian Health",
    sourceUrl: "https://boards.greenhouse.io/meridian/jobs/1000005",
    location: "Chicago, IL",
    workMode: "hybrid",
    salaryMin: 160000,
    salaryMax: 190000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Leadership", "Roadmapping"],
    notes: "Verbal offer received, waiting on written details.",
    contactPerson: "Diego Alvarez — hiring manager",
    path: ["applied", "interviewing", "offer"],
  },
  {
    positionName: "Full Stack Developer",
    companyName: "Bramble Labs",
    sourceUrl: "https://jobs.lever.co/bramble/1000006",
    location: "Remote",
    workMode: "remote",
    salaryMin: 100000,
    salaryMax: 130000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["React", "Node.js", "AWS"],
    path: ["applied", "interviewing", "offer"],
  },
  {
    positionName: "Data Engineer",
    companyName: "Sable Analytics",
    sourceUrl: "https://boards.greenhouse.io/sable/jobs/1000007",
    location: "Remote",
    workMode: "remote",
    salaryMin: 105000,
    salaryMax: 125000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Python", "Airflow", "dbt"],
    notes: "Rejected after the take-home exercise.",
    path: ["applied", "rejected"],
  },
  {
    positionName: "Mobile Engineer (iOS)",
    companyName: "Harbor Apps",
    sourceUrl: "https://jobs.lever.co/harbor/1000008",
    location: "San Francisco, CA",
    workMode: "onsite",
    salaryMin: 115000,
    salaryMax: 145000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Swift", "SwiftUI"],
    notes: "Passed two rounds, rejected after the final panel.",
    path: ["applied", "interviewing", "rejected"],
  },
  {
    positionName: "DevOps Engineer",
    companyName: "Ironclad Systems",
    sourceUrl: "https://boards.greenhouse.io/ironclad/jobs/1000009",
    location: "Remote",
    workMode: "remote",
    salaryMin: 120000,
    salaryMax: 150000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Terraform", "AWS", "CI/CD"],
    notes: "Applied through a referral, no response yet.",
    path: ["applied", "no_answer"],
  },
  {
    positionName: "QA Automation Engineer",
    companyName: "Lattice Point",
    sourceUrl: "https://jobs.lever.co/latticepoint/1000010",
    location: "Remote",
    workMode: "remote",
    salaryMin: 90000,
    salaryMax: 110000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Playwright", "TypeScript"],
    path: ["applied", "no_answer"],
  },
  {
    positionName: "Senior React Developer",
    companyName: "Kestrel Media",
    sourceUrl: "https://boards.greenhouse.io/kestrel/jobs/1000011",
    location: "Remote",
    workMode: "remote",
    salaryMin: 110000,
    salaryMax: 135000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["React", "GraphQL", "Storybook"],
    path: ["applied"],
  },
  {
    positionName: "Machine Learning Engineer",
    companyName: "Vantage AI",
    sourceUrl: "https://jobs.lever.co/vantage/1000012",
    location: "Seattle, WA",
    workMode: "hybrid",
    salaryMin: 140000,
    salaryMax: 175000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Python", "PyTorch", "MLOps"],
    path: ["applied"],
  },
  {
    positionName: "Technical Program Manager",
    companyName: "Alderway Group",
    sourceUrl: "https://boards.greenhouse.io/alderway/jobs/1000013",
    location: "Remote",
    workMode: "remote",
    salaryMin: 120000,
    salaryMax: 145000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Program Management", "JIRA"],
    notes: "Applied via LinkedIn Easy Apply.",
    path: ["applied"],
  },
  {
    positionName: "Site Reliability Engineer",
    companyName: "Corvid Cloud",
    sourceUrl: "https://jobs.lever.co/corvid/1000014",
    location: "Remote",
    workMode: "remote",
    salaryMin: 130000,
    salaryMax: 160000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Kubernetes", "Prometheus", "Go"],
    contactPerson: "Sam Ortiz — recruiter",
    path: ["applied", "interviewing"],
  },
  {
    positionName: "UX Researcher",
    companyName: "Thistle & Co.",
    sourceUrl: "https://boards.greenhouse.io/thistle/jobs/1000015",
    location: "Boston, MA",
    workMode: "hybrid",
    salaryMin: 95000,
    salaryMax: 115000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["User Interviews", "Usability Testing"],
    notes: "First round done, waiting on panel scheduling.",
    path: ["applied", "interviewing"],
  },
  {
    positionName: "Platform Engineer",
    companyName: "Granite Peak Systems",
    sourceUrl: "https://jobs.lever.co/granitepeak/1000016",
    location: "Denver, CO",
    workMode: "onsite",
    salaryMin: 125000,
    salaryMax: 150000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["AWS", "Terraform", "Docker"],
    path: ["applied", "interviewing"],
  },
  {
    positionName: "Senior Backend Engineer",
    companyName: "Pinnacle Freight",
    sourceUrl: "https://boards.greenhouse.io/pinnacle/jobs/1000017",
    location: "Remote",
    workMode: "remote",
    salaryMin: 130000,
    salaryMax: 160000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Java", "Spring Boot", "Kafka"],
    notes: "Verbal offer, negotiating start date.",
    path: ["applied", "interviewing", "offer"],
  },
  {
    positionName: "Growth Marketing Manager",
    companyName: "Fernwood Digital",
    sourceUrl: "https://jobs.lever.co/fernwood/1000018",
    location: "Remote",
    workMode: "remote",
    salaryMin: 90000,
    salaryMax: 115000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["SEO", "Paid Acquisition", "Analytics"],
    contactPerson: "Lena Ford — hiring manager",
    path: ["applied", "interviewing", "offer"],
  },
  {
    positionName: "Solutions Architect",
    companyName: "Brightline Consulting",
    sourceUrl: "https://boards.greenhouse.io/brightline/jobs/1000019",
    location: "Remote",
    workMode: "remote",
    salaryMin: 145000,
    salaryMax: 175000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["AWS", "Client Delivery", "Architecture"],
    notes: "Signed offer letter.",
    path: ["applied", "interviewing", "offer"],
  },
  {
    positionName: "Junior Web Developer",
    companyName: "Copperleaf Agency",
    sourceUrl: "https://jobs.lever.co/copperleaf/1000020",
    location: "Remote",
    workMode: "remote",
    salaryMin: 65000,
    salaryMax: 80000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["HTML", "CSS", "JavaScript"],
    notes: "Rejected — looking for more senior experience.",
    path: ["applied", "rejected"],
  },
  {
    positionName: "Data Scientist",
    companyName: "Element Insights",
    sourceUrl: "https://boards.greenhouse.io/element/jobs/1000021",
    location: "Remote",
    workMode: "remote",
    salaryMin: 115000,
    salaryMax: 140000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Python", "SQL", "A/B Testing"],
    notes: "Rejected after recruiter screen.",
    path: ["applied", "rejected"],
  },
  {
    positionName: "Engineering Lead",
    companyName: "Tallgrass Robotics",
    sourceUrl: "https://jobs.lever.co/tallgrass/1000022",
    location: "Pittsburgh, PA",
    workMode: "onsite",
    salaryMin: 155000,
    salaryMax: 185000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Leadership", "C++", "Robotics"],
    notes: "Rejected after the onsite loop.",
    path: ["applied", "interviewing", "rejected"],
  },
  {
    positionName: "Customer Success Engineer",
    companyName: "Beacon Software",
    sourceUrl: "https://boards.greenhouse.io/beacon/jobs/1000023",
    location: "Remote",
    workMode: "remote",
    salaryMin: 85000,
    salaryMax: 105000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["SQL", "Customer Support", "Troubleshooting"],
    notes: "Passed technical interview, rejected after culture-fit round.",
    path: ["applied", "interviewing", "rejected"],
  },
  {
    positionName: "Firmware Engineer",
    companyName: "Cinder Devices",
    sourceUrl: "https://jobs.lever.co/cinder/1000024",
    location: "Remote",
    workMode: "remote",
    salaryMin: 110000,
    salaryMax: 135000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["C", "Embedded Systems", "RTOS"],
    notes: "Applied cold, never heard back.",
    path: ["applied", "no_answer"],
  },
  {
    positionName: "Content Strategist",
    companyName: "Windward Media",
    sourceUrl: "https://boards.greenhouse.io/windward/jobs/1000025",
    location: "Remote",
    workMode: "remote",
    salaryMin: 75000,
    salaryMax: 95000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    skills: ["Content Strategy", "SEO", "Editing"],
    path: ["applied", "no_answer"],
  },
];

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: tsx scripts/seed-jobs.ts <userId>");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { casing: "snake_case" });

  try {
    const [existingUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (!existingUser) {
      throw new Error(`No user found with id "${userId}"`);
    }

    const boardOrderByStage = new Map<Stage, number>();

    for (const seedJob of SEED_JOBS) {
      const stage = seedJob.path[seedJob.path.length - 1];
      const boardOrder = boardOrderByStage.get(stage) ?? 0;
      boardOrderByStage.set(stage, boardOrder + 1);

      const [insertedJob] = await db
        .insert(jobs)
        .values({
          userId: existingUser.id,
          sourceUrl: seedJob.sourceUrl,
          positionName: seedJob.positionName,
          companyName: seedJob.companyName,
          location: seedJob.location,
          workMode: seedJob.workMode,
          salaryMin: seedJob.salaryMin,
          salaryMax: seedJob.salaryMax,
          salaryCurrency: seedJob.salaryCurrency,
          salaryPeriod: seedJob.salaryPeriod,
          skills: seedJob.skills,
          notes: seedJob.notes ?? null,
          contactPerson: seedJob.contactPerson ?? null,
          stage,
          boardOrder,
        })
        .returning();

      await db
        .insert(jobStageHistory)
        .values(seedJob.path.map((historyStage) => ({ jobId: insertedJob.id, stage: historyStage })));

      console.log(`Seeded "${seedJob.positionName}" @ ${seedJob.companyName} → ${stage}`);
    }

    console.log(`\nDone. Seeded ${SEED_JOBS.length} jobs for user ${existingUser.email}.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
