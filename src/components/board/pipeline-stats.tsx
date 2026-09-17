import { STAGES, STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/constants";
import type { JobWithTags } from "@/server/db/queries/jobs";

const ROW_HEIGHT = 46;
const SVG_WIDTH = 300;

function buildPipeline(jobs: JobWithTags[]) {
  const total = jobs.length;
  const svgHeight = ROW_HEIGHT * STAGES.length;
  let cumLeft = 0;

  const rows = STAGES.map((stage) => {
    const count = jobs.filter((j) => j.stage === stage).length;
    const leftThickness = total ? (count > 0 ? Math.max((count / total) * svgHeight, 8) : 0) : 0;
    const ly0 = cumLeft;
    const ly1 = cumLeft + leftThickness;
    cumLeft += leftThickness;

    const rowIndex = STAGES.indexOf(stage);
    const rightThickness = count > 0 ? Math.min(leftThickness, ROW_HEIGHT - 12) : 0;
    const rowCenter = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    const ry0 = rowCenter - rightThickness / 2;
    const ry1 = rowCenter + rightThickness / 2;
    const cw = SVG_WIDTH / 2;

    const pathD =
      leftThickness > 0
        ? `M 0,${ly0} C ${cw},${ly0} ${cw},${ry0} ${SVG_WIDTH},${ry0} L ${SVG_WIDTH},${ry1} C ${cw},${ry1} ${cw},${ly1} 0,${ly1} Z`
        : "";

    return { stage, label: STAGE_LABELS[stage], count, color: STAGE_COLORS[stage], pathD };
  });

  return { total, height: svgHeight, viewBox: `0 0 ${SVG_WIDTH} ${svgHeight}`, rows };
}

function computeRate(jobs: JobWithTags[], predicate: (job: JobWithTags) => boolean) {
  const total = jobs.length;
  const num = jobs.filter(predicate).length;
  const pct = total ? Math.round((num / total) * 100) : 0;
  return {
    pctLabel: `${pct}%`,
    fraction: `${num} of ${total}`,
    ring:
      total && pct > 0
        ? `conic-gradient(var(--cta) ${pct}%, var(--muted) 0)`
        : "var(--muted)",
  };
}

function RateCard({ label, rate }: { label: string; rate: ReturnType<typeof computeRate> }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border p-4">
      <div
        className="flex size-16 shrink-0 items-center justify-center rounded-full"
        style={{ background: rate.ring }}
      >
        <div className="flex size-[46px] items-center justify-center rounded-full bg-background text-[13px] font-semibold">
          {rate.pctLabel}
        </div>
      </div>
      <div>
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{rate.fraction} applications</div>
      </div>
    </div>
  );
}

export function PipelineStats({ jobs }: { jobs: JobWithTags[] }) {
  const pipeline = buildPipeline(jobs);
  const interviewRate = computeRate(
    jobs,
    (j) => (j.stage as Stage) === "interviewing" || (j.stage as Stage) === "offer",
  );
  const offerRate = computeRate(jobs, (j) => (j.stage as Stage) === "offer");

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
      <div className="rounded-xl border p-4">
        <h3 className="mb-3.5 text-sm font-semibold">Pipeline</h3>
        <div className="flex items-stretch" style={{ height: pipeline.height }}>
          <div className="flex shrink-0 flex-col items-end justify-center pr-3">
            <div className="text-xl font-semibold">{pipeline.total}</div>
            <div className="text-[11px] whitespace-nowrap text-muted-foreground">Applications</div>
          </div>
          <div className="w-[3px] shrink-0 rounded-sm bg-foreground" />
          <svg
            viewBox={pipeline.viewBox}
            preserveAspectRatio="none"
            className="h-full min-w-0 flex-1"
          >
            {pipeline.rows.map((row) => (
              <path key={row.stage} d={row.pathD} fill={row.color} opacity={0.55} />
            ))}
          </svg>
          <div className="flex shrink-0 flex-col">
            {pipeline.rows.map((row) => (
              <div key={row.stage} className="flex items-center gap-2.5" style={{ height: ROW_HEIGHT }}>
                <span className="h-6 w-[3px] shrink-0 rounded-sm bg-foreground" />
                <div>
                  <div className="text-[13px] leading-tight font-semibold">{row.count}</div>
                  <div className="text-[11px] leading-tight whitespace-nowrap text-muted-foreground">
                    {row.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <RateCard label="Interview Rate" rate={interviewRate} />
      <RateCard label="Offer Rate" rate={offerRate} />
    </div>
  );
}
