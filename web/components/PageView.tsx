"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

// One page view per path for the Senbud admin page (api EventController): the path and the referring
// site only. No id, no cookie, nothing stored in the browser.
export function PageView() {
  const path = usePathname();
  useEffect(() => {
    if (!API) return;
    let ref = "";
    try {
      ref = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {}
    const props = { path: path.slice(0, 100), ...(ref && ref !== location.hostname ? { ref: ref.slice(0, 100) } : {}) };
    fetch(`${API}/v1/events`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ platform: "site", events: [{ id: crypto.randomUUID(), name: "page_view", at: new Date().toISOString(), props }] }),
    }).catch(() => {});
  }, [path]);
  return null;
}
