import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas Clinic Appointments",
    short_name: "Atlas",
    description: "A focused appointment and reminder workspace for private clinics.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f7f6",
    theme_color: "#1f5a43",
    orientation: "any",
    icons: [
      {
        src: "/atlas-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
