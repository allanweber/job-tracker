---
target: src/app/(app)/board/page.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-09-16T11-40-34Z
slug: src-app-app-board-page-tsx
---
Method: dual-agent (A: isolated design-review sub-agent · B: isolated detector/browser-evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Silent background router.refresh() on window focus can reorder the board with no indicator |
| 2 | Match System / Real World | 3/4 | Real vocabulary throughout, but company-vs-position hierarchy inconsistent across views |
| 3 | User Control and Freedom | 2/4 | Confirm-before-delete exists, but no undo, no bulk operations |
| 4 | Consistency and Standards | 1/4 | JobCard leads with company name; JobListRow leads with position name — same data, contradictory hierarchy |
| 5 | Error Prevention | 3/4 | Delete confirmation, per-row import error detail |
| 6 | Recognition Rather Than Recall | 3/4 | Cards surface triage fields without opening detail |
| 7 | Flexibility and Efficiency | 1/4 | No keyboard shortcuts, no bulk select/move, no saved filters |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean grayscale system, docked for cluttered toolbar and hardcoded stage colors |
| 9 | Error Recovery | 3/4 | Clear toast copy, automatic rollback on failed drag/import |
| 10 | Help and Documentation | 0/4 | Zero onboarding, no drag hint, no shortcuts, no help entry point |
| **Total** | | **22/40** | **Acceptable** (55%) |

## Design Specificity Verdict

Mixed, leaning generic. Content model is job-search-specific (stage vocabulary, follow-up urgency), but interaction/visual language is close to an off-the-shelf dnd-kit Trello clone. Swap labels for "Backlog/In Progress/Done" and it's indistinguishable from a generic task board.

Deterministic scan: clean, zero findings across all 11 board-related files.

Visual overlays: not available — Chrome extension not connected; route also requires OAuth.

## Overall Impression

Strong engineering underneath (collision detection, optimistic drag/rollback) but a hard accessibility gap (drag is the only way to change stage, pointer-only) and a mobile layout that will visibly break, plus a consistency bug between the two views' information hierarchy.

## What's Working

1. Optimistic drag with automatic rollback (kanban-board.tsx:130-141).
2. Custom collision-detection strategy (kanban-board.tsx:24-46) fixing a known dnd-kit bug for short/empty columns.
3. Progressive disclosure on JobCard — skills capped at 4, FollowUpBadge only in a 3-day window.

## Priority Issues

**[P0] No responsive layout for the kanban board on mobile**
- Why it matters: kanban-board.tsx:152 renders grid grid-cols-5 gap-3 unconditionally, no breakpoint, no scroll wrapper. Breaks at ~390px.
- Fix: Horizontal scroll-snap columns with fixed min-width, or default to List view below a breakpoint.
- Suggested command: /impeccable adapt

**[P0] Stage changes are pointer-only — no keyboard path**
- Why it matters: kanban-board.tsx:74 only registers PointerSensor. Cards are tab stops (job-card.tsx:38-39) that do nothing on Enter/Space. job-review-form.tsx:154-158 confirms dragging is the only way to change stage outside the edit page.
- Fix: Add a KeyboardSensor and/or a "Move to…" affordance on the card.
- Suggested command: /impeccable harden

**[P1] Contradictory information hierarchy between the two views**
- Why it matters: JobCard leads with companyName (job-card.tsx:51-59); JobListRow leads with positionName (job-list-view.tsx:50-53). Same data, different headline field.
- Fix: Standardize on one lead field across both views.
- Suggested command: /impeccable layout

**[P1] Toolbar overload with no grouping**
- Why it matters: board-client.tsx:120-171 packs Search, Template, Import, Export, and view toggle into one undifferentiated row.
- Fix: Move Import/Export/Template into an overflow menu; leave Search + view toggle primary.
- Suggested command: /impeccable layout

**[P2] Stage colors bypass the design-token system**
- Why it matters: STAGE_COLORS (lib/constants.ts:16-22) hardcodes raw hex via inline style, ignoring the OKLCH chart tokens and dark mode; saturated red on Rejected cuts against the achromatic-except-CTA system.
- Fix: Derive stage colors from the theme's chart token scale.
- Suggested command: /impeccable colorize

**[P3] Misleading empty-state copy**
- Why it matters: job-list-view.tsx:19 shows "No jobs match." identically for zero-jobs-ever vs filtered-to-nothing.
- Fix: Branch copy on whether query is non-empty.
- Suggested command: /impeccable clarify

## Persona Red Flags

**Alex (Power User)**: No bulk select/move/delete anywhere. No keyboard shortcuts. Search only matches title/company/location text — no stage/tag/date filter or saved views.

**Sam (Accessibility-Dependent)**: Core action (changing stage) is entirely unreachable via keyboard/screen reader — PointerSensor only, cards are dead tab stops. Only accessible route is the per-job edit page, with no on-board hint it exists.

**Riley (Stress Tester)**: Mobile breakage is instantly discoverable. JobCard title/company has no truncate/line-clamp (job-card.tsx:51-59), inflating card height inconsistently vs job-list-view.tsx. boardOrder midpoint math is fractional indexing that degrades under heavy reordering.

## Minor Observations

- DeleteJobButton's "X" sits near the same corner used to initiate a drag.
- Columns/List toggle is hand-rolled with raw buttons rather than the shared Button component.
- Background refresh on window focus could in principle fire mid-drag.

## Questions to Consider

1. Should the board lead with an Offer Rate ring (often a discouraging low number) or with effort/momentum instead?
2. Is drag-and-drop the right primary mechanic, or would a keyboard-first, bulk-select triage list fit better?
3. Should "No Answer" and "Rejected" columns collapse/archive by default to keep primary space for what's actionable?
