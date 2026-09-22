import { sankey, sankeyLeft } from "d3-sankey";
import { STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, type Stage } from "@/lib/constants";
import type { JobWithTags } from "@/server/db/queries/jobs";

const ROW_HEIGHT = 60;
const COLUMN_WIDTH = 250;
const NODE_THICKNESS = 6;
const LABEL_WIDTH = 140;
const LABEL_GAP = 12;
const LABEL_HEIGHT = 38;
/** Space reserved left of the chart for the root node's label, which sits
 * on the outer (left) side of its tick — mirroring every other node's
 * label sitting on ITS outer (right) side — instead of overlapping the
 * ribbons that immediately follow it. */
const LEFT_MARGIN = LABEL_WIDTH;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * A Sankey ribbon isn't a thick stroked line — it's a filled, tapered
 * shape: a bezier curve along its top edge out to the target, a straight
 * edge down to the ribbon's width there, and a bezier curve back along the
 * bottom edge to the source. Stroking a single centerline (the more common
 * quick approach) draws a uniform-width band with flat, blunt ends instead
 * of that tapered fill — it's the difference between a smooth flowing band
 * and a thick painted line.
 */
function ribbonPath(link: {
  source: { x1: number };
  target: { x0: number };
  y0: number;
  y1: number;
  width: number;
}): string {
  const x0 = link.source.x1;
  const x1 = link.target.x0;
  const xc0 = lerp(x0, x1, 0.5);
  const xc1 = lerp(x1, x0, 0.5);
  const half = link.width / 2;
  const topY0 = link.y0 - half;
  const topY1 = link.y1 - half;
  const botY0 = link.y0 + half;
  const botY1 = link.y1 + half;
  return `M${x0},${topY0} C${xc0},${topY0} ${xc1},${topY1} ${x1},${topY1} L${x1},${botY1} C${xc1},${botY1} ${xc0},${botY0} ${x0},${botY0} Z`;
}

/** Jobs that haven't moved past a stage yet aren't a real `Stage` value —
 * they're still *at* whatever stage their parent node already represents,
 * so labeling their node with that same stage name would just print the
 * same word twice in a row. "In Progress" is a chart-only marker for that
 * "no outcome yet" leaf; it never flows into `Stage`-typed data anywhere
 * else (form selects, filters, `recordStageChange`, ...). */
type FlowStage = Stage | "in_progress";

interface FlowNode {
  id: string;
  stage: FlowStage;
  /** The real stage a node's color comes from. For a real-stage node this
   * is just its own `stage` — but "In Progress" is a display-only label,
   * not a real stage (see `FlowStage`), so it still needs to borrow the
   * color of whatever stage its jobs are actually still sitting at, rather
   * than getting an arbitrary neutral color of its own. */
  colorStage: Stage;
  label: string;
  count: number;
  depth: number;
}

function colorFor(node: FlowNode): string {
  return STAGE_COLORS[node.colorStage];
}

interface FlowLink {
  source: string;
  target: string;
  value: number;
}

/** A stage is a dead end for this chart once nothing can come after it on
 * the ladder — "rejected" (the last rung) and "no_answer" (never on the
 * ladder at all, see `STAGE_ORDER`). Everything else can still branch
 * further, so the flow keeps walking forward through it. */
function isTerminal(stage: Stage): boolean {
  const index = STAGE_ORDER.indexOf(stage);
  return index === -1 || index === STAGE_ORDER.length - 1;
}

/**
 * Turns each job's `stagePath` (its actual, already-pruned stage-history
 * sequence — see `recordStageChange` in server/actions/jobs.ts) into a
 * Sankey graph, rooted at "applied" since every job starts there: at every
 * non-terminal stage, jobs that moved on split off into a branch per stage
 * they moved *to*, and jobs that haven't moved any further collapse into an
 * "In Progress" leaf for that stage. Recursing only into the "moved on"
 * branches (and never past a terminal stage) is what gives branches like
 * "Rejected"/"No Answer" no further columns while "Interviewing"/"Offer"
 * keep splitting — driven entirely by what actually happened, not a fixed
 * chart shape.
 */
function buildFlow(jobs: JobWithTags[]): { nodes: FlowNode[]; links: FlowLink[] } {
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];
  let nextId = 0;

  function addNode(stage: FlowStage, colorStage: Stage, label: string, count: number, depth: number): string {
    const id = `n${nextId++}`;
    nodes.push({ id, stage, colorStage, label, count, depth });
    return id;
  }

  function visit(cohort: JobWithTags[], pathIndex: number, atStage: Stage, parentId: string, depth: number) {
    const advanced = new Map<Stage, JobWithTags[]>();
    const stayed: JobWithTags[] = [];
    for (const job of cohort) {
      const next = job.stagePath[pathIndex + 1];
      if (next) {
        const group = advanced.get(next) ?? [];
        group.push(job);
        advanced.set(next, group);
      } else {
        stayed.push(job);
      }
    }

    for (const [nextStage, group] of advanced) {
      const id = addNode(nextStage, nextStage, STAGE_LABELS[nextStage], group.length, depth);
      links.push({ source: parentId, target: id, value: group.length });
      if (!isTerminal(nextStage)) visit(group, pathIndex + 1, nextStage, id, depth + 1);
    }
    if (stayed.length > 0) {
      const id = addNode("in_progress", atStage, "In Progress", stayed.length, depth);
      links.push({ source: parentId, target: id, value: stayed.length });
    }
  }

  // Every job starts at "applied" — that's the trunk every ribbon in the
  // chart flows out of, not a synthetic placeholder, so it's a real node
  // like any other stage rather than text shown above the chart.
  const rootId = addNode("applied", "applied", STAGE_LABELS.applied, jobs.length, 0);
  if (jobs.length > 0) visit(jobs, 0, "applied", rootId, 1);

  return { nodes, links };
}

function computeRate(jobs: JobWithTags[], predicate: (job: JobWithTags) => boolean) {
  const total = jobs.length;
  const num = jobs.filter(predicate).length;
  const pct = total ? Math.round((num / total) * 100) : 0;
  return { pct, pctLabel: `${pct}%`, fraction: `${num} of ${total}` };
}

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function RateCard({
  label,
  rate,
  color,
}: {
  label: string;
  rate: ReturnType<typeof computeRate>;
  color: string;
}) {
  const offset = RING_CIRCUMFERENCE * (1 - rate.pct / 100);
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] border p-5">
      <div>
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{rate.fraction} applications</div>
      </div>
      <div className="relative flex size-16 shrink-0 items-center justify-center">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
          <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="var(--muted)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute text-[13px] font-semibold">{rate.pctLabel}</span>
      </div>
    </div>
  );
}

function PipelineFlow({ jobs }: { jobs: JobWithTags[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-muted-foreground">No applications yet.</p>;
  }

  const { nodes, links } = buildFlow(jobs);
  const columns = Math.max(...nodes.map((n) => n.depth)) + 1;
  const perColumn = new Map<number, number>();
  for (const n of nodes) perColumn.set(n.depth, (perColumn.get(n.depth) ?? 0) + 1);
  const maxPerColumn = Math.max(1, ...perColumn.values());

  const width = LEFT_MARGIN + columns * COLUMN_WIDTH;
  const height = Math.max(maxPerColumn * ROW_HEIGHT, 120) + LABEL_HEIGHT;

  const layout = sankey<FlowNode, FlowLink>()
    .nodeId((d) => d.id)
    .nodeAlign(sankeyLeft)
    .nodeWidth(NODE_THICKNESS)
    .nodePadding(ROW_HEIGHT - NODE_THICKNESS)
    // Reserve half a label's height above/below the plotted nodes so an
    // edge node's centered label box never clips the top/bottom of the SVG,
    // plus the root's own label width on the left (see `LEFT_MARGIN`).
    .extent([
      [LEFT_MARGIN + 1, LABEL_HEIGHT / 2],
      [width - LABEL_WIDTH, height - LABEL_HEIGHT / 2],
    ]);

  const graph = layout({
    nodes: nodes.map((n) => ({ ...n })),
    links: links.map((l) => ({ ...l })),
  });

  return (
    // A responsive SVG (viewBox + w-full) scales every part of the chart —
    // ribbons, strokes, text — together, so it always fills the card
    // edge-to-edge with no scrollbar. What was making it look thin and
    // small before wasn't responsiveness itself, it was the underlying
    // ROW_HEIGHT/COLUMN_WIDTH/font sizes being too small relative to the
    // chart's own proportions — fixed by sizing those up instead of
    // opting out of responsive scaling.
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {graph.links.map((link, i) => {
          const target = link.target as unknown as FlowNode;
          return (
            <path
              key={i}
              d={ribbonPath(link as unknown as Parameters<typeof ribbonPath>[0])}
              fill={colorFor(target)}
              fillOpacity={0.35}
              stroke="none"
            />
          );
        })}
        {graph.nodes.map((node) => {
          const n = node as FlowNode & { x0: number; x1: number; y0: number; y1: number };
          const cy = (n.y0 + n.y1) / 2;
          // The root sits at the chart's left edge with nothing to its left
          // but margin, so its label goes there instead of overlapping the
          // ribbons fanning out to its right — every other node keeps its
          // label on its own outer (right) side.
          const isRoot = n.depth === 0;
          const textX = isRoot ? n.x0 - LABEL_GAP : n.x1 + LABEL_GAP;
          return (
            <g key={n.id}>
              <rect
                x={n.x0}
                y={n.y0}
                width={n.x1 - n.x0}
                height={Math.max(n.y1 - n.y0, 1)}
                rx={NODE_THICKNESS / 2}
                fill="var(--foreground)"
              />
              <text
                x={textX}
                y={cy - 8}
                textAnchor={isRoot ? "end" : "start"}
                fontSize={isRoot ? 17 : 15}
                fontWeight={700}
                fill="var(--foreground)"
              >
                {n.count}
              </text>
              <text
                x={textX}
                y={cy + 10}
                textAnchor={isRoot ? "end" : "start"}
                fontSize={isRoot ? 11.5 : 11}
                fill={isRoot ? "var(--foreground)" : "var(--muted-foreground)"}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function PipelineStats({ jobs }: { jobs: JobWithTags[] }) {
  // "Ever reached", not "currently at" — a job later moved to "Rejected"
  // still counts here if it got that far first.
  const interviewRate = computeRate(
    jobs,
    (j) => j.reachedStages.includes("interviewing") || j.reachedStages.includes("offer"),
  );
  const offerRate = computeRate(jobs, (j) => j.reachedStages.includes("offer"));

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="min-w-0 rounded-[10px] border p-5 pb-4">
        <h3 className="mb-3.5 text-[15px] font-bold">Pipeline</h3>
        <PipelineFlow jobs={jobs} />
      </div>
      <div className="flex flex-col gap-4">
        <RateCard label="Interview Rate" rate={interviewRate} color={STAGE_COLORS.interviewing} />
        <RateCard label="Offer Rate" rate={offerRate} color={STAGE_COLORS.offer} />
      </div>
    </div>
  );
}
