import { ImageResponse } from "next/og";

export const alt = "Senbud: the money buddy that does the boring part";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

// Link preview card: headline on panel, with a receipt strip on the right.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#1f3fd8", color: "#f4f6ff", padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#eeff5a" }}>Senbud</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}>
            <span>Your money buddy</span>
            <span>that does the</span>
            <span style={{ color: "#eeff5a" }}>boring part.</span>
          </div>
          <div style={{ fontSize: 28, color: "#c9d2ff" }}>No bank password. No typing marathons.</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 330,
            marginLeft: 48,
            background: "#ffffff",
            color: "#2b2733",
            padding: 32,
            fontSize: 26,
            transform: "rotate(2deg)",
            fontFamily: "monospace",
          }}
        >
          {[
            ["Lunch", "$12"],
            ["Uber", "$8"],
            ["Bubble tea", "$6"],
          ].map(([l, a]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
              <span>{l}</span>
              <span>{a}</span>
            </div>
          ))}
          <div style={{ display: "flex", borderTop: "2px dashed #c9c6cf", marginTop: 16, paddingTop: 18, justifyContent: "space-between", fontWeight: 700 }}>
            <span>Safe today</span>
            <span>$7</span>
          </div>
          <div style={{ display: "flex", marginTop: 28, background: "#eeff5a", color: "#1f3fd8", padding: "14px 18px", borderRadius: 14, fontSize: 24 }}>
            Rent in 6 days: covered
          </div>
        </div>
      </div>
    ),
    size,
  );
}
