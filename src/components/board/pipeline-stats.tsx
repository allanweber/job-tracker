"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { sankey, sankeyLeft } from "d3-sankey";
import { STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, type Stage } from "@/lib/constants";
import type { JobWithTags } from "@/server/db/queries/jobs";

/** Transition used for every animated geometry change in the chart (ribbon
 * shape, node height, label position) so a drag-and-drop stage change (or
 * any other data update) morphs smoothly instead of snapping. A plain eased
 * tween, not a spring: a spring's overshoot looks natural for something
 * physically bouncing into place, but here it's numerically reinterpolating
 * bezier control points, so overshoot briefly renders an invalid-looking
 * pinched/overextended ribbon instead of a bounce — a flat ease-out settles
 * without ever overshooting. */
const FLOW_TRANSITION = { type: "tween", ease: "easeOut", duration: 0.4 } as const;

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
/** How far each ribbon's bezier control points sit from their own end,
 * as a fraction of the horizontal gap between nodes. 0 draws a straight
 * diagonal line; 0.5 is the standard symmetric S-curve; pushing it higher
 * holds the ribbon flatter near each node before it swoops through the
 * middle, reading as a more pronounced curve. */
const CURVATURE = 0.65;
/** Decorative sag applied to a ribbon's control points, in px, so a link
 * between two nodes at the *same* row height still reads as a curve
 * instead of a flat rectangle — a bezier has nothing to bend through when
 * y0 equals y1, regardless of CURVATURE. Fades out as the link's own real
 * vertical drop grows, since a link that already travels between rows
 * gets plenty of curve from CURVATURE alone and doesn't need help. */
const BOW_AMOUNT = 18;
const BOW_FADE_DISTANCE = ROW_HEIGHT;

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
  const xc0 = lerp(x0, x1, CURVATURE);
  const xc1 = lerp(x1, x0, CURVATURE);
  const half = link.width / 2;

  const bow = BOW_AMOUNT * Math.max(0, 1 - Math.abs(link.y1 - link.y0) / BOW_FADE_DISTANCE);
  const controlY0 = link.y0 + bow;
  const controlY1 = link.y1 + bow;

  const topY0 = link.y0 - half;
  const topY1 = link.y1 - half;
  const botY0 = link.y0 + half;
  const botY1 = link.y1 + half;
  const topC0 = controlY0 - half;
  const topC1 = controlY1 - half;
  const botC0 = controlY0 + half;
  const botC1 = controlY1 + half;
  return `M${x0},${topY0} C${xc0},${topC0} ${xc1},${topC1} ${x1},${topY1} L${x1},${botY1} C${xc1},${botC1} ${xc0},${botC0} ${x0},${botY0} Z`;
}

interface FlowNode {
  id: string;
  stage: Stage;
  label: string;
  /** The jobs that reached this node — its count is `jobs.length`, and
   * hovering/clicking the node or its incoming ribbon lists these by name
   * in the tooltip. Since the flow is a tree, a node's incoming ribbon
   * carries exactly this same cohort, so links don't need their own copy. */
  jobs: JobWithTags[];
  depth: number;
}

function colorFor(node: FlowNode): string {
  return STAGE_COLORS[node.stage];
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
 * they moved *to*. Jobs that haven't moved any further stay folded into
 * whichever node they last reached — that node's own incoming link count
 * already includes them, so there's nothing further to draw for them.
 * Recursing only into stages jobs actually moved to (and never past a
 * terminal stage) is what gives branches like "Rejected"/"No Answer" no
 * further columns while "Interviewing"/"Offer" keep splitting — driven
 * entirely by what actually happened, not a fixed chart shape.
 *
 * A node's id is its full root-to-node stage path (e.g.
 * "applied>interviewing>offer"), not a render-order index — that's what
 * lets the chart animate: the same real-world branch keeps the same id
 * across renders (React/motion match it to the same element and tween its
 * geometry) even as *other* branches gain or lose jobs and shuffle the
 * traversal order.
 */
function buildFlow(jobs: JobWithTags[]): { nodes: FlowNode[]; links: FlowLink[] } {
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];

  function visit(cohort: JobWithTags[], pathIndex: number, parentId: string, depth: number) {
    const advanced = new Map<Stage, JobWithTags[]>();
    for (const job of cohort) {
      const next = job.stagePath[pathIndex + 1];
      if (next) {
        const group = advanced.get(next) ?? [];
        group.push(job);
        advanced.set(next, group);
      }
    }

    for (const [nextStage, group] of advanced) {
      const id = `${parentId}>${nextStage}`;
      nodes.push({ id, stage: nextStage, label: STAGE_LABELS[nextStage], jobs: group, depth });
      links.push({ source: parentId, target: id, value: group.length });
      if (!isTerminal(nextStage)) visit(group, pathIndex + 1, id, depth + 1);
    }
  }

  // Every job starts at "applied" — that's the trunk every ribbon in the
  // chart flows out of, not a synthetic placeholder, so it's a real node
  // like any other stage rather than text shown above the chart.
  const rootId = "applied";
  nodes.push({ id: rootId, stage: "applied", label: STAGE_LABELS.applied, jobs, depth: 0 });
  if (jobs.length > 0) visit(jobs, 0, rootId, 1);

  return { nodes, links };
}

/** The jobs behind one ribbon/node in the chart, identified by its root-to-
 * node id (e.g. "applied>interviewing>offer") — since that id already
 * encodes the exact stage path, the returned cohort is every job that
 * passed through that whole path, from the root up to (and including) the
 * clicked segment. Used to filter the board to a clicked ribbon's jobs. */
export function jobsOnPath(jobs: JobWithTags[], pathId: string): JobWithTags[] {
  return buildFlow(jobs).nodes.find((n) => n.id === pathId)?.jobs ?? [];
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
    <div className="flex flex-1 flex-col items-center gap-3 rounded-[10px] border p-5">
      <div className="w-full text-center">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{rate.fraction} applications</div>
      </div>
      {/* `flex-1` grows this to whatever vertical room the card has beyond
       * its label. The svg is `absolute inset-0` rather than `h-full
       * w-full` — an in-flow child sized by a height *percentage* has no
       * resolvable size while this wrapper's own height is still being
       * measured (flex-basis 0 + grow), so the browser falls back to a
       * default replaced-element size (~300px) during that measurement
       * pass, ballooning this card (and, via grid stretch, the whole row)
       * to match. Taking it out of flow means it can't feed back into
       * that measurement at all — it just fills whatever box the wrapper
       * ends up with once real layout runs, via its default
       * `preserveAspectRatio`, without distortion or overflow. */}
      <div className="relative min-h-0 w-full flex-1">
        <svg viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90">
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
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
          {rate.pctLabel}
        </span>
      </div>
    </div>
  );
}

/** What the tooltip needs to render, plus `x`/`y` in the chart's own
 * viewBox units — converted to a percentage of `width`/`height` at render
 * time so it lines up with the SVG regardless of how large the responsive
 * chart is actually drawn on screen. */
interface TooltipData {
  id: string;
  x: number;
  y: number;
  label: string;
  jobs: JobWithTags[];
}

const MAX_TOOLTIP_JOBS = 6;
const TOOLTIP_WIDTH_PX = 192;
// A rough ceiling on the card's own rendered height (header line + up to
// `MAX_TOOLTIP_JOBS` list rows) — used only to keep the whole card inside
// the chart vertically, so a slight overestimate here just means a touch
// more clearance than strictly needed, never an overflow.
const TOOLTIP_MAX_HEIGHT_PX = 170;

function jobDisplayName(job: JobWithTags): string {
  return job.companyName || job.positionName || "Untitled";
}

function FlowTooltip({ tooltip, width, height }: { tooltip: TooltipData; width: number; height: number }) {
  const shown = tooltip.jobs.slice(0, MAX_TOOLTIP_JOBS);
  const remaining = tooltip.jobs.length - shown.length;
  const leftPct = (tooltip.x / width) * 100;
  const topPct = (tooltip.y / height) * 100;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none absolute z-10 rounded-lg border bg-popover p-2.5 text-popover-foreground shadow-lg"
      style={{
        width: TOOLTIP_WIDTH_PX,
        // `clamp` (not the earlier flip-to-the-other-side trick) is what
        // actually keeps this inside the card: it mixes the anchor's own
        // percentage position with a fixed-pixel margin from each edge, so
        // the tooltip's fixed pixel width can never push it past either
        // side regardless of how wide the responsive chart is rendered —
        // including the rightmost columns, which only have ~140px of
        // margin reserved past them for their own label.
        left: `clamp(8px, ${leftPct}%, calc(100% - ${TOOLTIP_WIDTH_PX + 8}px))`,
        top: `clamp(8px, ${topPct}%, calc(100% - ${TOOLTIP_MAX_HEIGHT_PX}px))`,
      }}
    >
      <div className="text-[13px] font-semibold">
        {tooltip.label} · {tooltip.jobs.length}
      </div>
      {shown.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
          {shown.map((job) => (
            <li key={job.id} className="truncate">
              {jobDisplayName(job)}
            </li>
          ))}
          {remaining > 0 && <li>+{remaining} more</li>}
        </ul>
      )}
    </motion.div>
  );
}

function PipelineFlow({
  jobs,
  selectedPathId,
  onSelectPath,
}: {
  jobs: JobWithTags[];
  selectedPathId: string | null;
  onSelectPath: (id: string | null) => void;
}) {
  // Hovering shows a tooltip transiently; clicking pins it so it survives
  // the pointer moving off the (thin) ribbon/node to actually read it,
  // especially on touch where there's no hover at all. Clicking the same
  // target again (or the chart background) unpins it.
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [pinned, setPinned] = useState(false);

  function showTooltip(data: TooltipData) {
    if (!pinned) setTooltip(data);
  }
  function hideTooltip() {
    if (!pinned) setTooltip(null);
  }
  function toggleTooltip(data: TooltipData) {
    if (pinned && tooltip?.id === data.id) {
      setPinned(false);
      setTooltip(null);
    } else {
      setTooltip(data);
      setPinned(true);
    }
  }
  function clearPinned() {
    setPinned(false);
    setTooltip(null);
  }

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
    <div
      className="relative"
      onClick={() => {
        if (pinned) clearPinned();
        if (selectedPathId) onSelectPath(null);
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {graph.links.map((link) => {
          const target = link.target as unknown as FlowNode;
          const linkArgs = link as unknown as Parameters<typeof ribbonPath>[0];
          const isSelected = target.id === selectedPathId;
          return (
            <motion.path
              key={target.id}
              // Framer Motion can tween an SVG `d` attribute when the path
              // keeps the same command structure across renders (only the
              // numbers change) — true here since `ribbonPath` always
              // emits the same M/C/L/C/Z shape, just re-parameterized. That
              // makes a stage-count change morph the ribbon's taper and
              // curve smoothly instead of it snapping to the new shape.
              // `initial` mirrors `animate` so the very first paint (SSR
              // included) already shows the right shape — Motion only
              // reads `initial` on mount, so a later re-render with a
              // different `animate` target still tweens normally.
              initial={{ d: ribbonPath(linkArgs) }}
              animate={{ d: ribbonPath(linkArgs) }}
              transition={FLOW_TRANSITION}
              fill={colorFor(target)}
              fillOpacity={
                selectedPathId
                  ? isSelected
                    ? 0.6
                    : 0.12
                  : pinned && tooltip?.id !== target.id
                    ? 0.15
                    : 0.35
              }
              stroke="none"
              className="cursor-pointer transition-[fill-opacity]"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPath(isSelected ? null : target.id);
              }}
            />
          );
        })}
        {graph.nodes.map((node) => {
          const n = node as FlowNode & { x0: number; x1: number; y0: number; y1: number };
          const cy = (n.y0 + n.y1) / 2;
          const nodeHeight = Math.max(n.y1 - n.y0, 1);
          // The root sits at the chart's left edge with nothing to its left
          // but margin, so its label goes there instead of overlapping the
          // ribbons fanning out to its right — every other node keeps its
          // label on its own outer (right) side.
          const isRoot = n.depth === 0;
          const textX = isRoot ? n.x0 - LABEL_GAP : n.x1 + LABEL_GAP;
          const tooltipData: TooltipData = {
            id: n.id,
            x: isRoot ? n.x0 : n.x1,
            y: cy,
            label: n.label,
            jobs: n.jobs,
          };
          return (
            <motion.g
              key={n.id}
              initial={{ x: n.x0, y: n.y0 }}
              animate={{ x: n.x0, y: n.y0 }}
              transition={FLOW_TRANSITION}
              className="cursor-pointer"
              onMouseEnter={() => showTooltip(tooltipData)}
              onMouseLeave={hideTooltip}
              onClick={(e) => {
                e.stopPropagation();
                toggleTooltip(tooltipData);
              }}
            >
              <motion.rect
                x={0}
                y={0}
                width={n.x1 - n.x0}
                initial={{ height: nodeHeight }}
                animate={{ height: nodeHeight }}
                transition={FLOW_TRANSITION}
                rx={NODE_THICKNESS / 2}
                fill="var(--foreground)"
                opacity={pinned && tooltip?.id !== n.id ? 0.4 : 1}
              />
              <motion.text
                x={textX - n.x0}
                initial={{ y: cy - 8 - n.y0 }}
                animate={{ y: cy - 8 - n.y0 }}
                transition={FLOW_TRANSITION}
                textAnchor={isRoot ? "end" : "start"}
                fontSize={isRoot ? 17 : 15}
                fontWeight={700}
                fill="var(--foreground)"
              >
                {n.jobs.length}
              </motion.text>
              <motion.text
                x={textX - n.x0}
                initial={{ y: cy + 10 - n.y0 }}
                animate={{ y: cy + 10 - n.y0 }}
                transition={FLOW_TRANSITION}
                textAnchor={isRoot ? "end" : "start"}
                fontSize={isRoot ? 11.5 : 11}
                fill={isRoot ? "var(--foreground)" : "var(--muted-foreground)"}
              >
                {n.label}
              </motion.text>
            </motion.g>
          );
        })}
      </svg>
      <AnimatePresence>
        {tooltip && <FlowTooltip key={tooltip.id} tooltip={tooltip} width={width} height={height} />}
      </AnimatePresence>
    </div>
  );
}

export function PipelineStats({
  jobs,
  selectedPathId,
  onSelectPath,
}: {
  jobs: JobWithTags[];
  selectedPathId: string | null;
  onSelectPath: (id: string | null) => void;
}) {
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
        <PipelineFlow jobs={jobs} selectedPathId={selectedPathId} onSelectPath={onSelectPath} />
      </div>
      <div className="flex flex-col gap-4">
        <RateCard label="Interview Rate" rate={interviewRate} color={STAGE_COLORS.interviewing} />
        <RateCard label="Offer Rate" rate={offerRate} color={STAGE_COLORS.offer} />
      </div>
    </div>
  );
}
