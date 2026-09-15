type SalaryFields = {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryRawText: string | null;
};

export function formatSalary(job: SalaryFields): string | null {
  if (job.salaryMin || job.salaryMax) {
    const currency = job.salaryCurrency ?? "";
    const period = job.salaryPeriod === "hour" ? "/hr" : "/yr";
    if (job.salaryMin && job.salaryMax) {
      return `${currency} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}${period}`.trim();
    }
    return `${currency} ${(job.salaryMin ?? job.salaryMax)!.toLocaleString()}${period}`.trim();
  }
  return job.salaryRawText ?? null;
}
