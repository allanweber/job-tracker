import { requireUser } from "@/server/auth/session";
import { getJobsForUser } from "@/server/db/queries/jobs";
import { BoardClient } from "@/components/board/board-client";

export default async function BoardPage() {
  const user = await requireUser();
  const jobs = await getJobsForUser(user.id);

  return <BoardClient initialJobs={jobs} />;
}
