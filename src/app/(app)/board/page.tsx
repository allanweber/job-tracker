import { requireUser } from "@/server/auth/session";
import { getJobsForUser } from "@/server/db/queries/jobs";
import { KanbanBoard } from "@/components/board/kanban-board";
import { AddJobBox } from "@/components/jobs/add-job-box";

export default async function BoardPage() {
  const user = await requireUser();
  const jobs = await getJobsForUser(user.id);

  return (
    <div className="flex flex-col gap-4">
      <AddJobBox />
      <KanbanBoard initialJobs={jobs} />
    </div>
  );
}
