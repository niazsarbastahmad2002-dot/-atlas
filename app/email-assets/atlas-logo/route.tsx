import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "512px",
          height: "512px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="atlasA" x1="126" y1="76" x2="398" y2="438" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9fffe3" />
              <stop offset="0.35" stopColor="#35d6a5" />
              <stop offset="1" stopColor="#087054" />
            </linearGradient>
            <linearGradient id="atlasADeep" x1="321" y1="94" x2="400" y2="431" gradientUnits="userSpaceOnUse">
              <stop stopColor="#176f59" />
              <stop offset="1" stopColor="#043f34" />
            </linearGradient>
            <linearGradient id="atlasOrbit" x1="82" y1="320" x2="443" y2="239" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0b7c5e" />
              <stop offset="0.55" stopColor="#43dfae" />
              <stop offset="1" stopColor="#a8ffe6" />
            </linearGradient>
          </defs>
          <path d="M54 432 224 72c9-19 36-19 45 0l41 88-50 91-24-54-108 235H54Z" fill="url(#atlasA)" />
          <path d="m270 72 188 360h-94L225 162l45-90Z" fill="url(#atlasADeep)" />
          <path d="M182 335h174l-43-84-46 84h-85Z" fill="#062d26" opacity="0.94" />
          <path d="M74 320c84-68 209-91 365-67" fill="none" stroke="url(#atlasOrbit)" strokeWidth="27" strokeLinecap="round" />
          <path d="M96 324c93-44 205-57 330-42" fill="none" stroke="#d9fff4" strokeOpacity="0.24" strokeWidth="4" strokeLinecap="round" />
          <circle cx="437" cy="254" r="17" fill="#a8ffe6" />
          <circle cx="437" cy="254" r="6" fill="#ffffff" />
          <path d="m247 78 22 48-24 44-22-47 24-45Z" fill="#eafff8" opacity="0.72" />
        </svg>
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Content-Disposition": "inline; filename=atlas-logo.png",
      },
    },
  );
}
