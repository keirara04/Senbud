import type { MetadataRoute } from "next";
import { ALTERNATIVES } from "@/lib/alternatives";

export const dynamic = "force-static";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, priority: 1 },
    { url: `${SITE}/alternatives`, priority: 0.7 },
    ...ALTERNATIVES.map((a) => ({ url: `${SITE}/alternatives/${a.slug}`, priority: 0.6 })),
    { url: `${SITE}/play`, priority: 0.5 },
    { url: `${SITE}/privacy`, priority: 0.3 },
    { url: `${SITE}/terms`, priority: 0.3 },
  ];
}
