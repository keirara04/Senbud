"""Copy rendered sprites into web/public/play as horizontal frame strips.

Run after build_sprites.py + render.py. A 2-frame idle becomes a 2w x h strip
that the game animates with CSS steps(2).
"""

from pathlib import Path

from PIL import Image

ART = Path(__file__).parent
OUT = ART.parent / "web" / "public" / "play"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for d in sorted((ART / "output").iterdir()):
        frames = sorted(d.glob("frame*.png"))
        imgs = [Image.open(f).convert("RGBA") for f in frames]
        w, h = imgs[0].size
        strip = Image.new("RGBA", (w * len(imgs), h), (0, 0, 0, 0))
        for i, img in enumerate(imgs):
            strip.paste(img, (i * w, 0))
        name = d.name.replace("_", "-")
        strip.save(OUT / f"{name}.png", optimize=True)
        print(f"{name}.png  {strip.size}  {len(imgs)} frame(s)")


if __name__ == "__main__":
    main()
