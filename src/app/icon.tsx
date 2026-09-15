import { ImageResponse } from "next/og";

// Next.js picks this up automatically as the app's favicon/tab icon (see
// app-icons.md) — no manual <link> needed.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * A simple kanban-columns mark — three bars of rising height, echoing the
 * board's Applied → Interview → Offer pipeline this app is built around.
 * Parameterized by pixel size (proportional, not just cropped/scaled) so
 * `scripts/generate-favicon.mjs` can render the same design natively at
 * several resolutions for `favicon.ico` instead of it drifting from what
 * this route actually serves.
 */
export function buildKanbanIconElement(px: number) {
  const scale = px / 32;
  const barWidth = Math.max(1, Math.round(5 * scale));
  const gap = Math.max(1, Math.round(3 * scale));
  const radius = Math.max(0.5, 1.5 * scale);
  const containerRadius = Math.max(2, Math.round(7 * scale));
  const heights = [12, 20, 16].map((h) => Math.round(h * scale));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111113",
        borderRadius: containerRadius,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap }}>
        {heights.map((h, i) => (
          <div
            key={i}
            style={{ width: barWidth, height: h, background: "#fafafa", borderRadius: radius }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(buildKanbanIconElement(size.width), { ...size });
}
