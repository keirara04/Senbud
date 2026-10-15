"""Compose rendered sprites into one labelled preview sheet at integer scale."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).parent / "output"
SCALE = 4
PAD = 16
BG = (34, 28, 46, 255)

ROWS = [
    ["hero_scholar", "hero_freelancer", "hero_home_cook"],
    ["monster_impulse_goblin", "monster_subscription_slime", "monster_craving_wraith",
     "monster_grab_golem", "monster_boredom_imp", "monster_textbook_troll", "monster_late_fee_lich"],
    ["boss_rent_dragon", "item_coin", "item_treat_potion", "item_spell_scroll", "item_d20"],
    ["bg_dungeon"],
]


def frame(name):
    d = ROOT / name
    first = d / "frame.png" if (d / "frame.png").exists() else sorted(d.glob("frame_*.png"))[0]
    img = Image.open(first).convert("RGBA")
    return img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)


def main():
    rows = [[(n, frame(n)) for n in row] for row in ROWS]
    label_h = 14
    width = max(sum(i.width + PAD for _, i in r) + PAD for r in rows)
    height = sum(max(i.height for _, i in r) + label_h + PAD for r in rows) + PAD
    sheet = Image.new("RGBA", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    y = PAD
    for r in rows:
        x = PAD
        row_h = max(i.height for _, i in r)
        for name, img in r:
            sheet.alpha_composite(img, (x, y + row_h - img.height))
            draw.text((x, y + row_h + 2), name.split("_", 1)[1].replace("_", " "), fill=(220, 214, 240, 255))
            x += img.width + PAD
        y += row_h + label_h + PAD
    out = Path(__file__).parent / "contact_sheet.png"
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
