import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

// Full-bleed square: iOS rounds the corners itself. Same artwork as app/icon.svg.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
<rect width="48" height="48" fill="#1F3FD8"/>
<rect x="8" y="26" width="32" height="10" rx="3" fill="#EEFF5A" transform="rotate(-10 24 31)"/>
<path d="M31.5 15c-2.5-3-12.5-3.5-13 2.5 -.5 6 13.5 4.5 13 11.5 -.5 6.5-11.5 7-15 2.5" fill="none" stroke="#1A1C2E" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M31.5 15c-2.5-3-12.5-3.5-13 2.5 -.5 6 13.5 4.5 13 11.5 -.5 6.5-11.5 7-15 2.5" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    <img width={180} height={180} alt="" src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} />,
    size,
  );
}
