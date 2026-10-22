import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// The preview card shown when a link to the site is shared.
export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: "-0.04em" }}>{SITE_NAME}</div>
        <div style={{ marginTop: 28, fontSize: 36, lineHeight: 1.35, color: "#a3a3a3", maxWidth: 960 }}>{SITE_DESCRIPTION}</div>
      </div>
    ),
    size
  );
}
