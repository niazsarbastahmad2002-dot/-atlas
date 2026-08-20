import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas Appointments",
    short_name: "Atlas",
    description: "A focused appointment and reminder workspace for private clinics.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#eef4f1",
    theme_color: "#071f19",
    orientation: "any",
    icons: [
      {
        src: "/atlas-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
