// Draws the end-of-run share card (1200x630) on a canvas and shares or downloads it.

import { CLASSES, ENDINGS } from "@/lib/game/data";
import type { State } from "@/lib/game/engine";
import { hoursLabel, shareText } from "@/lib/game/narrate";

const HERO_IMG: Record<State["cls"], string> = {
  scholar: "/play/hero-scholar.png",
  freelancer: "/play/hero-freelancer.png",
  homeCook: "/play/hero-home-cook.png",
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawCard(s: State): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;

  g.fillStyle = "#1f3fd8";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(255,255,255,0.08)";
  g.beginPath();
  g.arc(140, 120, 320, 0, Math.PI * 2);
  g.fill();

  // Hero sprite, first idle frame, scaled ×10 with crisp pixels.
  const hero = await loadImage(HERO_IMG[s.cls]);
  g.imageSmoothingEnabled = false;
  g.drawImage(hero, 0, 0, 32, 32, 80, 155, 320, 320);

  const e = ENDINGS[s.ending!];
  g.fillStyle = "#eeff5a";
  g.font = `700 30px ${font}`;
  g.fillText("THE BUDGET DUNGEON", 460, 150);
  g.fillStyle = "#ffffff";
  g.font = `750 76px ${font}`;
  g.fillText(e.title, 460, 245);
  g.fillStyle = "#c9d2ff";
  g.font = `400 30px ${font}`;
  g.fillText(e.line, 460, 295, 680);

  g.fillStyle = "#ffffff";
  g.font = `600 34px ${font}`;
  const stats = [
    `${CLASSES[s.cls].name}`,
    `$${Math.max(0, s.gold)} left · ${s.treats} treat${s.treats === 1 ? "" : "s"}`,
    `Spent $${s.spent} = ${hoursLabel(s.spent)} of work`,
  ];
  stats.forEach((line, i) => g.fillText(line, 460, 370 + i * 50));

  g.fillStyle = "#eeff5a";
  g.font = `700 32px ${font}`;
  g.fillText(`Can you survive the week? ${location.host}/play`, 80, 570);

  return new Promise((resolve) => c.toBlob((b) => resolve(b!), "image/png"));
}

/** Share the card through the OS sheet where files are supported, otherwise download it. */
export async function shareCard(s: State): Promise<"shared" | "downloaded"> {
  const blob = await drawCard(s);
  const file = new File([blob], "budget-dungeon.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: shareText(s), url: `${location.origin}/play` });
      return "shared";
    } catch {
      // Cancelled or blocked: fall through to download.
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return "downloaded";
}
