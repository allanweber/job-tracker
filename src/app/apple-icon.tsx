import { ImageResponse } from "next/og";

// Same mark as `icon.tsx`, scaled up for iOS home-screen bookmarks (iOS
// applies its own rounded-square mask, so no border radius here).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111113",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div style={{ width: 26, height: 64, background: "#fafafa", borderRadius: 8 }} />
          <div style={{ width: 26, height: 108, background: "#fafafa", borderRadius: 8 }} />
          <div style={{ width: 26, height: 86, background: "#fafafa", borderRadius: 8 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
